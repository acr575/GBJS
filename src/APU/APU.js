import { CH1 } from "./CH1.js";
import { CH2 } from "./CH2.js";
import { CH3 } from "./CH3.js";
import { CH4 } from "./CH4.js";

// Falling edge of bit 12 of the 16-bit DIV counter: 512 Hz (4194304 / 8192).
const SEQUENCER_BIT = 1 << 12;

// IO reads and writes land on the last M-cycle. Advance the generators up to
// this many T-cycles before applying the access, then the rest of the
// instruction afterwards, so the total stays equal to the instruction length.
const ACCESS_LEAD = 8;

// NR10–NR52. A read is the stored value ORed with this; unused and write-only
// bits therefore come back as 1.
const READ_OR = [
  0x80, 0x3f, 0x00, 0xff, 0xbf, // NR10–NR14
  0xff, 0x3f, 0x00, 0xff, 0xbf, // NR20–NR24
  0x7f, 0xff, 0x9f, 0xff, 0xbf, // NR30–NR34
  0xff, 0xff, 0x00, 0x00, 0xbf, // NR40–NR44
  0x00, 0x00, 0x70, // NR50–NR52
];

const RING = 16384;
const RING_MASK = RING - 1;

/**
 * DMG APU. The frame sequencer steps on the falling edge of DIV bit 4 (bit 12
 * of the timer's 16-bit counter), including the edge caused by writing DIV.
 * Length, envelope and sweep run on that sequencer. Samples are taken from the
 * same T-cycle clock and queued to Web Audio; the callback plays them faster
 * when the queue grows, so a speed change follows the emulation and the
 * latency stays bounded.
 */
export class APU {
  #regs = new Uint8Array(0x16);
  #wave = new Uint8Array(16);
  #powered = false;
  #frameStep = 7;
  #skipSequencer = false;
  #inInstruction = false;
  #caught = 0;
  #debt = 0;
  #muted = [false, false, false, false];
  #silent = true;
  #sampleAcc = 0;
  #clocksPerSample = 4194304 / 48000;
  #hpfFactor = 0.996;
  #cap = [0, 0];
  #ringL = null;
  #ringR = null;
  #ringRead = 0;
  #ringWrite = 0;
  #ringCount = 0;
  #readFrac = 0;
  #processor = null;
  #ch1;
  #ch2;
  #ch3;
  #ch4;

  constructor(cpu) {
    this.cpu = cpu;
    this.audioCtx = new AudioContext();
    this.maxVolume = 0.1;
    this.masterVolume = this.maxVolume;

    this.#ch1 = new CH1(this);
    this.#ch2 = new CH2(this);
    this.#ch3 = new CH3(this, this.#wave);
    this.#ch4 = new CH4(this);
    this.#installOutput();
  }

  reg(addr) {
    return this.#regs[addr - 0xff10];
  }

  setReg(addr, value) {
    this.#regs[addr - 0xff10] = value & 0xff;
  }

  /** Called at the start of each instruction, before any IO access it performs. */
  beginInstruction() {
    this.#inInstruction = true;
    this.#caught = 0;
  }

  /**
   * Advance generators and the frame sequencer by the instruction's T-cycles.
   * The timer has already moved; the sequencer watches that counter.
   * @param {number} cycles
   */
  updateAudio(cycles) {
    const caught = this.#caught;
    this.#caught = 0;
    this.#inInstruction = false;

    if (caught > cycles) this.#debt += caught - cycles;
    else this.#advance(cycles - caught);

    this.#syncSequencer(cycles);
  }

  /**
   * Writing DIV clears the counter. If bit 12 was set, that is a falling edge
   * and the frame sequencer steps, the same way TIMA does.
   * @param {number} previous
   */
  onDivReset(previous) {
    if ((previous & SEQUENCER_BIT) !== 0) this.#onSequencerClock();
  }

  readByte(addr) {
    this.#catchUp();
    if (addr >= 0xff30 && addr <= 0xff3f) return this.#readWave(addr);
    if (addr >= 0xff27 && addr <= 0xff2f) return 0xff;
    if (addr === 0xff26) return this.#readNr52();
    const index = addr - 0xff10;
    return this.#regs[index] | READ_OR[index];
  }

  writeByte(addr, value) {
    this.#catchUp();
    if (addr >= 0xff30 && addr <= 0xff3f) {
      this.#writeWave(addr, value);
      return;
    }
    if (addr >= 0xff27 && addr <= 0xff2f) return;
    if (addr === 0xff26) {
      this.#writeNr52(value);
      return;
    }
    if (!this.#powered) {
      this.#loadLengthWhileOff(addr, value);
      return;
    }

    const extra = (this.#frameStep & 1) === 0;
    const envelopeNext = ((this.#frameStep + 1) & 7) === 7;
    if (addr <= 0xff14) this.#ch1.write(addr, value, extra, envelopeNext);
    else if (addr <= 0xff19) this.#ch2.write(addr, value, extra, envelopeNext);
    else if (addr <= 0xff1e) this.#ch3.write(addr, value, extra, envelopeNext);
    else if (addr <= 0xff23) this.#ch4.write(addr, value, extra, envelopeNext);
    else this.setReg(addr, value);
  }

  mute(...channels) {
    if (channels.length === 0) {
      this.#clearQueue();
      this.audioCtx?.suspend?.();
      return;
    }
    for (const id of channels) {
      if (id >= 1 && id <= 4) this.#muted[id - 1] = true;
    }
  }

  unmute(...channels) {
    if (channels.length === 0) {
      this.#clearQueue();
      this.audioCtx?.resume?.();
      return;
    }
    for (const id of channels) {
      if (id >= 1 && id <= 4) this.#muted[id - 1] = false;
    }
  }

  #loadLengthWhileOff(addr, value) {
    if (addr === 0xff11) this.#ch1.loadLength(value);
    else if (addr === 0xff16) this.#ch2.loadLength(value);
    else if (addr === 0xff1b) this.#ch3.loadLength(value);
    else if (addr === 0xff20) this.#ch4.loadLength(value);
  }

  #writeNr52(value) {
    const on = (value & 0x80) !== 0;
    if (this.#powered && !on) this.#powerOff();
    else if (!this.#powered && on) this.#powerOn();
    this.#powered = on;
  }

  #powerOff() {
    this.#regs.fill(0);
    this.#ch1.enabled = false;
    this.#ch2.enabled = false;
    this.#ch3.enabled = false;
    this.#ch4.enabled = false;
  }

  #powerOn() {
    this.#frameStep = 7;
    this.#ch1.resetOnPower();
    this.#ch2.resetOnPower();
    this.#ch3.resetOnPower();
    this.#ch4.resetOnPower();
    const counter = this.cpu.timer.systemCounter;
    this.#skipSequencer = (counter & SEQUENCER_BIT) !== 0;
  }

  #readNr52() {
    return (
      (this.#powered ? 0x80 : 0) |
      0x70 |
      (this.#ch4.enabled ? 0x08 : 0) |
      (this.#ch3.enabled ? 0x04 : 0) |
      (this.#ch2.enabled ? 0x02 : 0) |
      (this.#ch1.enabled ? 0x01 : 0)
    );
  }

  #readWave(addr) {
    const index = this.#ch3.accessibleByte();
    if (index === null) {
      if (this.#ch3.enabled) return 0xff;
      return this.#wave[addr & 0x0f];
    }
    return this.#wave[index];
  }

  #writeWave(addr, value) {
    const index = this.#ch3.accessibleByte();
    if (index === null) {
      if (this.#ch3.enabled) return;
      this.#wave[addr & 0x0f] = value;
      return;
    }
    this.#wave[index] = value;
  }

  #catchUp() {
    if (!this.#inInstruction || this.#caught >= ACCESS_LEAD) return;
    const add = ACCESS_LEAD - this.#caught;
    this.#caught = ACCESS_LEAD;
    this.#advance(add);
  }

  #advance(cycles) {
    let left = cycles;
    if (this.#debt > 0) {
      const pay = Math.min(this.#debt, left);
      this.#debt -= pay;
      left -= pay;
    }
    if (left <= 0) return;

    if (this.#powered) {
      this.#ch1.tick(left);
      this.#ch2.tick(left);
      this.#ch3.tick(left);
      this.#ch4.tick(left);
    }
    if (this.#silent) return;

    this.#sampleAcc += left;
    while (this.#sampleAcc >= this.#clocksPerSample) {
      this.#sampleAcc -= this.#clocksPerSample;
      this.#emit();
    }
  }

  #syncSequencer(cycles) {
    const current = this.cpu.timer.systemCounter;
    const previous = (current - cycles) & 0xffff;
    if ((previous & SEQUENCER_BIT) !== 0 && (current & SEQUENCER_BIT) === 0)
      this.#onSequencerClock();
  }

  #onSequencerClock() {
    if (this.#skipSequencer) {
      this.#skipSequencer = false;
      return;
    }
    this.#frameStep = (this.#frameStep + 1) & 7;
    if (!this.#powered) return;

    const step = this.#frameStep;
    if ((step & 1) === 0) {
      this.#ch1.clockLength();
      this.#ch2.clockLength();
      this.#ch3.clockLength();
      this.#ch4.clockLength();
    }
    if (step === 7) {
      if (this.#ch1.enabled) this.#ch1.clockEnvelope();
      if (this.#ch2.enabled) this.#ch2.clockEnvelope();
      if (this.#ch4.enabled) this.#ch4.clockEnvelope();
    }
    if ((step === 2 || step === 6) && this.#ch1.enabled) this.#ch1.clockSweep();
  }

  #installOutput() {
    const ctx = this.audioCtx;
    if (!ctx || typeof ctx.createScriptProcessor !== "function") return;
    try {
      this.#connectOutput(ctx);
    } catch {
      this.#silent = true;
    }
  }

  #connectOutput(ctx) {

    const rate = ctx.sampleRate || 48000;
    this.#clocksPerSample = 4194304 / rate;
    // 0.999958^(cpu/rate) is the DMG high-pass at this output rate.
    this.#hpfFactor = Math.pow(0.999958, 4194304 / rate);
    this.#ringL = new Float32Array(RING);
    this.#ringR = new Float32Array(RING);
    this.#silent = false;

    const quantum = 2048;
    this.#processor = ctx.createScriptProcessor(quantum, 0, 2);
    this.#processor.onaudioprocess = (event) => this.#drain(event);
    this.#processor.connect(ctx.destination);
  }

  #emit() {
    const nr50 = this.reg(0xff24);
    const nr51 = this.reg(0xff25);
    const leftGain = (((nr50 >> 4) & 7) + 1) / 8;
    const rightGain = ((nr50 & 7) + 1) / 8;
    const channels = [this.#ch1, this.#ch2, this.#ch3, this.#ch4];
    let left = 0;
    let right = 0;
    let dacs = false;
    for (let i = 0; i < 4; i++) {
      const dac = channels[i].dacOn();
      if (dac) dacs = true;
      if (this.#muted[i]) continue;
      // Digital 0 maps to analog +1 and 15 to -1. A disabled DAC sits at 0.
      const analog = dac ? (7.5 - channels[i].digital()) / 7.5 : 0;
      if ((nr51 & (0x10 << i)) !== 0) left += analog;
      if ((nr51 & (1 << i)) !== 0) right += analog;
    }
    const gain = this.masterVolume;
    this.#push(
      this.#highPass(left * leftGain, 0, dacs) * gain,
      this.#highPass(right * rightGain, 1, dacs) * gain
    );
  }

  #highPass(input, side, dacsOn) {
    if (!dacsOn) return 0;
    const out = input - this.#cap[side];
    this.#cap[side] = input - out * this.#hpfFactor;
    return out;
  }

  #push(left, right) {
    // Keep about four callbacks queued. Past that, drop the oldest so a fast
    // emulation (or a stalled audio callback) cannot grow the delay.
    const cap = 8192;
    if (this.#ringCount >= cap) {
      const drop = this.#ringCount - cap + 1;
      this.#ringRead = (this.#ringRead + drop) & RING_MASK;
      this.#ringCount -= drop;
      this.#readFrac = 0;
    }
    this.#ringL[this.#ringWrite] = left;
    this.#ringR[this.#ringWrite] = right;
    this.#ringWrite = (this.#ringWrite + 1) & RING_MASK;
    this.#ringCount++;
  }

  #drain(event) {
    const left = event.outputBuffer.getChannelData(0);
    const right = event.outputBuffer.getChannelData(1);
    const count = left.length;
    const target = count * 2;
    // At 1× the queue sits near `target` and the step stays 1. Above that the
    // step rises, so pitch and tempo follow the emulation instead of lagging.
    let step = 1;
    if (this.#ringCount > target) step = Math.min(4, this.#ringCount / target);

    for (let i = 0; i < count; i++) {
      if (this.#ringCount < 1) {
        left[i] = 0;
        right[i] = 0;
        this.#readFrac = 0;
        continue;
      }
      const index = this.#ringRead;
      const next = (index + 1) & RING_MASK;
      const frac = this.#readFrac;
      const l0 = this.#ringL[index];
      const r0 = this.#ringR[index];
      const l1 = this.#ringCount > 1 ? this.#ringL[next] : l0;
      const r1 = this.#ringCount > 1 ? this.#ringR[next] : r0;
      left[i] = l0 + (l1 - l0) * frac;
      right[i] = r0 + (r1 - r0) * frac;

      this.#readFrac += step;
      while (this.#readFrac >= 1 && this.#ringCount > 0) {
        this.#readFrac -= 1;
        this.#ringRead = (this.#ringRead + 1) & RING_MASK;
        this.#ringCount--;
      }
    }
  }

  #clearQueue() {
    this.#ringRead = 0;
    this.#ringWrite = 0;
    this.#ringCount = 0;
    this.#readFrac = 0;
    this.#sampleAcc = 0;
  }
}

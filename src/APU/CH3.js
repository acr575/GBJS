// First sample is this many T-cycles later than the period latched at trigger.
const TRIGGER_DELAY = 6;
// After the timer reloads, the CPU sees the latched byte for this many T-cycles.
const CPU_WINDOW = 1;
// A retrigger corrupts wave RAM two T-cycles after that reload, using the next byte.
const CORRUPT_AT = 2;

/**
 * Programmable wave. The sample position advances by one nibble each period.
 * Trigger does not refill the sample buffer and skips nibble 0, so the first
 * read is the low nibble of byte 0. On DMG the CPU only sees the byte just
 * latched, and only for a couple of T-cycles after the timer reloads; any
 * other access reads 0xFF and writes are ignored. A retrigger two T-cycles
 * after the reload corrupts the first bytes of wave RAM with the next byte.
 */
export class CH3 {
  constructor(apu, wave) {
    this.apu = apu;
    this.wave = wave;
    this.maxLength = 256;
    this.enabled = false;
    this.length = 0;
    this.timer = 4096;
    this.position = 0;
    this.sample = 0;
    this.byteIndex = 0;
    this.since = CPU_WINDOW + 1;
  }

  dacOn() {
    return (this.apu.reg(0xff1a) & 0x80) !== 0;
  }

  frequency() {
    return ((this.apu.reg(0xff1e) & 7) << 8) | this.apu.reg(0xff1d);
  }

  period() {
    return (2048 - this.frequency()) * 2;
  }

  loadLength(value) {
    const stored = value & 0xff;
    this.apu.setReg(0xff1b, stored);
    this.length = this.maxLength - stored;
  }

  resetOnPower() {
    this.enabled = false;
    this.sample = 0;
    this.position = 0;
    this.byteIndex = 0;
    this.since = CPU_WINDOW + 1;
    this.timer = 4096;
  }

  write(addr, value, extraLength) {
    if (addr === 0xff1a) {
      this.apu.setReg(addr, value);
      if (!this.dacOn()) this.enabled = false;
      return;
    }
    if (addr === 0xff1b) {
      this.loadLength(value);
      return;
    }
    if (addr === 0xff1c || addr === 0xff1d) {
      this.apu.setReg(addr, value);
      return;
    }
    if (addr === 0xff1e) this.#writeControl(value, extraLength);
  }

  #writeControl(value, extraLength) {
    const wasEnabled = (this.apu.reg(0xff1e) & 0x40) !== 0;
    this.apu.setReg(0xff1e, value);
    const nowEnabled = (value & 0x40) !== 0;

    if (extraLength && !wasEnabled && nowEnabled && this.length > 0) {
      this.length--;
      if (this.length === 0) this.enabled = false;
    }

    if ((value & 0x80) === 0) return;

    if (this.enabled && this.since === CORRUPT_AT) this.#corrupt();

    const wasZero = this.length === 0;
    this.enabled = true;
    if (wasZero) this.length = this.maxLength;
    this.timer = this.period() + TRIGGER_DELAY;
    this.position = 0;
    this.since = CPU_WINDOW + 1;
    if (extraLength && nowEnabled && wasZero && this.length > 0) this.length--;
    if (!this.dacOn()) this.enabled = false;
  }

  #corrupt() {
    const index = ((this.position + 1) >> 1) & 0x0f;
    if (index < 4) {
      this.wave[0] = this.wave[index];
      return;
    }
    const base = index & ~3;
    this.wave[0] = this.wave[base];
    this.wave[1] = this.wave[base + 1];
    this.wave[2] = this.wave[base + 2];
    this.wave[3] = this.wave[base + 3];
  }

  clockLength() {
    if ((this.apu.reg(0xff1e) & 0x40) === 0 || this.length === 0) return;
    this.length--;
    if (this.length === 0) this.enabled = false;
  }

  tick(cycles) {
    if (!this.enabled) return;

    this.timer -= cycles;
    if (this.timer > 0) {
      this.since += cycles;
      return;
    }

    let guard = 0;
    while (this.timer <= 0 && guard++ < 64) {
      this.#readSample();
      const period = this.period();
      this.timer += period > 0 ? period : 2;
      this.since = (period > 0 ? period : 2) - this.timer;
    }
  }

  #readSample() {
    this.position = (this.position + 1) & 31;
    this.byteIndex = this.position >> 1;
    const raw = this.wave[this.byteIndex];
    this.sample = (this.position & 1) === 0 ? raw >> 4 : raw & 0x0f;
  }

  /** Byte the channel just latched, or null when a CPU access must see 0xFF. */
  accessibleByte() {
    if (!this.enabled || this.since > CPU_WINDOW) return null;
    return this.byteIndex & 0x0f;
  }

  digital() {
    if (!this.enabled) return 0;
    const code = (this.apu.reg(0xff1c) >> 5) & 3;
    const shift = [4, 0, 1, 2][code];
    return this.sample >> shift;
  }
}

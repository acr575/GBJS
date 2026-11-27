import { CH2 } from "./CH2.js";

/**
 * Pulse channel with period sweep. The shadow frequency is the one the sweep
 * unit iterates on; writes to NR13/NR14 do not touch it, so the next iteration
 * overwrites them. Negate-to-positive after a subtraction disables the channel.
 */
export class CH1 extends CH2 {
  constructor(apu) {
    super(apu, 0xff10);
    this.shadow = 0;
    this.sweepTimer = 8;
    this.sweepEnabled = false;
    this.negateUsed = false;
  }

  resetOnPower() {
    super.resetOnPower();
    this.sweepEnabled = false;
    this.negateUsed = false;
    this.sweepTimer = 8;
  }

  write(addr, value, extraLength, envelopeNext) {
    if (addr === 0xff10) {
      this.#writeSweep(value);
      return;
    }
    super.write(addr, value, extraLength, envelopeNext);
  }

  #writeSweep(value) {
    const previous = this.apu.reg(0xff10);
    const wasNegate = (previous & 0x08) !== 0;
    const nowNegate = (value & 0x08) !== 0;
    if (wasNegate && !nowNegate && this.negateUsed) this.enabled = false;
    // Pace is sampled again when the countdown expires. Writing 0 suppresses the
    // next calculation; it does not restart the countdown.
    this.apu.setReg(0xff10, value);
  }

  onTrigger() {
    this.shadow = this.frequency();
    this.negateUsed = false;
    const nr10 = this.apu.reg(0xff10);
    const pace = (nr10 >> 4) & 7;
    const shift = nr10 & 7;
    this.sweepTimer = pace === 0 ? 8 : pace;
    this.sweepEnabled = pace !== 0 || shift !== 0;
    if (shift !== 0 && this.#calculate() > 0x7ff) this.enabled = false;
  }

  clockSweep() {
    if (this.sweepTimer > 0) this.sweepTimer--;
    if (this.sweepTimer > 0) return;

    const nr10 = this.apu.reg(0xff10);
    const pace = (nr10 >> 4) & 7;
    const shift = nr10 & 7;
    this.sweepTimer = pace === 0 ? 8 : pace;
    if (!this.sweepEnabled || pace === 0) return;

    const next = this.#calculate();
    if (next > 0x7ff) {
      this.enabled = false;
      return;
    }
    if (shift === 0) return;

    this.shadow = next;
    this.#writeFrequency(next);
    if (this.#calculate() > 0x7ff) this.enabled = false;
  }

  #calculate() {
    const nr10 = this.apu.reg(0xff10);
    const shift = nr10 & 7;
    const delta = this.shadow >> shift;
    if ((nr10 & 0x08) !== 0) {
      this.negateUsed = true;
      return this.shadow - delta;
    }
    return this.shadow + delta;
  }

  #writeFrequency(frequency) {
    this.apu.setReg(0xff13, frequency & 0xff);
    const high = this.apu.reg(0xff14);
    this.apu.setReg(0xff14, (high & 0xf8) | ((frequency >> 8) & 7));
  }
}

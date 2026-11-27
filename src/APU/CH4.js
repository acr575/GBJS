/**
 * Noise channel. The LFSR is 15 bits, or 7 bits when NR43 bit 3 is set.
 * A clock shift of 14 or 15 stops the LFSR. The channel emits the volume when
 * the bit shifted out is 1.
 */
export class CH4 {
  constructor(apu) {
    this.apu = apu;
    this.maxLength = 64;
    this.enabled = false;
    this.length = 0;
    this.volume = 0;
    this.envTimer = 8;
    this.envRunning = false;
    this.timer = 8;
    this.lfsr = 0x7fff;
    this.high = false;
  }

  dacOn() {
    return (this.apu.reg(0xff21) & 0xf8) !== 0;
  }

  /** T-cycles per LFSR clock. 0 means the shift is 14 or 15 and the LFSR is stopped. */
  period() {
    const nr43 = this.apu.reg(0xff22);
    const shift = nr43 >> 4;
    if (shift >= 14) return 0;
    const code = nr43 & 7;
    const divisor = code === 0 ? 8 : code * 16;
    return divisor << shift;
  }

  loadLength(value) {
    const stored = value & 0x3f;
    this.apu.setReg(0xff20, stored);
    this.length = this.maxLength - stored;
  }

  resetOnPower() {
    this.enabled = false;
    this.volume = 0;
    this.envRunning = false;
    this.high = false;
  }

  write(addr, value, extraLength, envelopeNext) {
    if (addr === 0xff20) {
      this.loadLength(value);
      return;
    }
    if (addr === 0xff21) {
      this.apu.setReg(addr, value);
      if (!this.dacOn()) this.enabled = false;
      return;
    }
    if (addr === 0xff22) {
      this.apu.setReg(addr, value);
      return;
    }
    if (addr === 0xff23) this.#writeControl(value, extraLength, envelopeNext);
  }

  #writeControl(value, extraLength, envelopeNext) {
    const wasEnabled = (this.apu.reg(0xff23) & 0x40) !== 0;
    this.apu.setReg(0xff23, value);
    const nowEnabled = (value & 0x40) !== 0;

    if (extraLength && !wasEnabled && nowEnabled && this.length > 0) {
      this.length--;
      if (this.length === 0) this.enabled = false;
    }

    if ((value & 0x80) === 0) return;

    const wasZero = this.length === 0;
    this.enabled = true;
    if (wasZero) this.length = this.maxLength;
    this.lfsr = 0x7fff;
    this.high = false;
    const period = this.period();
    this.timer = period > 0 ? period : 0;
    this.#reloadEnvelope(envelopeNext);
    if (extraLength && nowEnabled && wasZero && this.length > 0) this.length--;
    if (!this.dacOn()) this.enabled = false;
  }

  #reloadEnvelope(envelopeNext) {
    const nr42 = this.apu.reg(0xff21);
    const pace = nr42 & 7;
    this.envTimer = (pace === 0 ? 8 : pace) + (envelopeNext ? 1 : 0);
    this.volume = nr42 >> 4;
    this.envRunning = true;
  }

  clockLength() {
    if ((this.apu.reg(0xff23) & 0x40) === 0 || this.length === 0) return;
    this.length--;
    if (this.length === 0) this.enabled = false;
  }

  clockEnvelope() {
    if (this.envTimer > 0) this.envTimer--;
    if (this.envTimer > 0) return;

    const nr42 = this.apu.reg(0xff21);
    const pace = nr42 & 7;
    this.envTimer = pace === 0 ? 8 : pace;
    if (pace === 0 || !this.envRunning) return;

    if ((nr42 & 0x08) !== 0) {
      if (this.volume < 15) this.volume++;
      else this.envRunning = false;
    } else if (this.volume > 0) this.volume--;
    else this.envRunning = false;
  }

  tick(cycles) {
    const period = this.period();
    if (period === 0) return;

    this.timer -= cycles;
    let guard = 0;
    while (this.timer <= 0 && guard++ < 64) {
      this.#clockLfsr();
      const next = this.period();
      if (next === 0) {
        this.timer = 0;
        return;
      }
      this.timer += next;
    }
  }

  #clockLfsr() {
    const shiftedOut = this.lfsr & 1;
    const feedback = (this.lfsr ^ (this.lfsr >> 1)) & 1;
    this.lfsr = (this.lfsr >> 1) | (feedback << 14);
    if ((this.apu.reg(0xff22) & 0x08) !== 0)
      this.lfsr = (this.lfsr & ~(1 << 6)) | (feedback << 6);
    this.lfsr &= 0x7fff;
    this.high = shiftedOut === 1;
  }

  digital() {
    if (!this.enabled || !this.high) return 0;
    return this.volume;
  }
}

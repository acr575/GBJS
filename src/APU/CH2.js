const DUTY = [0b00000001, 0b10000001, 0b10000111, 0b01111110];

/**
 * Pulse channel without sweep (CH2). CH1 extends this and adds the sweep unit.
 * Length counts down at 256 Hz; the envelope at 64 Hz. The duty sequencer is a
 * free-running 8-step counter. Trigger reloads its period but keeps the low
 * two bits, which is what the DMG does.
 */
export class CH2 {
  constructor(apu, base = 0xff15) {
    this.apu = apu;
    this.base = base;
    this.maxLength = 64;
    this.enabled = false;
    this.length = 0;
    this.volume = 0;
    this.envTimer = 8;
    this.envRunning = false;
    this.dutyStep = 0;
    this.timer = 2048;
  }

  get nrx1() {
    return this.base + 1;
  }

  get nrx2() {
    return this.base + 2;
  }

  get nrx3() {
    return this.base + 3;
  }

  get nrx4() {
    return this.base + 4;
  }

  dacOn() {
    return (this.apu.reg(this.nrx2) & 0xf8) !== 0;
  }

  frequency() {
    return ((this.apu.reg(this.nrx4) & 7) << 8) | this.apu.reg(this.nrx3);
  }

  period() {
    return (2048 - this.frequency()) * 4;
  }

  /** DMG allows NRx1 writes while the APU is off. Only the length bits stick. */
  loadLength(value) {
    const stored = value & 0x3f;
    this.apu.setReg(this.nrx1, stored);
    this.length = this.maxLength - stored;
  }

  resetOnPower() {
    this.enabled = false;
    this.dutyStep = 0;
    this.timer = 2048;
    this.volume = 0;
    this.envRunning = false;
  }

  /**
   * @param {number} addr
   * @param {number} value
   * @param {boolean} extraLength true when enabling length should clock immediately
   * @param {boolean} envelopeNext true when the next sequencer step clocks the envelope
   */
  write(addr, value, extraLength, envelopeNext) {
    if (addr === this.nrx1) {
      this.apu.setReg(addr, value);
      this.length = this.maxLength - (value & 0x3f);
      return;
    }
    if (addr === this.nrx2) {
      this.apu.setReg(addr, value);
      if (!this.dacOn()) this.enabled = false;
      return;
    }
    if (addr === this.nrx3) {
      this.apu.setReg(addr, value);
      return;
    }
    if (addr === this.nrx4) this.#writeControl(value, extraLength, envelopeNext);
  }

  #writeControl(value, extraLength, envelopeNext) {
    const wasEnabled = (this.apu.reg(this.nrx4) & 0x40) !== 0;
    this.apu.setReg(this.nrx4, value);
    const nowEnabled = (value & 0x40) !== 0;

    if (extraLength && !wasEnabled && nowEnabled && this.length > 0) {
      this.length--;
      if (this.length === 0) this.enabled = false;
    }

    if ((value & 0x80) === 0) return;

    const wasZero = this.length === 0;
    this.enabled = true;
    if (wasZero) this.length = this.maxLength;
    this.#reloadTimer();
    this.#reloadEnvelope(envelopeNext);
    this.onTrigger();
    if (extraLength && nowEnabled && wasZero && this.length > 0) this.length--;
    if (!this.dacOn()) this.enabled = false;
  }

  /** CH1 hooks the sweep reload here. */
  onTrigger() {}

  #reloadTimer() {
    const period = this.period();
    this.timer = (period & ~3) | (this.timer & 3);
  }

  #reloadEnvelope(envelopeNext) {
    const nr2 = this.apu.reg(this.nrx2);
    const pace = nr2 & 7;
    this.envTimer = (pace === 0 ? 8 : pace) + (envelopeNext ? 1 : 0);
    this.volume = nr2 >> 4;
    this.envRunning = true;
  }

  clockLength() {
    if ((this.apu.reg(this.nrx4) & 0x40) === 0 || this.length === 0) return;
    this.length--;
    if (this.length === 0) this.enabled = false;
  }

  clockEnvelope() {
    if (this.envTimer > 0) this.envTimer--;
    if (this.envTimer > 0) return;

    const nr2 = this.apu.reg(this.nrx2);
    const pace = nr2 & 7;
    this.envTimer = pace === 0 ? 8 : pace;
    if (pace === 0 || !this.envRunning) return;

    if ((nr2 & 0x08) !== 0) {
      if (this.volume < 15) this.volume++;
      else this.envRunning = false;
    } else if (this.volume > 0) this.volume--;
    else this.envRunning = false;
  }

  tick(cycles) {
    this.timer -= cycles;
    let guard = 0;
    while (this.timer <= 0 && guard++ < 32) {
      this.dutyStep = (this.dutyStep + 1) & 7;
      const period = this.period();
      this.timer += period > 0 ? period : 4;
    }
  }

  /** Digital 0..15. A disabled channel contributes 0; the DAC still biases it. */
  digital() {
    if (!this.enabled) return 0;
    const duty = (this.apu.reg(this.nrx1) >> 6) & 3;
    const high = (DUTY[duty] >> this.dutyStep) & 1;
    return high ? this.volume : 0;
  }
}

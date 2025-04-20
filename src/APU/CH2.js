import { testBit } from "../GameBoyUtils.js";

export class CH2 {
  constructor(apu) {
    this.apu = apu;

    this.nr21 = 0xff16;
    this.nr22 = 0xff17;
    this.nr23 = 0xff18;
    this.nr24 = 0xff19;

    this.lengthTimerCycles = 16384; // Remaining cycles to tick up length timer (16384 cycles, 256 Hz)
    this.lengthTimer = 0; // Increments when lengthTimerCycles reaches 0
    this.envelopeTimerCycles = 65536; // Remaining cycles to tick up envelop timer (65536 cycles, 64 Hz)
    this.envelopeTimer = 0; // Increments when envelopeTimerCycles reaches 0
    this.periodTimerCycles = 4; // Remaining cycles to tick up periodTimer (4 cycles, 1048576 Hz)
    this.periodTimer = 0; // Increments when periodTimerCylces reaches 0
  }

  getInitialLengthTimer() {
    return this.apu.cpu.mmu.readByte(this.nr21) & 0b111111; // Bits 0-5
  }

  getWaveDuty() {
    const duty = (this.apu.cpu.mmu.readByte(this.nr21) >> 6) & 0b11; // Bits 6-7

    switch (duty) {
      case 0b00:
        return 0.125;

      case 0b01:
        return 0.25;

      case 0b10:
        return 0.5;

      case 0b11:
        return 0.75;
    }
  }

  getInitialVolume() {
    return (this.apu.cpu.mmu.readByte(this.nr22) >> 4) / 15; // Bits 4-7
  }

  getEnvelopeDir() {
    return testBit(this.apu.cpu.mmu.readByte(this.nr22), 3); // Bit 3
  }

  getSweepPace() {
    return this.apu.cpu.mmu.readByte(this.nr22) & 0b111; // Bits 0-2
  }

  getPeriod() {
    const periodHigh = this.apu.cpu.mmu.readByte(this.nr24) & 0b111; // Bits 0-2
    const periodLow = this.apu.cpu.mmu.readByte(this.nr23);

    return (periodHigh << 8) | periodLow;
  }

  getPeriodFreq() {
    const period = this.getPeriod();

    return 131072 / (2048 - period);
  }

  isLengthEnabled() {
    return testBit(this.apu.cpu.mmu.readByte(this.nr24), 6);
  }

  isDACOn() {
    return (this.apu.cpu.mmu.readByte(this.nr22) & 0b11111000) != 0;
  }

  trigger() {
    if (!this.isDACOn()) return; // DAC off

    this.resetTimers();
    this.stop();

    this.playSquareWave(this.getPeriodFreq(), this.getInitialVolume());
  }

  resetTimers() {
    this.lengthTimer = this.getInitialLengthTimer();
    this.lengthTimerCycles = 16384;
    this.periodTimer = this.getPeriod();
    this.periodTimerCycles = 4;
    this.envelopeTimer = 0;
    this.envelopeTimerCycles = 65536;
  }

  update(cycles) {
    this.envelopeTimerCycles -= cycles;
    this.periodTimerCycles -= cycles;
    this.lengthTimerCycles -= cycles;

    // Envelope. A 0 Sweep Pace disables the funcionality
    if (this.getSweepPace() != 0 && this.envelopeTimerCycles <= 0) {
      this.envelopeTimerCycles = 65536;
      this.envelopeTimer++;

      // Update volume
      if (this.envelopeTimer >= this.getSweepPace()) {
        const gainStep = 1 / 15;

        if (this.getEnvelopeDir()) {
          this.gainNode.gain.value = Math.min(
            1,
            this.gainNode.gain.value + gainStep
          );
        } else {
          this.gainNode.gain.value = Math.max(
            0,
            this.gainNode.gain.value - gainStep
          );
        }
        this.envelopeTimer = 0;
      }
    }

    // Period
    // if (this.periodTimerCycles <= 0) {
    //   this.periodTimerCycles = 4;
    //   this.periodTimer++;

    //   // Update period
    //   if (this.periodTimer >= 2047) {
    //     this.periodTimer = this.getPeriod();
    //     this.source.playbackRate.value =
    //       (this.getPeriodFreq() * this.source.buffer.length) /
    //       this.apu.audioCtx.sampleRate;
    //   }
    // }

    // Length
    if (this.isLengthEnabled() && this.lengthTimerCycles <= 0) {
      this.lengthTimerCycles = 16384;
      this.lengthTimer++;

      // Shut down channel
      if (this.lengthTimer >= 64) this.stop();
    }
  }

  generateWaveWithDutyCycles(dutyCycle) {
    const samples = 8;
    const buffer = this.apu.audioCtx.createBuffer(
      1,
      samples,
      this.apu.audioCtx.sampleRate
    );

    const data = buffer.getChannelData(0);

    const highSamples = Math.floor(samples * dutyCycle);

    for (let i = 0; i < samples; i++) {
      data[i] = i < highSamples ? 1.0 : -1.0;
    }

    return buffer;
  }

  playSquareWave(frequency, volume) {
    const buffer = this.generateWaveWithDutyCycles(this.getWaveDuty());
    this.source = this.apu.audioCtx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;

    this.source.playbackRate.value =
      (frequency * buffer.length) / this.apu.audioCtx.sampleRate;

    this.gainNode = this.apu.audioCtx.createGain();
    this.gainNode.gain.value = volume;

    this.source.connect(this.gainNode).connect(this.apu.audioCtx.destination);

    this.source.start();
  }

  stop() {
    this.source?.stop();
  }
}

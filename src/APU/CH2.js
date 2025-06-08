import { testBit } from "../GameBoyUtils.js";

export class CH2 {
  #lengthTimerCycles = 16384; // Remaining cycles to tick up length timer (16384 cycles, 256 Hz)
  #lengthTimer = 0; // Increments when lengthTimerCycles reaches 0
  #envelopeTimerCycles = 65536; // Remaining cycles to tick up envelop timer (65536 cycles, 64 Hz)
  #envelopeTimer = 0; // Increments when envelopeTimerCycles reaches 0

  constructor(apu) {
    this.apu = apu;

    this.nr21 = 0xff16;
    this.nr22 = 0xff17;
    this.nr23 = 0xff18;
    this.nr24 = 0xff19;

    this.isTriggered = false;
  }

  #getInitialLengthTimer() {
    return this.apu.cpu.mmu.readByte(this.nr21) & 0b111111; // Bits 0-5
  }

  #getWaveDuty() {
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

  #getInitialVolume() {
    return (this.apu.cpu.mmu.readByte(this.nr22) >> 4) / 15; // Bits 4-7
  }

  #getEnvelopeDir() {
    return testBit(this.apu.cpu.mmu.readByte(this.nr22), 3); // Bit 3
  }

  #getEnvelopePace() {
    return this.apu.cpu.mmu.readByte(this.nr22) & 0b111; // Bits 0-2
  }

  getPeriod() {
    const periodHigh = this.apu.cpu.mmu.readByte(this.nr24) & 0b111; // Bits 0-2
    const periodLow = this.apu.cpu.mmu.readByte(this.nr23);

    return (periodHigh << 8) | periodLow;
  }

  #getPeriodFreq() {
    const period = this.getPeriod();

    return 131072 / (2048 - period);
  }

  #isLengthEnabled() {
    return testBit(this.apu.cpu.mmu.readByte(this.nr24), 6);
  }

  isDACOn() {
    return (this.apu.cpu.mmu.readByte(this.nr22) & 0b11111000) != 0;
  }

  getPanning() {
    return this.apu.getPanning(2);
  }

  trigger() {
    if (!this.isDACOn()) return; // DAC off

    this.resetTimers();
    this.stop();

    this.#playSquareWave(
      this.#getPeriodFreq(),
      this.#getInitialVolume(),
      this.getPanning()
    );
    this.isTriggered = true;
  }

  resetTimers() {
    this.#lengthTimer = this.#getInitialLengthTimer();
    this.#lengthTimerCycles = 16384;
    this.#envelopeTimer = 0;
    this.#envelopeTimerCycles = 65536;
  }

  update(cycles) {
    this.#envelopeTimerCycles -= cycles;
    this.#lengthTimerCycles -= cycles;

    // Envelope. A 0 Sweep Pace disables the funcionality
    if (this.#getEnvelopePace() != 0 && this.#envelopeTimerCycles <= 0) {
      this.#envelopeTimerCycles += 65536;
      this.#envelopeTimer++;

      // Update volume
      if (this.#envelopeTimer >= this.#getEnvelopePace()) {
        const gainStep = (1 / 15) * this.apu.masterVolume;

        if (this.#getEnvelopeDir()) {
          this.globalGain.gain.value = Math.min(
            this.apu.masterVolume,
            this.globalGain.gain.value + gainStep
          );
        } else {
          this.globalGain.gain.value = Math.max(
            0,
            this.globalGain.gain.value - gainStep
          );
        }
        this.#envelopeTimer = 0;
      }
    }

    // Length
    if (this.#isLengthEnabled() && this.#lengthTimerCycles <= 0) {
      this.#lengthTimerCycles += 16384;
      this.#lengthTimer++;

      // Shut down channel
      if (this.#lengthTimer >= 64) this.stop();
    }
  }

  updatePanning() {
    const panning = this.getPanning();
    if (this.left)
      this.leftGain.gain.value = panning.left ? this.apu.getLeftVolume() : 0;
    if (this.rightGain)
      this.rightGain.gain.value = panning.right ? this.apu.getRightVolume() : 0;
  }

  #generateWaveWithDutyCycles(dutyCycle) {
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

  #playSquareWave(frequency, volume, panning) {
    if (!panning.left && !panning.right) return; // No sound

    const buffer = this.#generateWaveWithDutyCycles(this.#getWaveDuty());
    this.source = this.apu.audioCtx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;

    // Frequency
    this.source.playbackRate.value =
      (frequency * buffer.length) / this.apu.audioCtx.sampleRate;

    // Volume
    this.globalGain = this.apu.audioCtx.createGain();
    this.leftGain = this.apu.audioCtx.createGain();
    this.rightGain = this.apu.audioCtx.createGain();
    this.globalGain.gain.value = volume * this.apu.masterVolume;

    this.source.connect(this.globalGain);
    this.globalGain.connect(this.leftGain);
    this.globalGain.connect(this.rightGain);

    // Connect gains to each channel
    const merger = this.apu.audioCtx.createChannelMerger(2);
    this.leftGain.connect(merger, 0, 0);
    this.rightGain.connect(merger, 0, 1);
    merger.connect(this.apu.audioCtx.destination);

    // Panning
    this.leftGain.gain.value = panning.left ? this.apu.getLeftVolume() : 0;
    this.rightGain.gain.value = panning.right ? this.apu.getRightVolume() : 0;

    this.source.start();
  }

  stop() {
    this.source?.stop();
    this.isTriggered = false;
  }
}

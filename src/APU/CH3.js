import { testBit } from "../GameBoyUtils.js";

export class CH3 {
  constructor(apu) {
    this.apu = apu;

    this.nr30 = 0xff1a;
    this.nr31 = 0xff1b;
    this.nr32 = 0xff1c;
    this.nr33 = 0xff1d;
    this.nr34 = 0xff1e;

    this.waveRam = {
      start: 0xff30,
      end: 0xff3f,
    };

    this.lengthTimerCycles = 16384; // Remaining cycles to tick up length timer (16384 cycles, 256 Hz)
    this.lengthTimer = 0; // Increments when lengthTimerCycles reaches 0
    this.isTriggered = false;
  }

  isDACOn() {
    return testBit(this.apu.cpu.mmu.readByte(this.nr30), 7);
  }

  getInitialLengthTimer() {
    return this.apu.cpu.mmu.readByte(this.nr31);
  }

  getOutputLevel() {
    const outputLevel = (this.apu.cpu.mmu.readByte(this.nr32) >> 5) & 0b11; // Bits 5-6

    switch (outputLevel) {
      case 0b00:
        return 0;
      case 0b01:
        return 1;
      case 0b10:
        return 0.5;
      case 0b11:
        return 0.25;
    }
  }

  getPeriod() {
    const periodHigh = this.apu.cpu.mmu.readByte(this.nr34) & 0b111; // Bits 0-2
    const periodLow = this.apu.cpu.mmu.readByte(this.nr33);

    return (periodHigh << 8) | periodLow;
  }

  getPeriodFreq() {
    const period = this.getPeriod();

    return 65536 / (2048 - period);
  }

  isLengthEnabled() {
    return testBit(this.apu.cpu.mmu.readByte(this.nr34), 6);
  }

  update(cycles) {
    this.lengthTimerCycles -= cycles;

    // Length
    if (this.isLengthEnabled() && this.lengthTimerCycles <= 0) {
      this.lengthTimerCycles += 16384;
      this.lengthTimer++;

      // Shut down channel
      if (this.lengthTimer >= 256) this.stop();
    }
  }

  trigger() {
    if (!this.isDACOn()) return; // DAC off

    // Length timer reset
    this.lengthTimer = this.getInitialLengthTimer();
    this.lengthTimerCycles = 16384;

    this.stop();

    // Play at frequency & volume
    this.playWave(this.getPeriodFreq(), this.getOutputLevel());
    this.isTriggered = true;
  }

  getWaveRamSamples() {
    const samples = 32; // 32 samples, 4 bits each one
    const buffer = this.apu.audioCtx.createBuffer(
      1,
      samples,
      this.apu.audioCtx.sampleRate
    );
    const data = buffer.getChannelData(0);

    let sampleIndex = 0;
    for (let i = this.waveRam.start; i <= this.waveRam.end; i++) {
      const byte = this.apu.cpu.mmu.ioRegs[i & 0x7f];

      // Get 2 samples from the byte. Upper nibble first
      const upper = byte >> 4;
      const lower = byte & 0x0f;

      // Normalize to [-1.0, 1.0]
      data[sampleIndex++] = (upper / 15) * 2 - 1;
      data[sampleIndex++] = (lower / 15) * 2 - 1;
    }

    return buffer;
  }

  playWave(frequency, volume) {
    const buffer = this.getWaveRamSamples();
    this.source = this.apu.audioCtx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;

    this.source.playbackRate.value =
      (frequency * buffer.length) / this.apu.audioCtx.sampleRate;

    this.gainNode = this.apu.audioCtx.createGain();
    this.gainNode.gain.value = volume * this.apu.masterVolume;

    this.source.connect(this.gainNode).connect(this.apu.audioCtx.destination);
    this.source.start();
  }

  stop() {
    this.source?.stop();
    this.isTriggered = false;
  }
}

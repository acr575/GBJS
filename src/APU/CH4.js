import { resetBit, setBit, testBit } from "../GameBoyUtils.js";

export class CH4 {
  constructor(apu) {
    this.apu = apu;

    this.nr41 = 0xff20;
    this.nr42 = 0xff21;
    this.nr43 = 0xff22;
    this.nr44 = 0xff23;

    this.lengthTimerCycles = 16384; // Remaining cycles to tick up length timer (16384 cycles, 256 Hz)
    this.lengthTimer = 0; // Increments when lengthTimerCycles reaches 0
    this.envelopeTimerCycles = 65536; // Remaining cycles to tick up envelop timer (65536 cycles, 64 Hz)
    this.envelopeTimer = 0; // Increments when envelopeTimerCycles reaches 0
    this.LFSRTimerCycles = 0; // Remaining cycles to clock LFSR

    this.LFSR = 0;
  }

  getInitialLengthTimer() {
    return this.apu.cpu.mmu.readByte(this.nr41) & 0b111111; // Bits 0-5
  }

  getInitialVolume() {
    return (this.apu.cpu.mmu.readByte(this.nr42) >> 4) / 15; // Bits 4-7
  }

  getEnvelopeDir() {
    return testBit(this.apu.cpu.mmu.readByte(this.nr42), 3); // Bit 3
  }

  getEnvelopePace() {
    return this.apu.cpu.mmu.readByte(this.nr42) & 0b111; // Bits 0-2
  }

  isLengthEnabled() {
    return testBit(this.apu.cpu.mmu.readByte(this.nr44), 6);
  }

  isDACOn() {
    return (this.apu.cpu.mmu.readByte(this.nr42) & 0b11111000) != 0;
  }

  getLFSRClockFreq() {
    const divider = this.getClockDivider() || 0.5; // Divider 0 is treated as 0.5
    const shift = this.getClockShift();

    return this.apu.cpu.CLOCKSPEED / (262144 / (divider * Math.pow(2, shift))); // Result in clock cycles
  }

  getClockShift() {
    return this.apu.cpu.mmu.readByte(this.nr43) >> 4; // Bits 4-7
  }

  getClockDivider() {
    return this.apu.cpu.mmu.readByte(this.nr43) & 0b111; // Bits 0-3
  }

  getLFSRWidth() {
    const LFSR = testBit(this.apu.cpu.mmu.readByte(this.nr43), 3);
    return LFSR ? 7 : 15;
  }

  trigger() {
    if (!this.isDACOn()) return; // DAC off

    this.resetTimers();
    this.LFSR = 0x7fff;
    this.stop();

    this.gainNode = this.apu.audioCtx.createGain();
    this.gainNode.gain.value = this.getInitialVolume();
    this.gainNode.connect(this.apu.audioCtx.destination);

    const bufferSize = 4096;
    const buffer = this.apu.audioCtx.createBuffer(
      1,
      bufferSize,
      this.apu.audioCtx.sampleRate
    );
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const raw = this.generateNoiseSample();
      // Escala: 1 para alto, -1 para bajo
      channel[i] = raw * this.getInitialVolume();
    }

    this.source = this.apu.audioCtx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    this.source.connect(this.gainNode);
    this.source.start();
  }

  resetTimers() {
    this.lengthTimer = this.getInitialLengthTimer();
    this.lengthTimerCycles = 16384;
    this.envelopeTimer = 0;
    this.envelopeTimerCycles = 65536;
    this.LFSRTimerCycles = this.getLFSRClockFreq();
  }

  update(cycles) {
    this.envelopeTimerCycles -= cycles;
    this.lengthTimerCycles -= cycles;
    // this.LFSRTimerCycles -= cycles;

    // // Noise
    // if (this.LFSRTimerCycles <= 0) {
    //   this.LFSRTimerCycles += this.getLFSRClockFreq();

    //   const sample = this.generateNoiseSample() * this.getInitialVolume();
    //   this.sampleBuffer[this.bufferIndex++] = sample;

    //   if (this.bufferIndex >= this.sampleBuffer.length) {
    //     this.playNoiseBuffer();
    //     this.bufferIndex = 0;
    //   }
    // }

    // Envelope. A 0 Envelope Pace disables the funcionality
    if (this.getEnvelopePace() != 0 && this.envelopeTimerCycles <= 0) {
      this.envelopeTimerCycles += 65536;
      this.envelopeTimer++;

      // Update volume
      if (this.envelopeTimer >= this.getEnvelopePace()) {
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

    // Length
    if (this.isLengthEnabled() && this.lengthTimerCycles <= 0) {
      this.lengthTimerCycles += 16384;
      this.lengthTimer++;

      // Shut down channel
      if (this.lengthTimer >= 64) this.stop();
    }
  }

  generateNoiseSample() {
    const bit0 = this.LFSR & 1;
    const bit1 = (this.LFSR >> 1) & 1;
    const xor = bit0 ^ bit1;

    // Write new bit on bit 15
    this.LFSR = xor ? setBit(this.LFSR, 15) : resetBit(this.LFSR, 15);

    // If width mode is 7 bits, also write to bit 7
    if (this.getLFSRWidth() == 7)
      this.LFSR = xor ? setBit(this.LFSR, 7) : resetBit(this.LFSR, 7);

    // Right shift and return bit 0
    this.LFSR = this.LFSR >> 1;

    return this.LFSR & (1 == 0) ? 1 : -1;
  }

  playNoiseBuffer() {
    const buffer = this.apu.audioCtx.createBuffer(
      1,
      this.sampleBuffer.length,
      this.apu.audioCtx.sampleRate
    );

    const channel = buffer.getChannelData(0);
    for (let i = 0; i < this.sampleBuffer.length; i++) {
      channel[i] = this.sampleBuffer[i];
    }

    this.source = this.apu.audioCtx.createBufferSource();
    this.source.connect(this.gainNode).connect(this.apu.audioCtx.destination);
    this.source.buffer = buffer;
    this.source.start();
  }

  stop() {
    this.source?.stop();
  }
}

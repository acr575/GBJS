import { resetBit, setBit, testBit } from "../GameBoyUtils.ts";

export class CH4 {
  apu: any;

  nr41: number = 0xff20;
  nr42: number = 0xff21;
  nr43: number = 0xff22;
  nr44: number = 0xff23;

  lengthTimerCycles: number = 16384; // Remaining cycles to tick up length timer (16384 cycles, 256 Hz)
  lengthTimer: number = 0; // Increments when lengthTimerCycles reaches 0
  envelopeTimerCycles: number = 65536; // Remaining cycles to tick up envelop timer (65536 cycles, 64 Hz)
  envelopeTimer: number = 0; // Increments when envelopeTimerCycles reaches 0
  LFSRTimerCycles: number = 0; // Remaining cycles to clock LFSR

  LFSR: number = 0;

  gainNode: GainNode | null = null;
  source: AudioBufferSourceNode | null = null;
  sampleBuffer: number[] = [];
  bufferIndex: number = 0;

  constructor(apu: any) {
    this.apu = apu;
  }

  public getInitialLengthTimer(): number {
    return this.apu.cpu.mmu.readByte(this.nr41) & 0b111111; // Bits 0-5
  }

  public getInitialVolume(): number {
    return (this.apu.cpu.mmu.readByte(this.nr42) >> 4) / 15; // Bits 4-7
  }

  public getEnvelopeDir(): boolean {
    return testBit(this.apu.cpu.mmu.readByte(this.nr42), 3); // Bit 3
  }

  public getEnvelopePace(): number {
    return this.apu.cpu.mmu.readByte(this.nr42) & 0b111; // Bits 0-2
  }

  public isLengthEnabled(): boolean {
    return testBit(this.apu.cpu.mmu.readByte(this.nr44), 6);
  }

  public isDACOn(): boolean {
    return (this.apu.cpu.mmu.readByte(this.nr42) & 0b11111000) != 0;
  }

  public getLFSRClockFreq(): number {
    const divider = this.getClockDivider() || 0.5; // Divider 0 is treated as 0.5
    const shift = this.getClockShift();

    return this.apu.cpu.CLOCKSPEED / (262144 / (divider * Math.pow(2, shift))); // Result in clock cycles
  }

  public getClockShift(): number {
    return this.apu.cpu.mmu.readByte(this.nr43) >> 4; // Bits 4-7
  }

  public getClockDivider(): number {
    return this.apu.cpu.mmu.readByte(this.nr43) & 0b111; // Bits 0-3
  }

  public getLFSRWidth(): number {
    const LFSR = testBit(this.apu.cpu.mmu.readByte(this.nr43), 3);
    return LFSR ? 7 : 15;
  }

  public trigger(): void {
    if (!this.isDACOn()) return; // DAC off

    this.resetTimers();
    this.LFSR = 0x7fff;
    this.stop();

    if (!this.apu.audioCtx) {
      return;
    }

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

  public resetTimers(): void {
    this.lengthTimer = this.getInitialLengthTimer();
    this.lengthTimerCycles = 16384;
    this.envelopeTimer = 0;
    this.envelopeTimerCycles = 65536;
    this.LFSRTimerCycles = this.getLFSRClockFreq();
  }

  public update(cycles: number): void {
    this.envelopeTimerCycles -= cycles;
    this.lengthTimerCycles -= cycles;

    // Envelope. A 0 Envelope Pace disables the funcionality
    if (this.getEnvelopePace() != 0 && this.envelopeTimerCycles <= 0) {
      this.envelopeTimerCycles += 65536;
      this.envelopeTimer++;

      // Update volume
      if (this.getEnvelopeDir() && this.gainNode) {
        const gainStep = 1 / 15;

        if (this.getEnvelopeDir()) {
          this.gainNode.gain.value = Math.min(1, this.gainNode.gain.value + gainStep);
        } else {
          this.gainNode.gain.value = Math.max(0, this.gainNode.gain.value - gainStep);
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

  public generateNoiseSample(): number {
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

    // Preserve original behavior (legacy bug): always return -1 or 1 based on LFSR lowest bit
    return (this.LFSR & 1) == 0 ? 1 : -1;
  }

  public playNoiseBuffer(): void {
    if (!this.apu.audioCtx || !this.gainNode) return;

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

  public stop(): void {
    try {
      this.source?.stop();
    } catch (e) {
      /* ignore */
    }
  }
}

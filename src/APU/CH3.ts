import { testBit } from "../GameBoyUtils.ts";

export class CH3 {
  private nr30: number = 0xff1a;
  private nr31: number = 0xff1b;
  private nr32: number = 0xff1c;
  private nr33: number = 0xff1d;
  private nr34: number = 0xff1e;

  private waveRam: { start: number; end: number } = { start: 0xff30, end: 0xff3f };

  private lengthTimerCycles: number = 16384; // Remaining cycles to tick up length timer (16384 cycles, 256 Hz)
  private lengthTimer: number = 0; // Increments when lengthTimerCycles reaches 0

  apu: any;

  isTriggered: boolean = false;
  triggerEnabled: boolean = true;

  source: AudioBufferSourceNode | null = null;
  globalGain: GainNode | null = null;
  leftGain: GainNode | null = null;
  rightGain: GainNode | null = null;

  constructor(apu: any) {
    this.apu = apu;
    this.waveRam = { start: 0xff30, end: 0xff3f };
  }

  public isDACOn(): boolean {
    return testBit(this.apu.cpu.mmu.readByte(this.nr30), 7);
  }

  private getInitialLengthTimer(): number {
    return this.apu.cpu.mmu.readByte(this.nr31);
  }

  private getOutputLevel(): number {
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
      default:
        return 0;
    }
  }

  private getPeriod(): number {
    const periodHigh = this.apu.cpu.mmu.readByte(this.nr34) & 0b111; // Bits 0-2
    const periodLow = this.apu.cpu.mmu.readByte(this.nr33);

    return (periodHigh << 8) | periodLow;
  }

  private getPeriodFreq(): number {
    const period = this.getPeriod();

    return 65536 / (2048 - period);
  }

  private isLengthEnabled(): boolean {
    return testBit(this.apu.cpu.mmu.readByte(this.nr34), 6);
  }

  public trigger(): void {
    if (!this.isDACOn()) return; // DAC off

    // Length timer reset
    this.lengthTimer = this.getInitialLengthTimer();
    this.lengthTimerCycles = 16384;

    this.stop();

    if (!this.apu.audioCtx) {
      this.isTriggered = true;
      return;
    }

    // Play at frequency & volume
    this.playWave(this.getPeriodFreq(), this.getOutputLevel(), this.apu.getPanning(3));
    this.isTriggered = true;
  }

  public update(cycles: number): void {
    this.lengthTimerCycles -= cycles;

    // Length
    if (this.isLengthEnabled() && this.lengthTimerCycles <= 0) {
      this.lengthTimerCycles += 16384;
      this.lengthTimer++;

      // Shut down channel
      if (this.lengthTimer >= 256) this.stop();
    }
  }

  public updatePanning(): void {
    const panning = this.apu.getPanning(3);
    if (this.leftGain)
      this.leftGain.gain.value = panning.left ? this.apu.getLeftVolume() : 0;
    if (this.rightGain)
      this.rightGain.gain.value = panning.right ? this.apu.getRightVolume() : 0;
  }

  private getWaveRamSamples(): AudioBuffer | null {
    if (!this.apu.audioCtx) return null;

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

  private playWave(frequency: number, volume: number, panning: { left: boolean; right: boolean }) {
    if (!panning.left && !panning.right) return; // No sound
    if (!this.apu.audioCtx) return;

    const buffer = this.getWaveRamSamples();
    if (!buffer) return;

    this.source = this.apu.audioCtx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;

    // Frequency
    this.source.playbackRate.value = (frequency * buffer.length) / this.apu.audioCtx.sampleRate;

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

  public stop(): void {
    try {
      this.source?.stop();
    } catch (e) {
      /* ignore */
    }
    this.isTriggered = false;
  }
}

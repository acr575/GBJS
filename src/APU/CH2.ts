import { testBit } from "../GameBoyUtils.ts";

export class CH2 {
  apu: any;

  nr21: number = 0xff16;
  nr22: number = 0xff17;
  nr23: number = 0xff18;
  nr24: number = 0xff19;

  private lengthTimerCycles: number = 16384; // Remaining cycles to tick up length timer (16384 cycles, 256 Hz)
  private lengthTimer: number = 0; // Increments when lengthTimerCycles reaches 0
  private envelopeTimerCycles: number = 65536; // Remaining cycles to tick up envelop timer (65536 cycles, 64 Hz)
  private envelopeTimer: number = 0; // Increments when envelopeTimerCycles reaches 0

  isTriggered: boolean = false;
  triggerEnabled: boolean = true;

  source: AudioBufferSourceNode | null = null;
  globalGain: GainNode | null = null;
  leftGain: GainNode | null = null;
  rightGain: GainNode | null = null;

  constructor(apu: any) {
    this.apu = apu;
  }

  private getInitialLengthTimer(): number {
    return this.apu.cpu.mmu.readByte(this.nr21) & 0b111111; // Bits 0-5
  }

  private getWaveDuty(): number {
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
      default:
        return 0.5;
    }
  }

  private getInitialVolume(): number {
    return (this.apu.cpu.mmu.readByte(this.nr22) >> 4) / 15; // Bits 4-7
  }

  private getEnvelopeDir(): boolean {
    return testBit(this.apu.cpu.mmu.readByte(this.nr22), 3); // Bit 3
  }

  private getEnvelopePace(): number {
    return this.apu.cpu.mmu.readByte(this.nr22) & 0b111; // Bits 0-2
  }

  public getPeriod(): number {
    const periodHigh = this.apu.cpu.mmu.readByte(this.nr24) & 0b111; // Bits 0-2
    const periodLow = this.apu.cpu.mmu.readByte(this.nr23);

    return (periodHigh << 8) | periodLow;
  }

  private getPeriodFreq(): number {
    const period = this.getPeriod();

    return 131072 / (2048 - period);
  }

  private isLengthEnabled(): boolean {
    return testBit(this.apu.cpu.mmu.readByte(this.nr24), 6);
  }

  public isDACOn(): boolean {
    return (this.apu.cpu.mmu.readByte(this.nr22) & 0b11111000) != 0;
  }

  public getPanning(): { left: boolean; right: boolean } {
    return this.apu.getPanning(2);
  }

  public trigger(): void {
    if (!this.isDACOn()) return; // DAC off

    this.resetTimers();
    this.stop();

    // If no AudioContext (e.g., Node), guard and act as a no-op for audio API
    if (!this.apu.audioCtx) {
      this.isTriggered = true;
      return;
    }

    this._playSquareWave(this.getPeriodFreq(), this.getInitialVolume(), this.getPanning());
    this.isTriggered = true;
  }

  public resetTimers(): void {
    this.lengthTimer = this.getInitialLengthTimer();
    this.lengthTimerCycles = 16384;
    this.envelopeTimer = 0;
    this.envelopeTimerCycles = 65536;
  }

  public update(cycles: number): void {
    this.envelopeTimerCycles -= cycles;
    this.lengthTimerCycles -= cycles;

    // Envelope. A 0 Sweep Pace disables the funcionality
    if (this.getEnvelopePace() != 0 && this.envelopeTimerCycles <= 0) {
      this.envelopeTimerCycles += 65536;
      this.envelopeTimer++;

      // Update volume
      if (this.envelopeTimer >= this.getEnvelopePace() && this.globalGain) {
        const gainStep = (1 / 15) * this.apu.masterVolume;

        if (this.getEnvelopeDir()) {
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

  public updatePanning(): void {
    const panning = this.getPanning();
    if (this.leftGain)
      this.leftGain.gain.value = panning.left ? this.apu.getLeftVolume() : 0;
    if (this.rightGain)
      this.rightGain.gain.value = panning.right ? this.apu.getRightVolume() : 0;
  }

  private _generateWaveWithDutyCycles(dutyCycle: number): AudioBuffer | null {
    if (!this.apu.audioCtx) return null;

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

  private _playSquareWave(
    frequency: number,
    volume: number,
    panning: { left: boolean; right: boolean }
  ): void {
    if (!panning.left && !panning.right) return; // No sound
    if (!this.apu.audioCtx) return;

    const buffer = this._generateWaveWithDutyCycles(this.getWaveDuty());
    if (!buffer) return;

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

  public stop(): void {
    try {
      this.source?.stop();
    } catch (e) {
      /* ignore */
    }
    this.isTriggered = false;
  }
}

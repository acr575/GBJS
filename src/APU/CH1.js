import { testBit } from "../GameBoyUtils.js";
import { CH2 } from "./CH2.js";

export class CH1 extends CH2 {
  // New CH1 sweep register
  #nr10 = 0xff10;

  constructor(apu) {
    super(apu);

    // Override NR2x registers
    this.nr21 = 0xff11;
    this.nr22 = 0xff12;
    this.nr23 = 0xff13;
    this.nr24 = 0xff14;

    this.currentPeriod = 0;
    this.isSweepEnabled = false;
    this.sweepTimerCycles = 32768; // Remaining cycles to tick up sweepTimer (32768 cycles, 128 Hz)
    this.sweepTimer = 0; // Increments when sweepTimerCylces reaches 0
  }

  #getSweepPace() {
    return (this.apu.cpu.mmu.readByte(this.#nr10) >> 4) & 0b111;
  }

  #getSweepDirection() {
    return testBit(this.apu.cpu.mmu.readByte(this.#nr10), 3);
  }

  #getSweepStep() {
    return this.apu.cpu.mmu.readByte(this.#nr10) & 0b111;
  }

  getPanning() {
    return this.apu.getPanning(1);
  }

  trigger() {
    this.currentPeriod = this.getPeriod();

    // Enabled flag is set either the sweep pace or individual step are non-zero, cleared otherwise
    const step = this.#getSweepStep();
    this.isSweepEnabled = this.#getSweepPace() != 0 || step != 0;

    if (step != 0) {
      let newPeriod = this.#calculateSweepFreq(this.#getSweepDirection());
      if (newPeriod > 0x7ff) {
        this.stop();
        return;
      }
    }

    super.trigger(); // Reset timers & play sound
  }

  resetTimers() {
    super.resetTimers();
    this.sweepTimer = 0;
    this.sweepTimerCycles = 32768;
  }

  update(cycles) {
    super.update(cycles);

    this.sweepTimerCycles -= cycles;

    if (this.sweepTimerCycles <= 0) {
      this.sweepTimerCycles += 32768;
      this.sweepTimer++;

      // Sweep funcionality: inc or dec the period
      if (
        this.isSweepEnabled &&
        this.#getSweepPace() != 0 &&
        this.sweepTimer >= this.#getSweepPace()
      ) {
        this.sweepTimer = 0;

        let newPeriod = this.getPeriod();
        if (!this.#getSweepDirection()) {
          newPeriod = this.#calculateSweepFreq(false);
          // Check for overflow
          if (newPeriod > 0x7ff) {
            this.stop();
            return;
          }
        } else {
          newPeriod = this.#calculateSweepFreq(true);
          if (newPeriod < 0) newPeriod = 0;
        }

        const periodFreq = 131072 / (2048 - newPeriod);

        // Update BufferSource freq & period registers
        this.source.playbackRate.value =
          (periodFreq * this.source.buffer.length) /
          this.apu.audioCtx.sampleRate;
        this.#updatePeriod(newPeriod);
      }
    }
  }

  #calculateSweepFreq(direction) {
    const currentPeriod = this.currentPeriod;
    const periodDivider = currentPeriod / Math.pow(2, this.#getSweepStep());
    const newPeriod =
      currentPeriod + (!direction ? periodDivider : -periodDivider);

    return newPeriod;
  }

  #updatePeriod(newPeriod) {
    this.currentPeriod = newPeriod;
    // Bits 0-7 to NR13
    const lowPeriod = newPeriod & 0xff;
    this.apu.cpu.mmu.writeByte(this.nr23, lowPeriod);

    // Bits 8-10 to 0-3 NR14
    const highPeriod = (newPeriod >> 8) & 0b111;
    const currentNR14 = this.apu.cpu.mmu.readByte(this.nr24);
    const newNR14 = (currentNR14 & 0b11111000) | highPeriod;
    this.apu.cpu.mmu.writeByte(this.nr24, newNR14);
  }
}

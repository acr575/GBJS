import { testBit } from "./GameBoyUtils.js";

export class Timer {
  /* TIMER REGISTERS */
  #div = 0xff04; // Divider
  #tima = 0xff05; // Timer counter
  #tma = 0xff06; // Timer modulo
  #tac = 0xff07; // Timer control

  #timerCounter = 0;
  #dividerCounter = 0;

  constructor(cpu) {
    this.cpu = cpu;
    this.mmu = this.cpu.mmu;

    this.#timerCounter = this.#getClockFreq();
    this.#dividerCounter = 0;
  }

  updateTimers(cycles) {
    this.#incDividerRegister(cycles);

    // TIMA (clock) must be enabled to update it
    if (!this.#isTimaEnabled()) return;

    this.#timerCounter += cycles;
    const clockFreq = this.#getClockFreq();

    // Here, we need to increment the timer's internal counter relative to the tick size. The
    // counter may have to be incremented multiple times for a given tick. While this
    // technically could happen for the div internal counter, in practice it doesn't: no
    // instruction takes longer to execute than it takes to increment DIV once. However, it
    // _is_ possible to have the timer internal counter increment multiple times during a given
    // instruction.
    //
    // Notably, getting this wrong will cause blargg's instr_timing test ROM to fail with
    // the cryptic "Failure #255" message.
    // Source: https://github.com/feo-boy/feo-boy/blob/master/src/bus/timer.rs#L56-L66
    while (this.#timerCounter >= clockFreq) {
      this.#timerCounter -= clockFreq;

      // Timer about to overflow
      if (this.mmu.readByte(this.#tima) >= 0xff) {
        this.mmu.writeByte(this.#tima, this.mmu.readByte(this.#tma)); // Set TIMA to TMA
        this.cpu.requestInterrupt(2);
      } else {
        this.mmu.writeByte(this.#tima, this.mmu.readByte(this.#tima) + 1); // Increment TIMA
      }
    }
  }

  #isTimaEnabled() {
    const tacValue = this.mmu.readByte(this.#tac);
    return testBit(tacValue, 2); // Bit 2 controls whether TIMA is incremented
  }

  #getClockSelect() {
    return this.mmu.readByte(this.#tac) & 0b11; // Freq. stored at TAC's last 2 bits
  }

  #getClockFreq() {
    const freqIndex = this.#getClockSelect();
    let freq;

    switch (freqIndex) {
      case 0b00:
        freq = 4096;
        break;

      case 0b01:
        freq = 262144;
        break;

      case 0b10:
        freq = 65536;
        break;

      case 0b11:
        freq = 16384;
        break;
    }

    return this.cpu.CLOCKSPEED / freq;
  }

  #incDividerRegister(cycles) {
    this.#dividerCounter += cycles;
    if (this.#dividerCounter >= 0xff) {
      this.#dividerCounter = 0;
      this.mmu.ioRegs[this.#div & 0x7f]++;
    }
  }
}

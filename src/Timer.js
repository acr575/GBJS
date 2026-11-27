// TAC bits 1–0 select which bit of the 16-bit system counter clocks TIMA.
// 00 → bit 9 (4096 Hz), 01 → bit 3 (262144 Hz), 10 → bit 5 (65536 Hz), 11 → bit 7 (16384 Hz).
const CLOCK_BIT = [9, 3, 5, 7];

// TIMA reads 0 for this many T-cycles after it overflows, then TMA is loaded and IF bit 2 is set.
const RELOAD_DELAY = 4;

const DIV = 0x04;
const TIMA = 0x05;
const TMA = 0x06;
const TAC = 0x07;

/**
 * DMG timer. DIV, TIMA, TMA and TAC are views onto one 16-bit counter that
 * increments every T-cycle. DIV is the high byte. TIMA increments on the
 * falling edge of (selected counter bit AND TAC enable), which is also what
 * produces the extra tick when DIV is reset or TAC changes. An overflow
 * reloads TMA and raises the timer interrupt one M-cycle later.
 */
export class Timer {
  #counter = 0;
  #reloadDelay = 0;
  // True when the TMA reload landed on the last T-cycle of the previous
  // instruction. The next CPU write still falls inside that reload cycle:
  // a TIMA write is ignored, and a TMA write is copied into TIMA as well.
  #reloadCycle = false;

  constructor(cpu) {
    this.cpu = cpu;
    this.mmu = cpu.mmu;
  }

  /** The 16-bit counter DIV is the high byte of. The APU frame sequencer watches bit 12. */
  get systemCounter() {
    return this.#counter;
  }

  /**
   * Advance the system counter by `cycles` T-cycles.
   * A long instruction can cross several falling edges; each one increments
   * TIMA. Missing that makes blargg's instr_timing report "Failure #255".
   * @param {number} cycles
   */
  updateTimers(cycles) {
    const regs = this.mmu.ioRegs;
    let reloaded = false;

    for (let i = 0; i < cycles; i++) {
      reloaded = false;

      if (this.#reloadDelay > 0) {
        this.#reloadDelay--;
        if (this.#reloadDelay === 0) {
          regs[TIMA] = regs[TMA];
          this.cpu.requestInterrupt(2);
          reloaded = true;
        }
      }

      const previous = this.#counter;
      this.#counter = (previous + 1) & 0xffff;
      if (this.#fallingEdge(previous, this.#counter, regs[TAC], regs[TAC]))
        this.#incrementTima();
    }

    regs[DIV] = this.#counter >>> 8;
    this.#reloadCycle = reloaded;
  }

  /** Writing any value to FF04 zeroes the whole counter, not just the visible byte. */
  resetOnDivWrite() {
    const regs = this.mmu.ioRegs;
    const previous = this.#counter;
    this.#counter = 0;
    regs[DIV] = 0;
    if (this.#fallingEdge(previous, 0, regs[TAC], regs[TAC]))
      this.#incrementTima();
    // Bit 12 falling through the reset also steps the APU frame sequencer.
    this.cpu.apu.onDivReset(previous);
  }

  /**
   * CPU write to FF05.
   * During the overflow delay the write aborts the reload and the interrupt.
   * On the reload cycle itself the write loses and TIMA stays at TMA.
   * @param {number} value
   */
  writeTima(value) {
    if (this.#reloadCycle) return;

    if (this.#reloadDelay > 0) this.#reloadDelay = 0;
    this.mmu.ioRegs[TIMA] = value;
  }

  /**
   * CPU write to FF06. On the reload cycle TIMA is loaded from TMA in the
   * same cycle, so it picks up this value too.
   * @param {number} value
   */
  writeTma(value) {
    this.mmu.ioRegs[TMA] = value;
    if (this.#reloadCycle) this.mmu.ioRegs[TIMA] = value;
  }

  /**
   * CPU write to FF07. Changing the enable bit or the selected clock can
   * drop the edge detector's input and increment TIMA.
   * @param {number} value
   */
  writeTac(value) {
    const regs = this.mmu.ioRegs;
    const previous = regs[TAC];
    regs[TAC] = value;
    if (this.#fallingEdge(this.#counter, this.#counter, previous, value))
      this.#incrementTima();
  }

  #incrementTima() {
    const regs = this.mmu.ioRegs;
    const next = (regs[TIMA] + 1) & 0xff;
    regs[TIMA] = next;
    if (next === 0) this.#reloadDelay = RELOAD_DELAY;
  }

  // The edge detector watches enable AND the selected bit. A 1→0 on that
  // signal — from the counter moving, a DIV reset, or a TAC write — clocks TIMA.
  #fallingEdge(previousCounter, counter, previousTac, tac) {
    return (
      this.#timerSignal(previousCounter, previousTac) &&
      !this.#timerSignal(counter, tac)
    );
  }

  #timerSignal(counter, tac) {
    return (
      (tac & 0x04) !== 0 &&
      ((counter >>> CLOCK_BIT[tac & 3]) & 1) !== 0
    );
  }
}

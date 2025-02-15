const CLOCKSPEED = 4194304; // Hz

export class Timer {
  constructor(cpu) {
    this.cpu = cpu;
    this.mmu = this.cpu.mmu;

    /* TIMER REGISTERS */
    this.div = 0xff04; // Divider
    this.tima = 0xff05; // Timer counter
    this.tma = 0xff06; // Timer modulo
    this.tac = 0xff07; // Timer control

    this.timerCounter = 1024;
    this.dividerCounter = 0;
  }

  updateTimers(cycles) {
    this.incDividerRegister(cycles);

    // TIMA (clock) must be enabled to update it
    if (this.isTimaEnabled()) {
      this.timerCounter -= cycles;

      // Enough cpu clock cycles have happened to update TIMA
      if (this.timerCounter <= 0) {
        // Reset timerCounter to the correct value
        this.setClockFreq();

        // Timer about to overflow
        if (this.mmu.readByte(this.tima) >= 0xff) {
          this.mmu.writeByte(this.tima, this.mmu.readByte(this.tma)); // Set TIMA to TMA
          this.cpu.requestInterrupt(2);
        } else {
          this.mmu.writeByte(this.tima, this.mmu.readByte(this.tima) + 1); // Increment TIMA
        }
      }
    }
  }

  isTimaEnabled() {
    const tacValue = this.mmu.readByte(this.tac);
    return (tacValue >> 2) & 1; // Bit 2 controls whether TIMA is incremented
  }

  getClockFreq() {
    return this.mmu.readByte(this.tac) & 0b11; // Freq. stored at TAC's last 2 bits
  }

  setClockFreq() {
    const freqIndex = this.getClockFreq();
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

    this.timerCounter = CLOCKSPEED / freq;
  }

  // TODO: Note that writing to DIV register may increase TIMA once!
  // Ref: https://gbdev.io/pandocs/Timer_Obscure_Behaviour.html#relation-between-timer-and-divider-register
  incDividerRegister(cycles) {
    this.dividerCounter += cycles;
    if (this.dividerCounter >= 0xff) {
      this.dividerCounter = 0;
      this.mmu.ioRegs[this.div & 0x7f]++;
    }
  }

  writeTAC(val) {
    let currentFreq = this.getClockFreq();
    this.mmu.ioRegs[this.tac & 0x7f] = val;
    let newFreq = this.getClockFreq();

    if (currentFreq != newFreq) this.setClockFreq();
  }
}

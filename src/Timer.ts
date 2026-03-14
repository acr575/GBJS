import { testBit } from "./GameBoyUtils.ts";

export class Timer {
  /* TIMER REGISTERS */
  private div: number = 0xff04; // Divider
  private tima: number = 0xff05; // Timer counter
  private tma: number = 0xff06; // Timer modulo
  private tac: number = 0xff07; // Timer control

  private timerCounter: number = 0;
  private dividerCounter: number = 0;

  cpu: any; // TODO: replace `any` with a proper CPU type
  mmu: any;

  constructor(cpu: any) {
    this.cpu = cpu;
    this.mmu = this.cpu.mmu;

    this.timerCounter = this.getClockFreq();
    this.dividerCounter = 0;
  }

  updateTimers(cycles: number): void {
    this.incDividerRegister(cycles);

    // TIMA (clock) must be enabled to update it
    if (!this.isTimaEnabled()) return;

    this.timerCounter += cycles;
    const clockFreq = this.getClockFreq();

    // The timer's internal counter may need to increment multiple times for a given tick.
    while (this.timerCounter >= clockFreq) {
      this.timerCounter -= clockFreq;

      // Timer about to overflow
      if (this.mmu.readByte(this.tima) >= 0xff) {
        this.mmu.writeByte(this.tima, this.mmu.readByte(this.tma)); // Set TIMA to TMA
        this.cpu.requestInterrupt(2);
      } else {
        this.mmu.writeByte(this.tima, this.mmu.readByte(this.tima) + 1); // Increment TIMA
      }
    }
  }

  private isTimaEnabled(): boolean {
    const tacValue = this.mmu.readByte(this.tac);
    return testBit(tacValue, 2); // Bit 2 controls whether TIMA is incremented
  }

  private getClockSelect(): number {
    return this.mmu.readByte(this.tac) & 0b11; // Freq. stored at TAC's last 2 bits
  }

  private getClockFreq(): number {
    const freqIndex = this.getClockSelect();
    let freq: number;

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

      default:
        freq = 4096;
    }

    return this.cpu.CLOCKSPEED / freq;
  }

  private incDividerRegister(cycles: number): void {
    this.dividerCounter += cycles;
    if (this.dividerCounter >= 0xff) {
      this.dividerCounter = 0;
      this.mmu.ioRegs[this.div & 0x7f]++;
    }
  }
}

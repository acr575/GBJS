export class GPU {
  constructor(cpu) {
    this.cpu = cpu;
    this.mmu = cpu.mmu;

    this.oam = new Uint8Array(160); // OAM   160 B.   Area FE00 - FE9F

    this.scanlineCounter = 456; // Clock cycles to draw a scanline

    this.lcdc = 0xff40; // LCD Control
    this.stat = 0xff41; // LCD status
    this.ly = 0xff44; // LCD Y coordinate [Read-only]
    this.lyc = 0xff45; // LY compare
    this.dma = 0xff46; // OAM DMA source address & start
  }

  updateGraphics(cycles) {
    this.setLCDStatus();

    if (this.isLCDEnabled()) this.scanlineCounter -= cycles;
    else return;

    if (this.scanlineCounter <= 0) {
      // Move onto next scanline
      let currentLine = this.mmu.readByte(this.ly) + 1;
      this.setLY(currentLine);

      this.scanlineCounter = 456;

      // V-Blank period
      if (currentLine == 144) this.cpu.requestInterrupt(0);
      // If gone past scanline 153 reset to 0
      else if (currentLine > 153) this.setLY(0);
      // Draw current scanline
      // else if (currentLine < 144) this.drawScanLine();
    }
  }

  setLCDStatus() {
    let status = this.mmu.readByte(this.stat);

    if (!this.isLCDEnabled()) {
      // Set the mode to 1 during LCD disabled and reset scanline
      this.scanlineCounter = 456;
      this.setLY(0);
      status &= 0b11111100; // Reset STAT bits 0 & 1
      status |= 1; // Set STAT bit 0 (mode 1)
      this.mmu.writeByte(this.stat, status);
      return;
    }

    let currentline = this.mmu.readByte(this.ly);
    let currentmode = status & 0b11;

    let mode = 0;
    let requestInterrupt = false;

    // In V-Blank: set mode to 1
    if (currentline >= 144) {
      mode = 1;
      status &= 0b11111101; // Reset STAT bit 1
      status |= 1; // Set STAT bit 0 (mode 1)
      requestInterrupt = ((status >> 4) & 1) == 1;
    } else {
      const isMode2 = this.scanlineCounter >= 456 - 80;
      const isMode3 = this.scanlineCounter >= 456 - 80 - 172;

      // Mode 2
      if (isMode2) {
        mode = 2;
        status &= 0b11111110; // Reset STAT bits 0
        status |= 0b10; // Set STAT bit 1 (mode 2)
        requestInterrupt = ((status >> 5) & 1) == 1;
      }
      // Mode 3
      else if (isMode3) {
        mode = 3;
        status |= 0b11; // Set STAT bits 1 & 2 (mode 3)
      }
      // Mode 0
      else {
        mode = 0;
        status &= 0b11111100; // Reset STAT bits 0 & 1 (mode 0)
        requestInterrupt = ((status >> 3) & 1) == 1;
      }
    }

    // Just entered a new mode so request interrupt
    if (requestInterrupt && mode != currentmode) this.cpu.requestInterrupt(1);

    // Check the conincidence flag
    if (this.mmu.readByte(this.ly) == this.mmu.readByte(this.lyc)) {
      status |= 0b100; // Set STAT bit 2
      if ((status >> 6) & 1) this.cpu.requestInterrupt(1);
    } else {
      status &= 0b11111011; // Reset STAT bit 2
    }

    this.mmu.writeByte(this.stat, status); // Update STAT
  }

  isLCDEnabled() {
    return (this.mmu.readByte(this.lcdc) >> 7) & 1;
  }

  writeByte(addr, val) {
    switch (addr & 0xf) {
      // LY is set to 0 when game tries to write it
      case 0x4:
        this.setLY(0);
        break;

      // Writing to DMA register executes DMA transfer
      case 0x6:
        this.doDMATransfer(val);
        break;

      default:
        this.mmu.ioRegs[addr] = val;
    }
  }

  setLY(val) {
    this.mmu.ioRegs[this.ly & 0x7f] = val;
  }

  doDMATransfer(data) {
    const address = data << 8; // source address is data * 100
    for (let i = 0; i < 160; i++) {
      let attempted = this.mmu.readByte(address + i);
      this.mmu.writeByte(0xfe00 + i, this.mmu.readByte(address + i));
      if (attempted != this.mmu.readByte(0xfe00 + i))
        console.log(
          `Attempted: ${attempted}; Writed: ${this.mmu.readByte(0xfe00 + i)}`
        );
    }
  }
}

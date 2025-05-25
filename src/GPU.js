import { getSignedByte, resetBit, setBit, testBit } from "./GameBoyUtils.js";

const WHITE = 0;
const LIGHT_GRAY = 1;
const DARK_GRAY = 2;
const BLACK = 3;

export class PPU {
  constructor(cpu) {
    this.cpu = cpu;
    this.mmu = cpu.mmu;

    this.screen = document.getElementById("screen");
    this.context = this.screen.getContext("2d", { willReadFrequently: true });
    this.frameBuffer = this.context.createImageData(
      this.screen.width,
      this.screen.height
    );

    this.oam = new Uint8Array(160); // OAM   160 B.   Area FE00 - FE9F
    this.vram = new Uint8Array(8192); //VRAM   8 KiB.   Area 8000 - 9FFF

    this.line = 0;
    this.windowLine = 0;
    this.clock = 0;
    this.mode = 2;

    this.lcdc = 0xff40; // LCD Control
    this.stat = 0xff41; // LCD status
    this.scy = 0xff42; // Background viewport Y position
    this.scx = 0xff43; // Background viewport X position
    this.ly = 0xff44; // LCD Y coordinate [Read-only]
    this.lyc = 0xff45; // LY compare
    this.dma = 0xff46; // OAM DMA source address & start
    this.bgp = 0xff47; // BG palette data
    this.obp0 = 0xff48;
    this.obp1 = 0xff49;
    this.wy = 0xff4a;
    this.wx = 0xff4b;
  }

  updateGraphics(cycles) {
    this.clock += cycles;
    let vBlank = false;

    if (!this.isLCDEnabled()) {
      this.setMode(0);
      this.line = 0;
      this.windowLine = 0;
      this.clock = 0;
      this.setLY(0);
      return;
    }

    switch (this.mode) {
      case 0: // HBLANK
        if (this.clock >= 204) {
          this.clock -= 204;
          this.line++;
          this.updateLY();
          if (this.line == 144) {
            // Reached VBLANK
            this.setMode(1);
            vBlank = true;
            this.cpu.requestInterrupt(0);
          } else {
            this.setMode(2);
          }
        }
        break;

      case 1: // VBLANK
        if (this.clock >= 456) {
          this.clock -= 456;
          this.line++;
          if (this.line > 153) {
            this.line = 0;
            this.windowLine = 0;
            this.setMode(2);
          }
          this.updateLY();
        }
        break;

      case 2: // SCANLINE OAM
        if (this.clock >= 80) {
          this.clock -= 80;
          this.setMode(3);
        }
        break;

      case 3: // SCANLINE VRAM
        if (this.clock >= 172) {
          this.clock -= 172;
          this.drawScanLine();
          this.setMode(0);
        }
        break;
    }

    return vBlank;
  }

  updateLY() {
    this.setLY(this.line);
    let statVal = this.mmu.readByte(this.stat);
    if (this.cpu.mmu.readByte(this.ly) == this.cpu.mmu.readByte(this.lyc)) {
      // Set stat bit 2
      let newStat = setBit(statVal, 2);
      this.cpu.mmu.writeByte(this.stat, newStat);

      // Interrupt if stat's bit 6 is set
      if (testBit(statVal, 6)) this.cpu.requestInterrupt(1);
    } else {
      this.cpu.mmu.writeByte(this.stat, resetBit(statVal, 2));
    }
  }

  setMode(mode) {
    this.mode = mode;
    let newStat = this.cpu.mmu.readByte(this.stat);
    newStat &= 0b11111100; // Reset bits 0 & 1
    newStat |= mode; // Set 0 & 1 bits to mode
    this.cpu.mmu.writeByte(this.stat, newStat);

    // Interrupt if allowed
    if (mode < 3 && testBit(newStat, 3 + mode)) this.cpu.requestInterrupt(1);
  }

  drawScanLine() {
    let lcdc = this.mmu.readByte(0xff40);
    if (!testBit(lcdc, 7)) return;

    const renderBGWin = testBit(lcdc, 0);
    const renderSprites = testBit(lcdc, 1);
    if (renderBGWin || renderSprites) {
      if (renderBGWin) this.renderBGWin();
      if (renderSprites) this.renderSprites();
      this.context.putImageData(this.frameBuffer, 0, 0);
    }
  }

  renderBGWin() {
    let tileData = 0;
    let unsigned = true;

    const scrollY = this.mmu.readByte(this.scy);
    const scrollX = this.mmu.readByte(this.scx);
    const windowY = this.mmu.readByte(this.wy);
    const windowX = (this.mmu.readByte(this.wx) - 7) & 0xff;

    const lcdc = this.mmu.readByte(this.lcdc);
    const ly = this.mmu.readByte(this.ly);

    if (testBit(lcdc, 4)) {
      tileData = 0x8000;
      unsigned = true;
    } else {
      tileData = 0x8800;
      unsigned = false;
    }

    const windowEnabled = testBit(lcdc, 5);
    const imageData = this.frameBuffer.data;

    let usedWindowInThisLine = false;

    for (let pixel = 0; pixel < 160; pixel++) {
      let useWindow = false;

      if (windowEnabled && ly >= windowY && pixel >= windowX) {
        useWindow = true;
        usedWindowInThisLine = true;
      }

      const bgMemory = useWindow
        ? testBit(lcdc, 6)
          ? 0x9c00
          : 0x9800
        : testBit(lcdc, 3)
        ? 0x9c00
        : 0x9800;

      const xPos = useWindow
        ? (pixel - windowX) & 0xff
        : (pixel + scrollX) & 0xff;

      const yPos = useWindow ? this.windowLine & 0xff : (scrollY + ly) & 0xff;

      const tileRow = Math.floor(yPos / 8) * 32;
      const tileCol = Math.floor(xPos / 8);
      const tileIndexAddr = (bgMemory + tileRow + tileCol) & 0xffff;

      let tileNum = this.mmu.readByte(tileIndexAddr);
      let tileLocation;

      if (unsigned) {
        tileLocation = (0x8000 + tileNum * 16) & 0xffff;
      } else {
        tileLocation = (0x9000 + getSignedByte(tileNum) * 16) & 0xffff;
      }

      const line = (yPos % 8) * 2;
      const data1 = this.mmu.readByte((tileLocation + line) & 0xffff);
      const data2 = this.mmu.readByte((tileLocation + line + 1) & 0xffff);

      const colourBit = 7 - (xPos % 8);
      let colourNum = ((data2 >> colourBit) & 1) << 1;
      colourNum |= (data1 >> colourBit) & 1;

      const col = this.getColour(colourNum, this.bgp);
      let red = 0,
        green = 0,
        blue = 0;

      switch (col) {
        case WHITE:
          red = 255;
          green = 255;
          blue = 255;
          break;
        case LIGHT_GRAY:
          red = 0xcc;
          green = 0xcc;
          blue = 0xcc;
          break;
        case DARK_GRAY:
          red = 0x77;
          green = 0x77;
          blue = 0x77;
          break;
      }

      if (ly < 0 || ly > 143 || pixel < 0 || pixel > 159) continue;

      const pixelIndex = (ly * this.screen.width + pixel) * 4;
      imageData[pixelIndex] = red;
      imageData[pixelIndex + 1] = green;
      imageData[pixelIndex + 2] = blue;
      imageData[pixelIndex + 3] = 255;
    }

    if (usedWindowInThisLine) {
      this.windowLine++;
    }
  }

  renderSprites() {
    let use8x16 = false;
    if ((this.mmu.readByte(this.lcdc) >> 2) & 1) use8x16 = true;

    const imageData = this.frameBuffer.data;
    let spritesRendered = 0;

    for (let sprite = 0; sprite < 40; sprite++) {
      if (spritesRendered == 10) break; // 10 sprites per line

      let index = (sprite * 4) & 0xff;
      let yPos = (this.mmu.readByte(0xfe00 + index) - 16) & 0xff;
      let xPos = (this.mmu.readByte(0xfe00 + ((index + 1) & 0xff)) - 8) & 0xff;
      let tileLocation = this.mmu.readByte(0xfe00 + ((index + 2) & 0xff));
      let attributes = this.mmu.readByte(0xfe00 + ((index + 3) & 0xff));

      let yFlip = (attributes >> 6) & 1;
      let xFlip = (attributes >> 5) & 1;

      let ly = this.mmu.readByte(this.ly);

      let ysize = 8;
      if (use8x16) ysize = 16;

      if (ly < yPos || ly >= yPos + ysize) continue;

      let line = ly - yPos;

      if (yFlip) line = ysize - 1 - line;

      line *= 2;
      let dataAddress = (0x8000 + tileLocation * 16 + line) & 0xffff;
      let data1 = this.mmu.readByte(dataAddress);
      let data2 = this.mmu.readByte((dataAddress + 1) & 0xffff);

      for (let tilePixel = 7; tilePixel >= 0; tilePixel--) {
        let colourbit = tilePixel;

        if (xFlip) {
          colourbit -= 7;
          colourbit *= -1;
        }

        let colourNum = (data2 >> colourbit) & 1;
        colourNum <<= 1;
        colourNum |= (data1 >> colourbit) & 1;

        if (colourNum == WHITE) continue;

        let colourAddress = (attributes >> 4) & 1 ? this.obp1 : this.obp0;
        let col = this.getColour(colourNum, colourAddress);

        let red = 0;
        let green = 0;
        let blue = 0;

        switch (col) {
          case WHITE:
            red = 255;
            green = 255;
            blue = 255;
            break;
          case LIGHT_GRAY:
            red = 0xcc;
            green = 0xcc;
            blue = 0xcc;
            break;
          case DARK_GRAY:
            red = 0x77;
            green = 0x77;
            blue = 0x77;
            break;
        }

        let xPix = 0 - tilePixel;
        xPix += 7;

        let pixel = xPos + xPix;

        if (ly < 0 || ly > 143 || pixel < 0 || pixel > 159) {
          continue;
        }

        const pixelIndex = (ly * this.screen.width + pixel) * 4;
        const isBgWhite = imageData[pixelIndex] == 255;
        const spritePriority = !testBit(attributes, 7);

        // Render sprite over BG if sprite priority enabled & BG not white
        if (spritePriority || isBgWhite) {
          imageData[pixelIndex] = red; // R
          imageData[pixelIndex + 1] = green; // G
          imageData[pixelIndex + 2] = blue;
          imageData[pixelIndex + 3] = 255; // Opacity
        }
      }
      spritesRendered++;
    }
  }

  getColour(colourNum, paletteAddr) {
    let resultColour = WHITE;
    let palette = this.mmu.readByte(paletteAddr);
    let hi = 0;
    let lo = 0;

    switch (colourNum) {
      case 0:
        hi = 1;
        lo = 0;
        break;
      case 1:
        hi = 3;
        lo = 2;
        break;
      case 2:
        hi = 5;
        lo = 4;
        break;
      case 3:
        hi = 7;
        lo = 6;
        break;
    }

    // use the palette to get the colour
    let colour = 0;

    colour = ((palette >> hi) & 1) << 1;
    colour |= (palette >> lo) & 1;

    // convert the game colour to emulator colour
    switch (colour) {
      case 0:
        resultColour = WHITE;
        break;
      case 1:
        resultColour = LIGHT_GRAY;
        break;
      case 2:
        resultColour = DARK_GRAY;
        break;
      case 3:
        resultColour = BLACK;
        break;
    }

    return resultColour;
  }

  isLCDEnabled() {
    return testBit(this.mmu.readByte(this.lcdc), 7);
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
    for (let i = 0; i < 160; i++)
      this.mmu.writeByte(0xfe00 + i, this.mmu.readByte(address + i));
  }
}

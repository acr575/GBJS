import { getSignedByte, resetBit, setBit, testBit } from "./GameBoyUtils.js";

const WHITE = 0;
const LIGHT_GRAY = 1;
const DARK_GRAY = 2;
const BLACK = 3;

export class PPU {
  #frameBuffer;
  #line;
  #windowLine;
  #clock;
  #mode;
  #needsPresent = false;

  
  #lcdc = 0xff40; // LCD Control
  #stat = 0xff41; // LCD status
  #scy = 0xff42; // Background viewport Y position
  #scx = 0xff43; // Background viewport X position
  #ly = 0xff44; // LCD Y coordinate [Read-only]
  #lyc = 0xff45; // LY compare
  #dma = 0xff46; // OAM DMA source address & start
  #bgp = 0xff47; // BG palette data
  #obp0 = 0xff48;
  #obp1 = 0xff49;
  #wy = 0xff4a;
  #wx = 0xff4b;

  constructor(cpu) {
    this.cpu = cpu;
    this.mmu = cpu.mmu;

    this.screen = document.getElementById("screen");
    this.context = this.screen.getContext("2d", { willReadFrequently: true });
    this.#frameBuffer = this.context.createImageData(
      this.screen.width,
      this.screen.height
    );

    this.oam = new Uint8Array(160); // OAM   160 B.   Area FE00 - FE9F
    this.vram = new Uint8Array(8192); //VRAM   8 KiB.   Area 8000 - 9FFF

    this.#line = 0;
    this.#windowLine = 0;
    this.#clock = 0;
    this.#mode = 2;

    this.palettes = {
      classic: {
        white: { r: 155, g: 188, b: 15 },
        lightGray: { r: 139, g: 172, b: 15 },
        darkGray: { r: 48, g: 98, b: 48 },
        black: { r: 15, g: 56, b: 15 },
      },

      grays: {
        white: { r: 255, g: 255, b: 255 },
        lightGray: { r: 0xcc, g: 0xcc, b: 0xcc },
        darkGray: { r: 0x77, g: 0x77, b: 0x77 },
        black: { r: 0, g: 0, b: 0 },
      },
    };
    this.selectedPalette = this.palettes.grays;
  }

  updateGraphics(cycles) {
    this.#clock += cycles;
    let vBlank = false;

    if (!this.#isLCDEnabled()) {
      this.#setMode(0);
      this.#line = 0;
      this.#windowLine = 0;
      this.#clock = 0;
      this.#setLY(0);
      return false;
    }

    switch (this.#mode) {
      case 0: // HBLANK
        if (this.#clock >= 204) {
          this.#clock -= 204;
          this.#line++;
          this.#updateLY();
          if (this.#line == 144) {
            // Reached VBLANK
            this.#setMode(1);
            vBlank = true;
            this.cpu.requestInterrupt(0);
          } else {
            this.#setMode(2);
          }
        }
        break;

      case 1: // VBLANK
        if (this.#clock >= 456) {
          this.#clock -= 456;
          this.#line++;
          if (this.#line > 153) {
            this.#line = 0;
            this.#windowLine = 0;
            this.#setMode(2);
          }
          this.#updateLY();
        }
        break;

      case 2: // SCANLINE OAM
        if (this.#clock >= 80) {
          this.#clock -= 80;
          this.#setMode(3);
        }
        break;

      case 3: // SCANLINE VRAM
        if (this.#clock >= 172) {
          this.#clock -= 172;
          this.#drawScanLine();
          this.#setMode(0);
        }
        break;
    }

    return vBlank;
  }

  // Scanlines paint the off-screen buffer. Upload it once per frame.
  present() {
    if (!this.#needsPresent) return;
    this.context.putImageData(this.#frameBuffer, 0, 0);
    this.#needsPresent = false;
  }

  #updateLY() {
    this.#setLY(this.#line);
    let statVal = this.mmu.readByte(this.#stat);
    if (this.cpu.mmu.readByte(this.#ly) == this.cpu.mmu.readByte(this.#lyc)) {
      // Set stat bit 2
      let newStat = setBit(statVal, 2);
      this.cpu.mmu.writeByte(this.#stat, newStat);

      // Interrupt if stat's bit 6 is set
      if (testBit(statVal, 6)) this.cpu.requestInterrupt(1);
    } else {
      this.cpu.mmu.writeByte(this.#stat, resetBit(statVal, 2));
    }
  }

  #setMode(mode) {
    this.#mode = mode;
    let newStat = this.cpu.mmu.readByte(this.#stat);
    newStat &= 0b11111100; // Reset bits 0 & 1
    newStat |= mode; // Set 0 & 1 bits to mode
    this.cpu.mmu.writeByte(this.#stat, newStat);

    // Interrupt if allowed
    if (mode < 3 && testBit(newStat, 3 + mode)) this.cpu.requestInterrupt(1);
  }

  #drawScanLine() {
    let lcdc = this.mmu.readByte(0xff40);
    if (!testBit(lcdc, 7)) return;

    const renderBGWin = testBit(lcdc, 0);
    const renderSprites = testBit(lcdc, 1);
    if (renderBGWin || renderSprites) {
      if (renderBGWin) this.#renderBGWin();
      if (renderSprites) this.#renderSprites();
      this.#needsPresent = true;
    }
  }

  #renderBGWin() {
    let tileData = 0;
    let unsigned = true;

    const scrollY = this.mmu.readByte(this.#scy);
    const scrollX = this.mmu.readByte(this.#scx);
    const windowY = this.mmu.readByte(this.#wy);
    const windowX = this.mmu.readByte(this.#wx) - 7;

    const lcdc = this.mmu.readByte(this.#lcdc);
    const ly = this.mmu.readByte(this.#ly);

    if (ly == 0) this.#windowLine = 0;

    if (testBit(lcdc, 4)) {
      tileData = 0x8000;
      unsigned = true;
    } else {
      tileData = 0x8800;
      unsigned = false;
    }

    const windowEnabled = testBit(lcdc, 5);
    const imageData = this.#frameBuffer.data;

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

      const yPos = useWindow ? this.#windowLine & 0xff : (scrollY + ly) & 0xff;

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

      const { r: red, g: green, b: blue } = this.#getColour(colourNum, this.#bgp);

      if (ly < 0 || ly > 143 || pixel < 0 || pixel > 159) continue;

      const pixelIndex = (ly * this.screen.width + pixel) * 4;
      imageData[pixelIndex] = red;
      imageData[pixelIndex + 1] = green;
      imageData[pixelIndex + 2] = blue;
      imageData[pixelIndex + 3] = 255;
    }

    if (usedWindowInThisLine) this.#windowLine++;
  }

  #renderSprites() {
    const use8x16 = ((this.mmu.readByte(this.#lcdc) >> 2) & 1) == 1;
    const ly = this.mmu.readByte(this.#ly);
    const imageData = this.#frameBuffer.data;
    const ysize = use8x16 ? 16 : 8;

    // BGP colour 0, sampled before any sprite. Both built-in palettes map
    // that shade to white (255 gray, 155 green). A sprite with the
    // BG-priority bit only shows through this colour.
    const bgIsColor0 = [];
    for (let pixel = 0; pixel < 160; pixel++) {
      const red = imageData[(ly * this.screen.width + pixel) * 4];
      bgIsColor0[pixel] = red == 255 || red == 155;
    }

    // First 10 sprites that intersect this line, in OAM order.
    const sprites = [];
    for (let sprite = 0; sprite < 40; sprite++) {
      if (sprites.length == 10) break;

      const index = (sprite * 4) & 0xff;
      const yPos = (this.mmu.readByte(0xfe00 + index) - 16) & 0xff;
      const xPos = (this.mmu.readByte(0xfe00 + ((index + 1) & 0xff)) - 8) & 0xff;
      let tileLocation = this.mmu.readByte(0xfe00 + ((index + 2) & 0xff));
      const attributes = this.mmu.readByte(0xfe00 + ((index + 3) & 0xff));

      if (ly < yPos || ly >= yPos + ysize) continue;

      // 8x16: bit 0 of the tile index is ignored. The top tile is N & 0xFE
      // and the bottom tile is the next one, including when the sprite is flipped.
      if (use8x16) tileLocation &= 0xfe;

      let line = ly - yPos;
      if ((attributes >> 6) & 1) line = ysize - 1 - line;
      line *= 2;

      const dataAddress = (0x8000 + tileLocation * 16 + line) & 0xffff;
      sprites.push({
        xPos: xPos,
        attributes: attributes,
        xFlip: (attributes >> 5) & 1,
        data1: this.mmu.readByte(dataAddress),
        data2: this.mmu.readByte((dataAddress + 1) & 0xffff),
      });
    }

    for (let pixel = 0; pixel < 160; pixel++) {
      // Lowest X wins. The same X keeps the earliest OAM entry, because
      // sprites are visited in OAM order and a tie does not replace it.
      let chosen = null;

      for (let i = 0; i < sprites.length; i++) {
        const sprite = sprites[i];
        const offset = pixel - sprite.xPos;
        if (offset < 0 || offset > 7) continue;
        if (chosen && sprite.xPos >= chosen.sprite.xPos) continue;

        let colourbit = 7 - offset;
        if (sprite.xFlip) colourbit = offset;

        let colourNum = (sprite.data2 >> colourbit) & 1;
        colourNum <<= 1;
        colourNum |= (sprite.data1 >> colourbit) & 1;
        // Sprite colour 0 is transparent, before the palette is applied.
        if (colourNum == WHITE) continue;

        chosen = { sprite: sprite, colourNum: colourNum };
      }

      if (!chosen || ly < 0 || ly > 143) continue;

      // Bit 7 hides the sprite where the background colour is not 0.
      // A sprite that loses this test still covers the ones behind it.
      if ((chosen.sprite.attributes >> 7) & 1 && !bgIsColor0[pixel]) continue;

      const colourAddress =
        (chosen.sprite.attributes >> 4) & 1 ? this.#obp1 : this.#obp0;
      const {
        r: red,
        g: green,
        b: blue,
      } = this.#getColour(chosen.colourNum, colourAddress);

      const pixelIndex = (ly * this.screen.width + pixel) * 4;
      imageData[pixelIndex] = red;
      imageData[pixelIndex + 1] = green;
      imageData[pixelIndex + 2] = blue;
      imageData[pixelIndex + 3] = 255;
    }
  }

  #getColour(colourNum, paletteAddr) {
    let resultColour = this.selectedPalette.white;
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

    // Use the palette to get the colour
    let colour = 0;

    colour = ((palette >> hi) & 1) << 1;
    colour |= (palette >> lo) & 1;

    // Convert the game colour to emulator colour
    switch (colour) {
      case WHITE:
        resultColour = this.selectedPalette.white;
        break;
      case LIGHT_GRAY:
        resultColour = this.selectedPalette.lightGray;
        break;
      case DARK_GRAY:
        resultColour = this.selectedPalette.darkGray;
        break;
      case BLACK:
        resultColour = this.selectedPalette.black;
        break;
    }

    return resultColour;
  }

  #isLCDEnabled() {
    return testBit(this.mmu.readByte(this.#lcdc), 7);
  }

  writeByte(addr, val) {
    switch (addr & 0xf) {
      // LY is set to 0 when game tries to write it
      case 0x4:
        this.#setLY(0);
        break;

      // Writing to DMA register executes DMA transfer
      case 0x6:
        this.#doDMATransfer(val);
        break;

      default:
        this.mmu.ioRegs[addr] = val;
    }
  }

  #setLY(val) {
    this.mmu.ioRegs[this.#ly & 0x7f] = val;
  }

  #doDMATransfer(data) {
    const address = data << 8; // source address is data * 100
    for (let i = 0; i < 160; i++)
      this.mmu.writeByte(0xfe00 + i, this.mmu.readByte(address + i));
  }

  updatePalette(palette) {
    if (palette == "green") {
      this.selectedPalette = this.palettes.classic;
    } else this.selectedPalette = this.palettes.grays;
  }
}

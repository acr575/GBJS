const WHITE = 0;
const LIGHT_GRAY = 1;
const DARK_GRAY = 2;
const BLACK = 3;

export class GPU {
  constructor(cpu) {
    this.cpu = cpu;
    this.mmu = cpu.mmu;

    this.screen = document.getElementById("screen");
    this.context = this.screen.getContext("2d", { willReadFrequently: true });

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
    var statVal = this.mmu.readByte(this.stat);
    if (this.cpu.mmu.readByte(this.ly) == this.cpu.mmu.readByte(this.lyc)) {
      this.cpu.mmu.writeByte(this.stat, statVal | (1 << 2));
      if (statVal & (1 << 6)) {
        this.cpu.requestInterrupt(1);
      }
    } else {
      this.cpu.mmu.writeByte(this.stat, statVal & (0xff - (1 << 2)));
    }
  }

  setMode(mode) {
    this.mode = mode;
    var newStat = this.cpu.mmu.readByte(this.stat);
    newStat &= 0xfc;
    newStat |= mode;
    this.cpu.mmu.writeByte(this.stat, newStat);

    if (mode < 3) {
      if (newStat & (1 << (3 + mode))) {
        this.cpu.requestInterrupt(1);
      }
    }
  }

  drawScanLine() {
    let lcdc = this.mmu.readByte(0xff40);
    if (!(lcdc >> 7) & 1) return;
    if (lcdc & 1) this.renderTiles();
    if ((lcdc >> 1) & 1) this.renderSprites();
  }

  renderTiles() {
    let tileData = 0;
    let backgroundMemory = 0;
    let unsigned = true;

    // where to draw the visual area and the window
    let scrollY = this.mmu.readByte(this.scy);
    let scrollX = this.mmu.readByte(this.scx);
    let windowY = this.mmu.readByte(this.wy);
    let windowX = (this.mmu.readByte(this.wx) - 7) & 0xff;

    let usingWindow = false;
    let lcdc = this.mmu.readByte(this.lcdc);

    // is the window enabled?
    if ((lcdc >> 5) & 1) {
      // is the current scanline we're drawing
      // within the windows Y pos?,
      if (
        windowY > 0 &&
        windowY <= 143 &&
        windowY <= this.mmu.readByte(this.ly) &&
        windowX >= 0 &&
        windowX <= 166
      ) {
        usingWindow = true;
        this.windowLine++;
      }
    }

    // which tile data are we using?
    if ((lcdc >> 4) & 1) {
      tileData = 0x8000;
    } else {
      // IMPORTANT: This memory region uses signed bytes as tile identifiers
      tileData = 0x8800;
      unsigned = false;
    }

    // which background mem?
    if (!usingWindow) {
      if ((lcdc >> 3) & 1) backgroundMemory = 0x9c00;
      else backgroundMemory = 0x9800;
    } else {
      // which window memory?
      if ((lcdc >> 6) & 1) backgroundMemory = 0x9c00;
      else backgroundMemory = 0x9800;
    }

    let yPos = 0;

    // yPos is used to calculate which of 32 vertical tiles the
    // current scanline is drawing
    if (!usingWindow) yPos = (scrollY + this.mmu.readByte(this.ly)) & 0xff;
    else {
      yPos = this.mmu.readByte(this.ly) - windowY;
    }

    // which of the 8 vertical pixels of the current
    // tile is the scanline on?
    let tileRow = (Math.floor(yPos / 8) * 32) & 0xffff;

    const imageData = this.context.getImageData(
      0,
      0,
      this.screen.width,
      this.screen.height
    );

    // time to start drawing the 160 horizontal pixels
    // for this scanline
    for (let pixel = 0; pixel < 160; pixel++) {
      let xPos = (pixel + scrollX) & 0xff;

      // translate the current x pos to window space if necessary
      if (usingWindow) {
        if (pixel >= windowX) {
          xPos = pixel - windowX;
        }
      }

      // which of the 32 horizontal tiles does this xPos fall within?
      let tileCol = Math.floor(xPos / 8);
      let tileNum;

      // get the tile identity number. Remember it can be signed
      // or unsigned
      let tileAddrss = (backgroundMemory + tileRow + tileCol) & 0xffff;
      if (unsigned) tileNum = this.mmu.readByte(tileAddrss);
      else tileNum = this.cpu.getSignedValue(this.mmu.readByte(tileAddrss));

      // deduce where this tile identifier is in memory. Remember i
      // shown this algorithm earlier
      let tileLocation = tileData;

      if (unsigned)
        tileLocation =
          (tileLocation + this.cpu.getSignedWord(tileNum * 16)) & 0xffff;
      else
        tileLocation =
          (tileLocation + this.cpu.getSignedWord((tileNum + 128) * 16)) &
          0xffff;

      // find the correct vertical line we're on of the
      // tile to get the tile data
      // from in memory
      let line = yPos % 8 & 0xff;
      line = (line * 2) & 0xff; // each vertical line takes up two bytes of memory
      let data1 = this.mmu.readByte((tileLocation + line) & 0xffff);
      let data2 = this.mmu.readByte((tileLocation + line + 1) & 0xffff);

      // console.log(tileAddrss.toString(16), tileRow, tileCol, tileNum, tileLocation.toString(16), line, data1, data2);

      // pixel 0 in the tile is it 7 of data 1 and data2.
      // Pixel 1 is bit 6 etc..
      let colourBit = xPos % 8;
      colourBit -= 7;
      colourBit *= -1;

      // combine data 2 and data 1 to get the colour id for this pixel
      // in the tile
      let colourNum = (data2 >> colourBit) & 1;
      colourNum <<= 1;
      colourNum |= (data1 >> colourBit) & 1;

      // now we have the colour id get the actual
      // colour from palette BGP
      let col = this.getColour(colourNum, this.bgp);
      let red = 0;
      let green = 0;
      let blue = 0;

      // setup the RGB values
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

        case BLACK:
          red = 0;
          green = 0;
          blue = 0;
          break;
      }

      let finaly = this.mmu.readByte(this.ly);

      // safety check to make sure what im about
      // to set is int the 160x144 bounds
      if (finaly < 0 || finaly > 143 || pixel < 0 || pixel > 159) {
        continue;
      }

      const pixelIndex = (finaly * this.screen.width + pixel) * 4;

      imageData.data[pixelIndex] = red; // R
      imageData.data[pixelIndex + 1] = green; // G
      imageData.data[pixelIndex + 2] = blue;
      imageData.data[pixelIndex + 3] = 255; // Opacity
    }

    this.context.putImageData(imageData, 0, 0);
  }

  renderSprites() {
    let use8x16 = false;
    if ((this.mmu.readByte(this.lcdc) >> 2) & 1) use8x16 = true;

    const imageData = this.context.getImageData(
      0,
      0,
      this.screen.width,
      this.screen.height
    );

    for (let sprite = 0; sprite < 40; sprite++) {
      // sprite occupies 4 bytes in the sprite attributes table
      let index = (sprite * 4) & 0xff;
      let yPos = (this.mmu.readByte(0xfe00 + index) - 16) & 0xff;
      let xPos = (this.mmu.readByte(0xfe00 + ((index + 1) & 0xff)) - 8) & 0xff;
      let tileLocation = this.mmu.readByte(0xfe00 + ((index + 2) & 0xff));
      let attributes = this.mmu.readByte(0xfe00 + ((index + 3) & 0xff));

      // console.log(`Sprite ${sprite}: X=${xPos}, Y=${yPos}, Tile=${tileLocation.toString(16)}, Attributes=${attributes.toString(2)}`);

      let yFlip = (attributes >> 6) & 1;
      let xFlip = (attributes >> 5) & 1;

      let scanline = this.mmu.readByte(0xff44);

      let ysize = 8;
      if (use8x16) ysize = 16;

      // does this sprite intercept with the scanline?
      if (scanline >= yPos && scanline < yPos + ysize) {
        let line = scanline - yPos;
        // console.log(`Line: ${line}`);

        // read the sprite in backwards in the y axis
        if (yFlip) {
          line = ysize - 1 - line;
        }

        line *= 2; // same as for tiles
        let dataAddress = (0x8000 + tileLocation * 16 + line) & 0xffff;
        let data1 = this.mmu.readByte(dataAddress);
        let data2 = this.mmu.readByte((dataAddress + 1) & 0xffff);

        // its easier to read in from right to left as pixel 0 is
        // bit 7 in the colour data, pixel 1 is bit 6 etc...
        for (let tilePixel = 7; tilePixel >= 0; tilePixel--) {
          let colourbit = tilePixel;
          // read the sprite in backwards for the x axis
          if (xFlip) {
            colourbit -= 7;
            colourbit *= -1;
          }

          // the rest is the same as for tiles
          let colourNum = (data2 >> colourbit) & 1;
          colourNum <<= 1;
          colourNum |= (data1 >> colourbit) & 1;

          let colourAddress = (attributes >> 4) & 1 ? this.obp1 : this.obp0;
          let col = this.getColour(colourNum, colourAddress);

          // white is transparent for sprites.
          if (col == WHITE) continue;

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

          // sanity check
          if (scanline < 0 || scanline > 143 || pixel < 0 || pixel > 159) {
            continue;
          }

          const pixelIndex = (scanline * this.screen.width + pixel) * 4;

          imageData.data[pixelIndex] = red; // R
          imageData.data[pixelIndex + 1] = green; // G
          imageData.data[pixelIndex + 2] = blue;
          imageData.data[pixelIndex + 3] = 255; // Opacity
        }
      }
    }

    this.context.putImageData(imageData, 0, 0);
  }

  getColour(colourNum, paletteAddress) {
    let resultColour = WHITE;
    let palette = this.mmu.readByte(paletteAddress);
    let hi = 0;
    let lo = 0;

    // which bits of the colour palette does the colour id map to?
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
    for (let i = 0; i < 160; i++)
      this.mmu.writeByte(0xfe00 + i, this.mmu.readByte(address + i));
  }
}

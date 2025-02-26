const WHITE = 0;
const LIGHT_GRAY = 1;
const DARK_GRAY = 2;
const BLACK = 3;

export class GPU {
  constructor(cpu) {
    this.cpu = cpu;
    this.mmu = cpu.mmu;

    this.screen = document.getElementById("screen");

    this.oam = new Uint8Array(160); // OAM   160 B.   Area FE00 - FE9F
    this.vram = new Uint8Array(8192)//VRAM   8 KiB.   Area 8000 - 9FFF

    this.scanlineCounter = 456; // Clock cycles to draw a scanline

    this.lcdc = 0xff40; // LCD Control
    this.stat = 0xff41; // LCD status
    this.scy = 0xff42; // Background viewport Y position
    this.scx = 0xff43; // Background viewport X position
    this.ly = 0xff44; // LCD Y coordinate [Read-only]
    this.lyc = 0xff45; // LY compare
    this.dma = 0xff46; // OAM DMA source address & start
    this.bgp = 0xff47; // BG palette data
    this.wy = 0xff4a;
    this.wx = 0xff4b;
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
      else if (currentLine < 144) this.drawScanLine();
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

  drawScanLine() {
    let lcdc = this.mmu.readByte(0xff40);
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
    let windowX = this.mmu.readByte(this.wx) - 7;

    let usingWindow = false;
    let lcdc = this.mmu.readByte(this.lcdc);

    // is the window enabled?
    if ((lcdc >> 5) & 1) {
      // is the current scanline we're drawing
      // within the windows Y pos?,
      if (windowY <= this.mmu.readByte(this.ly)) usingWindow = true;
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
    if (!usingWindow) yPos = scrollY + this.mmu.readByte(this.ly);
    else {
      yPos = this.mmu.readByte(this.ly) - windowY;
    }

    // which of the 8 vertical pixels of the current
    // tile is the scanline on?
    let tileRow = Math.floor(yPos / 8) * 32;

    const context = this.screen.getContext("2d");
    const imageData = context.getImageData(
      0,
      0,
      this.screen.width,
      this.screen.height
    );

    // time to start drawing the 160 horizontal pixels
    // for this scanline
    for (let pixel = 0; pixel < 160; pixel++) {
      let xPos = pixel + scrollX;

      // translate the current x pos to window space if necessary
      if (usingWindow) {
        if (pixel >= windowX) {
          xPos = pixel - windowX;
        }
      }

      // which of the 32 horizontal tiles does this xPos fall within?
      let tileCol = Math.floor(xPos / 8) & 0xffff;
      let tileNum;

      // get the tile identity number. Remember it can be signed
      // or unsigned
      let tileAddrss = backgroundMemory + tileRow + tileCol;
      if (unsigned) tileNum = this.mmu.readByte(tileAddrss);
      else tileNum = this.mmu.readByte(tileAddrss);

      // deduce where this tile identifier is in memory. Remember i
      // shown this algorithm earlier
      let tileLocation = tileData;

      if (unsigned) tileLocation += tileNum * 16;
      else tileLocation += (tileNum + 128) * 16;

      // find the correct vertical line we're on of the
      // tile to get the tile data
      // from in memory
      let line = yPos % 8;
      line *= 2; // each vertical line takes up two bytes of memory
      let data1 = this.mmu.readByte(tileLocation + line);
      let data2 = this.mmu.readByte(tileLocation + line + 1);

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
      console.log(imageData.data[pixelIndex], imageData.data[pixelIndex + 1], imageData.data[pixelIndex + 2]);
    }

    context.putImageData(imageData, 0, 0);
  }

  renderSprites() {
    let use8x16 = false;
    if ((this.mmu.readByte(this.lcdc) >> 2) & 1) use8x16 = true;

    const context = this.screen.getContext("2d");
    const imageData = context.getImageData(
      0,
      0,
      this.screen.width,
      this.screen.height
    );

    for (let sprite = 0; sprite < 40; sprite++) {
      // sprite occupies 4 bytes in the sprite attributes table
      let index = sprite * 4;
      let yPos = this.mmu.readByte(0xfe00 + index) - 16;
      let xPos = this.mmu.readByte(0xfe00 + index + 1) - 8;
      let tileLocation = this.mmu.readByte(0xfe00 + index + 2);
      let attributes = this.mmu.readByte(0xfe00 + index + 3);

      let yFlip = (attributes >> 6) & 1;
      let xFlip = (attributes >> 5) & 1;

      let scanline = this.mmu.readByte(0xff44);

      let ysize = 8;
      if (use8x16) ysize = 16;

      // does this sprite intercept with the scanline?
      if (scanline >= yPos && scanline < yPos + ysize) {
        let line = scanline - yPos;

        // read the sprite in backwards in the y axis
        if (yFlip) {
          line -= ysize;
          line *= -1;
        }

        line *= 2; // same as for tiles
        let dataAddress = 0x8000 + tileLocation * 16 + line;
        let data1 = this.mmu.readByte(dataAddress);
        let data2 = this.mmu.readByte(dataAddress + 1);

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

          let colourAddress = (attributes >> 4) & 1 ? 0xff49 : 0xff48;
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

    context.putImageData(imageData, 0, 0);
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

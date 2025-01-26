export class MMU {
  constructor(cpu, gpu) {
    this.cpu = cpu;
    this.gpu = gpu;

    this.inbios = 1; // Flag indicating BIOS is mapped

    // Memory regions
    this.bios = new Uint8Array(256); //  BIOS.            256    B. Area 0000-00FF
    this.rom = new Uint8Array(32768); // ROM (all banks).  32  KiB. Area 0000-7FFF
    this.wram = new Uint8Array(8192); // Work RAM.          8  KiB. Area C000-DFFF
    this.eram = new Uint8Array(8192); // External RAM.      8  KiB. Area A000-BFFF
    this.hram = new Uint8Array(127); //  High RAM.        127    B. Area FF80-FFFE
  }

  // Function to load a program into the memory
  async load(file) {
    console.log("Loading program: " + file.name);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        console.error("Error reading file.");
        reject("File read error");
      };

      reader.readAsArrayBuffer(file);

      reader.onload = () => {
        const arrayBuffer = reader.result;
        const byteArray = new Uint8Array(arrayBuffer);

        if (!byteArray) {
          console.error(
            "Error loading program. The byte array loaded is null."
          );
          reject("Error: Loaded byte array is null");
          return;
        }

        const lSize = byteArray.length;

        // Load bytes
        for (let i = 0; i < lSize; ++i) {
          this.rom[i] = byteArray[i];
        }
        console.log("Program loaded successfully.");
        resolve();
      };
    });
  }

  readByte(addr) {
    switch (addr & 0xf000) {
      // BIOS or ROM0
      case 0x0000:
        if (this.inbios) {
          if (addr < 0x0100) return this.bios[addr];
          else if (this.cpu.pc == 0x0100) this.inbios = 0;
        }

        return this.rom[addr];

      // ROM
      case 0x1000:
      case 0x2000:
      case 0x3000:
      case 0x4000:
      case 0x5000:
      case 0x6000:
      case 0x7000:
        return this.rom[addr];

      // Graphics: VRAM
      case 0x8000:
      case 0x9000:
        return this.gpu.vram[addr & 0x1fff];

      // External RAM
      case 0xa000:
      case 0xb000:
        return this.eram[addr & 0x1fff];

      // Working RAM
      case 0xc000:
      case 0xd000:
      case 0xe000: // Echo RAM
        return this.wram[addr & 0x1fff];

      // OAM, Echo RAM, I/O, High RAM
      case 0xf000:
        switch (addr & 0x0f00) {
          // Echo RAM
          case 0x000:
          case 0x100:
          case 0x200:
          case 0x300:
          case 0x400:
          case 0x500:
          case 0x600:
          case 0x700:
          case 0x800:
          case 0x900:
          case 0xa00:
          case 0xb00:
          case 0xc00:
          case 0xd00:
            return this.wram[addr & 0x1fff];

          // OAM
          case 0xe00:
            // FEA0-FEFF: Not usable area
            if (addr < 0xfea0) return this.gpu.oam[addr & 0xff];
            else return 0;

          // High RAM or I/O
          case 0xf00:
            if (addr >= 0xff80) {
              return this.hram[addr & 0x7f];
            } else {
              // TODO: I/O control handling
              return 0;
            }
        }
    }
  }

  readWord(addr) {
    return this.readByte(addr) + (this.readByte(addr + 1) << 8);
  }

  writeByte(addr, val) {
    switch (addr & 0xf000) {
      // ROM bank 0
      case 0x0000:
        if (this.inbios && addr < 0x0100) return;
      // fall through
      case 0x1000:
      case 0x2000:
      case 0x3000:
        break;

      // ROM bank 1
      case 0x4000:
      case 0x5000:
      case 0x6000:
      case 0x7000:
        break;

      // VRAM
      case 0x8000:
      case 0x9000:
        this.gpu.vram[addr & 0x1fff] = val;
        this.gpu.updateTile(addr & 0x1fff, val);
        break;

      // External RAM
      case 0xa000:
      case 0xb000:
        this.eram[addr & 0x1fff] = val;
        break;

      // Work RAM and echo
      case 0xc000:
      case 0xd000:
      case 0xe000:
        this.wram[addr & 0x1fff] = val;
        break;

      // Everything else
      case 0xf000:
        switch (addr & 0x0f00) {
          // Echo RAM
          case 0x000:
          case 0x100:
          case 0x200:
          case 0x300:
          case 0x400:
          case 0x500:
          case 0x600:
          case 0x700:
          case 0x800:
          case 0x900:
          case 0xa00:
          case 0xb00:
          case 0xc00:
          case 0xd00:
            this.wram[addr & 0x1fff] = val;
            break;

          // OAM
          case 0xe00:
            if ((addr & 0xff) < 0xa0) this.gpu.oam[addr & 0xff] = val;
            this.gpu.updateOAM(addr, val);
            break;

          // High RAM, I/O
          case 0xf00:
            if (addr > 0xff7f) {
              this.hram[addr & 0x7f] = val;
            } else
              switch (addr & 0xf0) {
              }
        }

        break;
    }
  }

  writeWord(addr, val) {
    this.writeByte(addr, val & 0xff); // Low byte
    this.writeByte(addr + 1, val >> 8); // High byte
  }
}

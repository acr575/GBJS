export class MMU {
  constructor(cpu) {
    this.cpu = cpu;

    // this.inbios = 1; // Flag indicating BIOS is mapped

    // Memory regions
    // this.bios = new Uint8Array(256); //  BIOS.         256    B. Area 0000-00FF
    this.rom = new Uint8Array(32768); // ROM (Bank 0-1).   32  KiB. Area 0000-7FFF
    this.eram = new Uint8Array(8192); // External RAM.      8  KiB. Area A000-BFFF
    this.wram = new Uint8Array(8192); // Work RAM.          8  KiB. Area C000-DFFF
    this.ioRegs = new Uint8Array(128); //I/O Registers.   128    B. Area FF00-FF7F
    this.hram = new Uint8Array(127); //  High RAM.        127    B. Area FF80-FFFE
    this.ie = 0; //                      IE Flag            1    B. Addr FFFF
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

        // Check if cartridge fits rom. Change later when MBC's are implemented
        if (lSize > this.rom.length)
          throw new Error("Cartridge too big for memory");

        // Load bytes
        this.rom.set(byteArray.subarray(0, this.rom.length));

        console.log("Program loaded successfully.");
        resolve(lSize);
      };
    });
  }

  readByte(addr) {
    switch (addr & 0xf000) {
      // BIOS or ROM0
      case 0x0000:
        /* Ignoring BIOS for now */
        // if (this.inbios) {
        //   if (addr < 0x0100) return this.bios[addr];
        //   else if (this.cpu.pc == 0x0100) this.inbios = 0;
        // }

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
        return this.cpu.gpu.vram[addr & 0x1fff];

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
            if (addr < 0xfea0) return this.cpu.gpu.oam[addr & 0xff];
          // else return 0;

          // High RAM or I/O
          case 0xf00:
            if (addr >= 0xff80) {
              return addr == 0xffff ? this.ie : this.hram[addr & 0x7f];
            } else {
              // TODO: I/O control handling
              return this.ioRegs[addr & 0x7f];
            }
        }
    }
  }

  readWord(addr) {
    return this.readByte(addr) + (this.readByte(addr + 1) << 8);
  }

  writeByte(addr, val) {
    switch (addr & 0xf000) {
      // ROM bank 0-1: Cannot write
      case 0x0000:
      case 0x1000:
      case 0x2000:
      case 0x3000:
      case 0x4000:
      case 0x5000:
      case 0x6000:
      case 0x7000:
        break;

      // VRAM
      case 0x8000:
      case 0x9000:
        this.cpu.gpu.vram[addr & 0x1fff] = val;
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
          // Echo RAM (writes at Work RAM)
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
            // FEA0-FEFF: Not usable area
            if ((addr & 0xff) < 0xa0) this.cpu.gpu.oam[addr & 0xff] = val;
            break;

          // High RAM, I/O
          case 0xf00:
            if (addr > 0xff7f) {
              if (addr == 0xffff) this.ie = val & 0xff;
              else this.hram[addr & 0x7f] = val;
            } else
              switch (addr & 0x00f0) {
                case 0x00:
                  if (addr == 0xff07)
                    this.cpu.timer.writeTAC(val); // TAC register
                  else if (addr == 0xff04)
                    this.ioRegs[addr & 0x7f] = 0; // Reset DIV register
                  else if (addr == 0xff0f) this.updateIF(val); // IF register
                  else this.ioRegs[addr & 0x7f] = val;
                  break;

                // GPU registers
                case 0x40:
                case 0x50:
                case 0x60:
                case 0x70:
                  this.cpu.gpu.writeByte(addr & 0x7f, val);
                  break;
              }
            break;
        }
        break;
    }
  }

  writeWord(addr, val) {
    this.writeByte(addr, val & 0xff); // Low byte
    this.writeByte(addr + 1, val >> 8); // High byte
  }

  updateIF(val) {
    let currentIF = this.readByte(0xff0f);
    let newIF = currentIF | val; // Just set/clear the bit requested
    this.ioRegs[0xff0f & 0x7f] = newIF;
  }

  setupAddressInput() {
    const addressInput = document.getElementById("hexAddress");
    const memValue = document.getElementById("memValue");

    const updateMemValue = (addr) => {
      return addr !== undefined && !isNaN(addr) ? this.readByte(addr) : 0;
    };

    addressInput.addEventListener("input", function () {
      this.value = this.value.toUpperCase().replace(/[^0-9A-FX]/g, ""); // Hex. regex
      if (!this.value.startsWith("0X"))
        this.value = "0X" + this.value.replace(/^0X/, "");
      this.value = this.value.slice(0, 6);

      memValue.innerHTML =
        "0X" +
        updateMemValue(parseInt(this.value))
          .toString(16)
          .toUpperCase()
          .padStart(2, "0");
    });
  }
}

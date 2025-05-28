import { testBit } from "./GameBoyUtils.js";

export class MMU {
  constructor(cpu) {
    this.cpu = cpu;

    // this.inbios = 1; // Flag indicating BIOS is mapped

    // Memory regions
    // this.bios = new Uint8Array(256); //BIOS.            256    B.       Area 0000-00FF
    this.cartridge = new Uint8Array(); // Game cartridge   1.5  MiB. (max) Not mapped in GB memory
    this.eram = new Uint8Array(); //      External RAM       8  KiB./bank  Not mapped in GB memory
    this.wram = new Uint8Array(8192); //  Work RAM.          8  KiB.       Area C000-DFFF
    this.ioRegs = new Uint8Array(128); // I/O Registers.   128    B.       Area FF00-FF7F
    this.hram = new Uint8Array(127); //   High RAM.        127    B.       Area FF80-FFFE
    this.ie = 0; //                       IE Flag            1    B.       Addr FFFF

    // Memory banking mode. None by default
    this.MBC1 = false;
    this.MBC2 = false;

    this.currentRomBank = 1; // ROM bank loaded. 1 by default bc 0 is loaded always
    this.currentRamBank = 0; // RAM bank loaded
    this.isRamBankingEnabled = false;
    this.bankingAdvancedMode = false;
    this.CARTRIDGE_MAX_SIZE = 1572864; // 1.5 MiB
    this.RAM_BANK_SIZE = 0x2000; // 8 KiB
    this.ROM_BANK_SIZE = 0x4000; // 16 KiB
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

        const size = byteArray.length;

        // Check if cartridge fits rom. Change later when MBC's are implemented
        if (size > this.CARTRIDGE_MAX_SIZE)
          throw new Error("Cartridge too big for memory");

        // Load bytes into cartridge memory
        this.cartridge = new Uint8Array(size);
        this.cartridge.set(byteArray.subarray(0, this.cartridge.length));

        const cartridgeType = this.cartridge[0x147];
        const ramBanks = this.getRamBanksNumber(this.cartridge[0x149]);

        // Set memory banking mode
        if (cartridgeType >= 1 && cartridgeType <= 3) this.MBC1 = true;
        // else if (cartridgeType == 5 || cartridgeType == 6) this.MBC2 = true;
        else if (cartridgeType != 0) throw new Error("Unsupported MBC");

        // Initialize ram banks. 8KiB each bank
        this.eram = new Uint8Array(this.RAM_BANK_SIZE * ramBanks);

        console.log("Program loaded successfully.");
        resolve(size);
      };
    });
  }

  getRamBanksNumber(ramSizeCode) {
    switch (ramSizeCode) {
      case 0x2:
        return 1;

      case 0x3:
        return 4;

      case 0x4:
        return 16;

      case 0x5:
        return 8;

      default:
        return 0;
    }
  }

  readByte(addr) {
    // ROM Bank 00
    if (addr >= 0 && addr < 0x4000) return this.cartridge[addr];
    // Read from current loaded bank
    else if (addr >= 0x4000 && addr < 0x8000)
      return this.cartridge[
        (addr & 0x3fff) + this.currentRomBank * this.ROM_BANK_SIZE
      ];
    // VRAM
    else if (addr >= 0x8000 && addr < 0xa000)
      return this.cpu.gpu.vram[addr & 0x1fff];
    // ERAM
    else if (addr >= 0xa000 && addr < 0xc000)
      return this.eram[
        (addr & 0x1fff) + this.currentRamBank * this.RAM_BANK_SIZE
      ];
    // WRAM & ECHO RAM
    else if (addr >= 0xc000 && addr < 0xfe00) return this.wram[addr & 0x1fff];
    // OAM
    else if (addr >= 0xfe00 && addr < 0xfea0)
      return this.cpu.gpu.oam[addr & 0xff];
    // I/O Registers
    else if (addr >= 0xff00 && addr < 0xff80)
      return addr == 0xff00
        ? this.cpu.joypad.readJoypad()
        : this.ioRegs[addr & 0x7f];
    // HRAM
    else if (addr >= 0xff80 && addr < 0xffff) return this.hram[addr & 0x7f];

    // IE FLAG
    return this.ie;
  }

  readWord(addr) {
    return this.readByte(addr) + (this.readByte(addr + 1) << 8);
  }

  writeByte(addr, val) {
    // ROM
    if (addr >= 0 && addr < 0x8000) this.handleBankChange(addr, val);
    // VRAM
    else if (addr >= 0x8000 && addr < 0xa000)
      this.cpu.gpu.vram[addr & 0x1fff] = val;
    // ERAM
    else if (addr >= 0xa000 && addr < 0xc000 && this.isRamBankingEnabled)
      this.eram[(addr & 0x1fff) + this.currentRamBank * this.RAM_BANK_SIZE] =
        val;
    // WRAM & ECHO RAM
    else if (addr >= 0xc000 && addr < 0xfe00) this.wram[addr & 0x1fff] = val;
    // OAM
    else if (addr >= 0xfe00 && addr < 0xfea0)
      this.cpu.gpu.oam[addr & 0xff] = val;
    // I/O Registers
    else if (addr >= 0xff00 && addr < 0xff80) this.handleIOWrite(addr, val);
    // HRAM
    else if (addr >= 0xff80 && addr < 0xffff) this.hram[addr & 0x7f] = val;
    // IE FLAG
    else this.ie = val & 0xff;
  }

  writeWord(addr, val) {
    this.writeByte(addr, val & 0xff); // Low byte
    this.writeByte(addr + 1, val >> 8); // High byte
  }

  handleIOWrite(addr, val) {
    if (addr >= 0xff40 && addr < 0xff80)
      this.cpu.gpu.writeByte(addr & 0x7f, val);
    else if (addr >= 0xff10 && addr < 0xff27) this.cpu.apu.writeByte(addr, val);
    else if (addr == 0xff04) this.ioRegs[addr & 0x7f] = 0; // Reset DIV register
    else if (addr == 0xff00) this.cpu.joypad.writeByte(addr & 0x7f, val);
    else this.ioRegs[addr & 0x7f] = val;
  }

  handleBankChange(addr, val) {
    // Enable RAM
    if (addr < 0x2000 && (this.MBC1 || this.MBC2))
      this.enableRamBanking(addr, val);
    // ROM bank change
    else if (addr >= 0x2000 && addr < 0x4000 && (this.MBC1 || this.MBC2))
      this.changeLoRomBank(val);
    // ROM or RAM bank change
    else if (addr >= 0x4000 && addr < 0x6000 && this.MBC1) {
      if (this.bankingAdvancedMode) this.changeHiRomBank(val);
      else this.changeRamBank(val);
    }
    // Change ROM banking or RAM banking mode
    else if (addr >= 0x6000 && addr < 0x8000 && this.MBC1) this.changeMode(val);
  }

  enableRamBanking(addr, val) {
    // In MBC2, bit 4 of addr must be 0
    if (this.MBC2 && testBit(addr, 4)) return;

    let highByte = val & 0xf;
    if (highByte == 0xa) this.isRamBankingEnabled = true;
    else if (highByte == 0) this.isRamBankingEnabled = false;
  }

  changeLoRomBank(val) {
    if (this.MBC2) {
      this.currentRomBank = val & 0xf || 1;
      return;
    }

    let lowerBits = val & 0b11111;
    this.currentRomBank &= 0b11100000; // Reset lower 5 bits
    this.currentRomBank = this.currentRomBank | lowerBits || 1;
  }

  changeHiRomBank(val) {
    let upperBits = val & 0b01100000;
    this.currentRomBank &= 0b00011111; // Reset upper 3 bits
    this.currentRomBank = this.currentRomBank | upperBits || 1;
  }

  changeRamBank(val) {
    this.currentRamBank = val & 0x3;
  }

  changeMode(val) {
    this.bankingAdvancedMode = testBit(val, 0);
    if (this.bankingAdvancedMode) this.currentRamBank = 0;
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

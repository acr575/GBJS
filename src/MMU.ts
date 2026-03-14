import { testBit } from "./GameBoyUtils.ts";

export class MMU {
  // Public memory regions
  cartridge: Uint8Array;
  ioRegs: Uint8Array;

  // Internal memory regions
  private eram: Uint8Array;
  private wram: Uint8Array;
  private hram: Uint8Array;
  private ie: number;

  // Memory banking flags
  private MBC1: boolean = false;
  private MBC2: boolean = false;
  private MBC5: boolean = false;

  private currentRomBank: number = 1; // ROM bank loaded. 1 by default bc 0 is loaded always
  private currentRamBank: number = 0; // RAM bank loaded
  private isRamBankingEnabled: boolean = false;
  private bankingAdvancedMode: boolean = false;
  private readonly CARTRIDGE_MAX_SIZE: number = 1572864; // 1.5 MiB
  private readonly RAM_BANK_SIZE: number = 0x2000; // 8 KiB
  private readonly ROM_BANK_SIZE: number = 0x4000; // 16 KiB

  cpu: any; // TODO: Replace `any` with a proper CPU type

  constructor(cpu: any) {
    this.cpu = cpu;

    // Memory regions
    this.cartridge = new Uint8Array(); // Game cartridge   1.5  MiB. (max) Not mapped in GB memory
    this.eram = new Uint8Array(); // External RAM       8  KiB./bank  Not mapped in GB memory
    this.wram = new Uint8Array(8192); // Work RAM.          8  KiB.       Area C000-DFFF
    this.ioRegs = new Uint8Array(128); // I/O Registers.   128    B.       Area FF00-FF7F
    this.hram = new Uint8Array(127); // High RAM.        127    B.       Area FF80-FFFE
    this.ie = 0; // IE Flag
  }

  // Function to load a program into the memory
  async load(file: File): Promise<number> {
    console.log("Loading program: " + file.name);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        console.error("Error reading file.");
        reject("File read error");
      };

      reader.readAsArrayBuffer(file);

      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const byteArray = new Uint8Array(arrayBuffer);

        if (!byteArray) {
          console.error(
            "Error loading program. The byte array loaded is null."
          );
          reject("Error: Loaded byte array is null");
          return;
        }

        const size = byteArray.length;

        // Load bytes into cartridge memory
        this.cartridge = new Uint8Array(size);
        this.cartridge.set(byteArray.subarray(0, this.cartridge.length));

        const cartridgeType = this.cartridge[0x147];
        const ramBanks = this.getRamBanksNumber(this.cartridge[0x149]);

        // Set memory banking mode
        if (cartridgeType >= 1 && cartridgeType <= 3) this.MBC1 = true;
        // else if (cartridgeType == 5 || cartridgeType == 6) this.MBC2 = true;
        else if (cartridgeType >= 0x19 && cartridgeType <= 0x1e) this.MBC5 = true;
        else if (cartridgeType != 0)
          return reject(new Error("Unsupported MBC. Only MBC1 and MBC5 games allowed."));

        // Initialize ram banks. 8KiB each bank
        this.eram = new Uint8Array(this.RAM_BANK_SIZE * ramBanks);

        console.log("Program loaded successfully.");
        resolve(size);
      };
    });
  }

  clearMemory(): void {
    [
      this.cartridge,
      this.eram,
      this.wram,
      this.ioRegs,
      this.hram,
      this.cpu.gpu.oam,
      this.cpu.gpu.vram,
    ].map((arr: Uint8Array) => arr.fill(0));

    this.ie = 0;
  }

  private getRamBanksNumber(ramSizeCode: number): number {
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

  readByte(addr: number): number {
    // ROM Bank 00
    if (addr >= 0 && addr < 0x4000) return this.cartridge[addr];
    // Read from current loaded bank
    else if (addr >= 0x4000 && addr < 0x8000) {
      const romAddr = (addr & 0x3fff) + this.currentRomBank * this.ROM_BANK_SIZE;
      return this.cartridge[romAddr % this.cartridge.length]; // Prevent out-of-bounds
    }
    // VRAM
    else if (addr >= 0x8000 && addr < 0xa000)
      return this.cpu.gpu.vram[addr & 0x1fff];
    // ERAM
    else if (addr >= 0xa000 && addr < 0xc000)
      return this.eram[(addr & 0x1fff) + this.currentRamBank * this.RAM_BANK_SIZE];
    // WRAM & ECHO RAM
    else if (addr >= 0xc000 && addr < 0xfe00) return this.wram[addr & 0x1fff];
    // OAM
    else if (addr >= 0xfe00 && addr < 0xfea0) return this.cpu.gpu.oam[addr & 0xff];
    // I/O Registers
    else if (addr >= 0xff00 && addr < 0xff80)
      return addr == 0xff00 ? this.cpu.joypad.readJoypad() : this.ioRegs[addr & 0x7f];
    // HRAM
    else if (addr >= 0xff80 && addr < 0xffff) return this.hram[addr & 0x7f];

    // IE FLAG
    return this.ie;
  }

  readWord(addr: number): number {
    return this.readByte(addr) + (this.readByte(addr + 1) << 8);
  }

  writeByte(addr: number, val: number): void {
    // ROM
    if (addr >= 0 && addr < 0x8000) this.handleBankChange(addr, val);
    // VRAM
    else if (addr >= 0x8000 && addr < 0xa000) this.cpu.gpu.vram[addr & 0x1fff] = val;
    // ERAM
    else if (addr >= 0xa000 && addr < 0xc000 && this.isRamBankingEnabled)
      this.eram[(addr & 0x1fff) + this.currentRamBank * this.RAM_BANK_SIZE] = val;
    // WRAM & ECHO RAM
    else if (addr >= 0xc000 && addr < 0xfe00) this.wram[addr & 0x1fff] = val;
    // OAM
    else if (addr >= 0xfe00 && addr < 0xfea0) this.cpu.gpu.oam[addr & 0xff] = val;
    // I/O Registers
    else if (addr >= 0xff00 && addr < 0xff80) this.handleIOWrite(addr, val);
    // HRAM
    else if (addr >= 0xff80 && addr < 0xffff) this.hram[addr & 0x7f] = val;
    // IE FLAG
    else this.ie = val & 0xff;
  }

  writeWord(addr: number, val: number): void {
    this.writeByte(addr, val & 0xff); // Low byte
    this.writeByte(addr + 1, val >> 8); // High byte
  }

  private handleIOWrite(addr: number, val: number): void {
    if (addr >= 0xff40 && addr < 0xff80) this.cpu.gpu.writeByte(addr & 0x7f, val);
    else if (addr >= 0xff10 && addr < 0xff27) this.cpu.apu.writeByte(addr, val);
    else if (addr == 0xff04) this.ioRegs[addr & 0x7f] = 0; // Reset DIV register
    else if (addr == 0xff00) this.cpu.joypad.writeByte(addr & 0x7f, val);
    else this.ioRegs[addr & 0x7f] = val;
  }

  private handleBankChange(addr: number, val: number): void {
    // Enable RAM
    if (addr < 0x2000 && (this.MBC1 || this.MBC2 || this.MBC5)) this.enableRamBanking(addr, val);
    // ROM Bank number (lower 8 bits) - MBC5: 0x2000–0x2FFF
    else if (this.MBC5 && addr >= 0x2000 && addr < 0x3000)
      this.currentRomBank = (this.currentRomBank & 0x100) | val;
    // ROM Bank number (9th bit) - MBC5: 0x3000–0x3FFF
    else if (this.MBC5 && addr >= 0x3000 && addr < 0x4000)
      this.currentRomBank = (this.currentRomBank & 0xff) | ((val & 1) << 8);
    // RAM Bank number - MBC5: 0x4000–0x5FFF
    else if (this.MBC5 && addr >= 0x4000 && addr < 0x6000) this.currentRamBank = val & 0x0f;
    // MBC1 behavior
    else if (addr >= 0x2000 && addr < 0x4000 && (this.MBC1 || this.MBC2)) this.changeLoRomBank(val);
    else if (addr >= 0x4000 && addr < 0x6000 && this.MBC1) {
      if (this.bankingAdvancedMode) this.changeHiRomBank(val);
      else this.changeRamBank(val);
    } else if (addr >= 0x6000 && addr < 0x8000 && this.MBC1) this.changeMode(val);
  }

  private enableRamBanking(addr: number, val: number): void {
    // In MBC2, bit 4 of addr must be 0
    if (this.MBC2 && testBit(addr, 4)) return;

    const highByte = val & 0xf;
    if (highByte == 0xa) this.isRamBankingEnabled = true;
    else if (highByte == 0) this.isRamBankingEnabled = false;
  }

  private changeLoRomBank(val: number): void {
    if (this.MBC2) {
      this.currentRomBank = (val & 0xf) || 1;
      return;
    }

    const lowerBits = val & 0b11111;
    this.currentRomBank &= 0b11100000; // Reset lower 5 bits
    this.currentRomBank = (this.currentRomBank | lowerBits) || 1;
  }

  private changeHiRomBank(val: number): void {
    const upperBits = val & 0b01100000;
    this.currentRomBank &= 0b00011111; // Reset upper 3 bits
    this.currentRomBank = (this.currentRomBank | upperBits) || 1;
  }

  private changeRamBank(val: number): void {
    this.currentRamBank = val & 0x3;
  }

  private changeMode(val: number): void {
    this.bankingAdvancedMode = testBit(val, 0);
    if (this.bankingAdvancedMode) this.currentRamBank = 0;
  }

  setupAddressInput(): void {
    const addressInput = document.getElementById("hexAddress") as HTMLInputElement | null;
    const memValue = document.getElementById("memValue") as HTMLElement | null;

    const updateMemValue = (addr?: number) => {
      return addr !== undefined && !isNaN(addr as number) ? this.readByte(addr) : 0;
    };

    if (!addressInput || !memValue) return;

    addressInput.addEventListener("input", function (this: HTMLInputElement) {
      this.value = this.value.toUpperCase().replace(/[^0-9A-FX]/g, ""); // Hex. regex
      if (!this.value.startsWith("0X")) this.value = "0X" + this.value.replace(/^0X/, "");
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

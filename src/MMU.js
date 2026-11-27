import { testBit } from "./GameBoyUtils.js";
import {
  BatteryStore,
  cartridgeGameKey,
  cartridgeHasBattery,
  cartridgeTitle,
} from "./Battery.js";

export class MMU {
  #eram = null;
  #wram = null;
  #hram = null;
  #ie = 0;
  // Battery image. The key is null unless this cart's type has a cell.
  // `#rtcSnapshot` stays null; MBC3 will store its clock there.
  #battery = null;
  #batteryKey = null;
  #batteryTitle = "";
  #rtcSnapshot = null;
  #readBatteryImage = null;
  #loadGeneration = 0;

  // Memory banking mode. None by default
  #MBC1 = false;
  #MBC2 = false;
  #MBC5 = false;

  #currentRomBank = 1; // ROM bank loaded. 1 by default bc 0 is loaded always
  #currentRamBank = 0; // RAM bank loaded
  #isRamBankingEnabled = false;
  // MBC1 registers. The 5-bit ROM bank stores 0 as 1. The 2-bit secondary
  // register is ROM bits 5-6, and in mode 1 it also selects the RAM bank
  // and the bank seen at 0000-3FFF. Counts come from the loaded cart.
  #mbc1RomBank = 1;
  #mbc1Secondary = 0;
  #mbc1Mode = 0;
  #romBankCount = 0;
  #ramBankCount = 0;
  #CARTRIDGE_MAX_SIZE = 1572864; // 1.5 MiB
  #RAM_BANK_SIZE = 0x2000; // 8 KiB
  #ROM_BANK_SIZE = 0x4000; // 16 KiB

  constructor(cpu) {
    this.cpu = cpu;

    // this.inbios = 1; // Flag indicating BIOS is mapped

    // Memory regions
    // this.bios = new Uint8Array(256); //BIOS.            256    B.       Area 0000-00FF
    this.cartridge = new Uint8Array(); // Game cartridge   1.5  MiB. (max) Not mapped in GB memory
    this.#eram = new Uint8Array(); //      External RAM       8  KiB./bank  Not mapped in GB memory
    this.#wram = new Uint8Array(8192); //  Work RAM.          8  KiB.       Area C000-DFFF
    this.ioRegs = new Uint8Array(128); // I/O Registers.   128    B.       Area FF00-FF7F
    this.#hram = new Uint8Array(127); //   High RAM.        127    B.       Area FF80-FFFE
    this.#ie = 0; //                       IE Flag            1    B.       Addr FFFF

    this.#battery = new BatteryStore();
    this.#readBatteryImage = () => ({
      sram: new Uint8Array(this.#eram),
      rtc: this.#rtcSnapshot,
    });
  }

  // Function to load a program into the memory
  async load(file) {
    console.log("Loading program: " + file.name);

    // Keep the previous cart's RAM before this file replaces it.
    await this.flushBattery();
    const generation = ++this.#loadGeneration;
    this.#clearBattery();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const cancelled = () => {
        const error = new Error("Load cancelled.");
        error.cancelled = true;
        return error;
      };

      reader.onerror = () => {
        console.error("Error reading file.");
        reject("File read error");
      };

      reader.readAsArrayBuffer(file);

      reader.onload = async () => {
        try {
          if (generation != this.#loadGeneration) {
            reject(cancelled());
            return;
          }

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
          // if (size > this.CARTRIDGE_MAX_SIZE)
          //   throw new Error("Cartridge too big for memory");

          // Load bytes into cartridge memory
          this.cartridge = new Uint8Array(size);
          this.cartridge.set(byteArray.subarray(0, this.cartridge.length));

          const cartridgeType = this.cartridge[0x147];
          const ramBanks = this.#getRamBanksNumber(this.cartridge[0x149]);
          this.#resetMbc();
          this.#romBankCount = size >> 14;
          this.#ramBankCount = ramBanks;

          // Set memory banking mode
          if (cartridgeType >= 1 && cartridgeType <= 3) this.#MBC1 = true;
          // else if (cartridgeType == 5 || cartridgeType == 6) this.MBC2 = true;
          else if (cartridgeType >= 0x19 && cartridgeType <= 0x1e)
            this.#MBC5 = true;
          else if (cartridgeType != 0)
            return reject(
              new Error("Unsupported MBC. Only MBC1 and MBC5 games allowed.")
            );

          // Initialize ram banks. 8KiB each bank. A battery image may replace
          // these bytes before the CPU runs.
          this.#eram = new Uint8Array(this.#RAM_BANK_SIZE * ramBanks);
          await this.#attachBattery(cartridgeType, generation);

          if (generation != this.#loadGeneration) {
            reject(cancelled());
            return;
          }

          console.log("Program loaded successfully.");
          resolve(size);
        } catch (err) {
          reject(err);
        }
      };
    });
  }

  clearMemory() {
    [
      this.cartridge,
      this.#eram,
      this.#wram,
      this.ioRegs,
      this.#hram,
      this.cpu.gpu.oam,
      this.cpu.gpu.vram,
    ].map((arr) => arr.fill(0));

    this.#ie = 0;
  }

  #getRamBanksNumber(ramSizeCode) {
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
    // ROM Bank 00. MBC1 mode 1 can map this with the secondary register.
    if (addr >= 0 && addr < 0x4000)
      return this.#MBC1 ? this.#readMbc1Rom(addr, false) : this.cartridge[addr];
    // Read from current loaded bank
    else if (addr >= 0x4000 && addr < 0x8000) {
      if (this.#MBC1) return this.#readMbc1Rom(addr, true);
      const romAddr =
        (addr & 0x3fff) + this.#currentRomBank * this.#ROM_BANK_SIZE;
      return this.cartridge[romAddr % this.cartridge.length]; // Prevent out-of-bounds
    }
    // VRAM
    else if (addr >= 0x8000 && addr < 0xa000)
      return this.cpu.gpu.vram[addr & 0x1fff];
    // ERAM. MBC1 returns 0xFF while the RAM is disabled.
    else if (addr >= 0xa000 && addr < 0xc000) {
      if (this.#MBC1) return this.#readMbc1Ram(addr);
      return this.#eram[
        (addr & 0x1fff) + this.#currentRamBank * this.#RAM_BANK_SIZE
      ];
    }
    // WRAM & ECHO RAM
    else if (addr >= 0xc000 && addr < 0xfe00) return this.#wram[addr & 0x1fff];
    // OAM
    else if (addr >= 0xfe00 && addr < 0xfea0)
      return this.cpu.gpu.oam[addr & 0xff];
    // I/O Registers
    else if (addr >= 0xff00 && addr < 0xff80) {
      if (addr == 0xff00) return this.cpu.joypad.readJoypad();
      // Bits 5-7 of IF are unused and read as 1.
      if (addr == 0xff0f) return this.ioRegs[0x0f] | 0xe0;
      // NR10–NR52, unused FF27–FF2F, and wave RAM. Reads apply the unused-bit masks.
      if (addr >= 0xff10 && addr < 0xff40) return this.cpu.apu.readByte(addr);
      return this.ioRegs[addr & 0x7f];
    }
    // HRAM
    else if (addr >= 0xff80 && addr < 0xffff) return this.#hram[addr & 0x7f];

    // IE FLAG
    return this.#ie;
  }

  readWord(addr) {
    return this.readByte(addr) + (this.readByte(addr + 1) << 8);
  }

  writeByte(addr, val) {
    // ROM
    if (addr >= 0 && addr < 0x8000) this.#handleBankChange(addr, val);
    // VRAM
    else if (addr >= 0x8000 && addr < 0xa000)
      this.cpu.gpu.vram[addr & 0x1fff] = val;
    // ERAM
    else if (addr >= 0xa000 && addr < 0xc000 && this.#isRamBankingEnabled) {
      if (this.#MBC1) this.#writeMbc1Ram(addr, val);
      else
        this.#eram[
          (addr & 0x1fff) + this.#currentRamBank * this.#RAM_BANK_SIZE
        ] = val;
      this.#noteBatteryWrite();
    }
    // WRAM & ECHO RAM
    else if (addr >= 0xc000 && addr < 0xfe00) this.#wram[addr & 0x1fff] = val;
    // OAM
    else if (addr >= 0xfe00 && addr < 0xfea0)
      this.cpu.gpu.oam[addr & 0xff] = val;
    // I/O Registers
    else if (addr >= 0xff00 && addr < 0xff80) this.#handleIOWrite(addr, val);
    // HRAM
    else if (addr >= 0xff80 && addr < 0xffff) this.#hram[addr & 0x7f] = val;
    // IE FLAG
    else this.#ie = val & 0xff;
  }

  writeWord(addr, val) {
    this.writeByte(addr, val & 0xff); // Low byte
    this.writeByte(addr + 1, val >> 8); // High byte
  }

  #handleIOWrite(addr, val) {
    if (addr >= 0xff40 && addr < 0xff80)
      this.cpu.gpu.writeByte(addr & 0x7f, val);
    else if (addr >= 0xff10 && addr < 0xff40) this.cpu.apu.writeByte(addr, val);
    else if (addr == 0xff04) this.cpu.timer.resetOnDivWrite();
    else if (addr == 0xff05) this.cpu.timer.writeTima(val);
    else if (addr == 0xff06) this.cpu.timer.writeTma(val);
    else if (addr == 0xff07) this.cpu.timer.writeTac(val);
    else if (addr == 0xff00) this.cpu.joypad.writeByte(addr & 0x7f, val);
    else this.ioRegs[addr & 0x7f] = val;
  }

  #resetMbc() {
    this.#MBC1 = false;
    this.#MBC2 = false;
    this.#MBC5 = false;
    this.#currentRomBank = 1;
    this.#currentRamBank = 0;
    this.#isRamBankingEnabled = false;
    this.#mbc1RomBank = 1;
    this.#mbc1Secondary = 0;
    this.#mbc1Mode = 0;
  }

  #handleBankChange(addr, val) {
    // Enable RAM
    if (addr < 0x2000 && (this.#MBC1 || this.#MBC2 || this.#MBC5))
      this.#enableRamBanking(addr, val);
    // ROM Bank number (lower 8 bits) - MBC5: 0x2000–0x2FFF
    else if (this.#MBC5 && addr >= 0x2000 && addr < 0x3000)
      this.#currentRomBank = (this.#currentRomBank & 0x100) | val;
    // ROM Bank number (9th bit) - MBC5: 0x3000–0x3FFF
    else if (this.#MBC5 && addr >= 0x3000 && addr < 0x4000)
      this.#currentRomBank = (this.#currentRomBank & 0xff) | ((val & 1) << 8);
    // RAM Bank number - MBC5: 0x4000–0x5FFF
    else if (this.#MBC5 && addr >= 0x4000 && addr < 0x6000)
      this.#currentRamBank = val & 0x0f;
    // MBC1: 5-bit ROM bank. 0 in this register is treated as 1.
    else if (this.#MBC1 && addr >= 0x2000 && addr < 0x4000) {
      const bank = val & 0x1f;
      this.#mbc1RomBank = bank == 0 ? 1 : bank;
    }
    // MBC1: 2-bit secondary register (ROM bits 5-6, or the RAM bank).
    else if (this.#MBC1 && addr >= 0x4000 && addr < 0x6000)
      this.#mbc1Secondary = val & 0x03;
    // MBC1: banking mode. 0 locks RAM and 0000-3FFF to bank 0.
    else if (this.#MBC1 && addr >= 0x6000 && addr < 0x8000)
      this.#mbc1Mode = val & 0x01;
    // MBC2 ROM bank is the low nibble, and 0 is treated as 1.
    else if (this.#MBC2 && addr >= 0x2000 && addr < 0x4000)
      this.#currentRomBank = val & 0x0f || 1;
  }

  #enableRamBanking(addr, val) {
    // In MBC2, bit 4 of addr must be 0
    if (this.#MBC2 && testBit(addr, 4)) return;

    // Low nibble 0xA enables external RAM. Any other value disables it.
    this.#isRamBankingEnabled = (val & 0xf) == 0xa;
  }

  // Drop address lines the installed ROM or RAM does not have.
  #selectBank(bank, count) {
    if (count <= 1) return 0;
    if ((count & (count - 1)) == 0) return bank & (count - 1);
    return bank % count;
  }

  #mbc1LowRomBank() {
    if (this.#mbc1Mode == 0) return 0;
    return this.#selectBank(this.#mbc1Secondary << 5, this.#romBankCount);
  }

  #mbc1HighRomBank() {
    const bank = (this.#mbc1Secondary << 5) | this.#mbc1RomBank;
    return this.#selectBank(bank, this.#romBankCount);
  }

  #mbc1RamBank() {
    if (this.#mbc1Mode == 0) return 0;
    return this.#selectBank(this.#mbc1Secondary, this.#ramBankCount);
  }

  #readMbc1Rom(addr, high) {
    const bank = high ? this.#mbc1HighRomBank() : this.#mbc1LowRomBank();
    return this.cartridge[bank * this.#ROM_BANK_SIZE + (addr & 0x3fff)];
  }

  #readMbc1Ram(addr) {
    if (!this.#isRamBankingEnabled || this.#ramBankCount == 0) return 0xff;
    return this.#eram[
      (addr & 0x1fff) + this.#mbc1RamBank() * this.#RAM_BANK_SIZE
    ];
  }

  #writeMbc1Ram(addr, val) {
    if (this.#ramBankCount == 0) return;
    this.#eram[(addr & 0x1fff) + this.#mbc1RamBank() * this.#RAM_BANK_SIZE] =
      val;
  }

  /**
   * True when this cart has a battery and external RAM to keep.
   * @returns {boolean}
   */
  hasBattery() {
    return this.#batteryKey != null && this.#eram.length > 0;
  }

  /**
   * Clock snapshot stored next to the SRAM. Always null until MBC3 writes
   * one. The mapper owns the shape; callers get a clone.
   * @returns {*}
   */
  getRtcSnapshot() {
    if (this.#rtcSnapshot == null) return null;
    return structuredClone(this.#rtcSnapshot);
  }

  /**
   * Replace the RTC snapshot and schedule a battery write. MBC3 calls this
   * when the clock is latched, halted or saved. Pass null to clear it. The
   * value must be structured-cloneable. No-op without a battery cart.
   * @param {*} snapshot
   */
  setRtcSnapshot(snapshot) {
    if (!this.#batteryKey) return;
    this.#rtcSnapshot = snapshot == null ? null : structuredClone(snapshot);
    this.#noteBatteryWrite();
  }

  /**
   * Store a pending battery image now (quit, hide, page close, .sav export).
   * @returns {Promise<void>}
   */
  flushBattery() {
    return this.#battery.flush();
  }

  /**
   * Raw external RAM for a .sav file. RTC is not appended.
   * @returns {Uint8Array|null}
   */
  exportSav() {
    if (!this.hasBattery()) return null;
    return new Uint8Array(this.#eram);
  }

  /**
   * @returns {string}
   */
  saveFileName() {
    const title = this.#batteryTitle || "game";
    const safe = title.replace(/[\\/:*?"<>|]/g, "").trim() || "game";
    return safe + ".sav";
  }

  /**
   * Replace external RAM with a .sav of the same length and store it.
   * @param {Uint8Array} bytes
   * @returns {Promise<void>}
   */
  importSav(bytes) {
    if (!this.hasBattery())
      throw new Error("This cartridge has no battery RAM.");
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (data.length != this.#eram.length)
      throw new Error(
        "Save file size does not match this cartridge (" +
          this.#eram.length +
          " bytes)."
      );
    this.#eram.set(data);
    this.#noteBatteryWrite();
    return this.flushBattery();
  }

  #clearBattery() {
    this.#battery.detach();
    this.#batteryKey = null;
    this.#batteryTitle = "";
    this.#rtcSnapshot = null;
  }

  async #attachBattery(cartridgeType, generation) {
    if (!cartridgeHasBattery(cartridgeType)) return;
    const key = cartridgeGameKey(this.cartridge);
    if (!key) return;
    const title = cartridgeTitle(this.cartridge);
    const image =
      this.#eram.length > 0 ? await this.#battery.load(key) : null;
    // A newer load() owns the bus. Don't write this cart's RAM over it.
    if (generation != this.#loadGeneration) return;
    this.#batteryKey = key;
    this.#batteryTitle = title;
    if (!image) return;
    if (image.sram.length != this.#eram.length) {
      console.error(
        "Battery SRAM size does not match this cartridge (" +
          image.sram.length +
          " stored, " +
          this.#eram.length +
          " on the cart)."
      );
      return;
    }
    this.#eram.set(image.sram);
    // Kept for the next save. MBC3 is what will read it.
    this.#rtcSnapshot = image.rtc ?? null;
    console.log("Battery RAM restored.");
  }

  #noteBatteryWrite() {
    if (!this.#batteryKey) return;
    if (this.#eram.length == 0 && this.#rtcSnapshot == null) return;
    this.#battery.markDirty(this.#batteryKey, this.#readBatteryImage);
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

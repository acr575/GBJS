import { OpcodeTable } from "./OpcodeTable.js";
import { MMU } from "./MMU.ts";
import { Timer } from "./Timer.ts";
import { PPU } from "./GPU.js";
import { Joypad } from "./Joypad.js";
import { APU } from "./APU/APU.js";
import { getSignedByte, resetBit, setBit } from "./GameBoyUtils.ts";

// Lightweight types for flags and instruction fetches. Refine as needed.
type FlagValues = { Z?: boolean; N?: boolean; H?: boolean; C?: boolean; [key: string]: any };

export class CPU {
  // Private internal storage for 8-bit registers (A..L)
  #registersValues: Uint8Array | null = null;
  #ie = 0xffff; // Interrupt enable flag (address)
  #if = 0xff0f; // Interrupt request flag (address)
  #isStopped = false;
  #cycleCounter = 0;
  #opcodeTable: any = null; // TODO: replace `any` with OpcodeTable type
  #instructionTable: any = null; // TODO: give this a real type

  // Cache DOM lookups lazily to avoid top-level document access in Node tests
  private _domCache: Map<string, HTMLElement | null> = new Map();

  // Public CPU state
  pc: number; // Program counter
  sp: number; // Stack pointer
  ime: boolean; // Interrupt master enable
  requestIme: number; // EI deferred request counter
  isHalted: boolean;
  CLOCKSPEED: number;

  // Subsystems (typed as `any` for now, refine later)
  mmu: any; // TODO
  timer: any; // TODO
  gpu: any; // TODO
  joypad: any; // TODO
  apu: any; // TODO
  prefixInstructionTable: any; // TODO

  constructor() {
    this.#registersValues = new Uint8Array(8); // a-l 8 bit registers
    this.pc = 0x100; // Program Counter. Initialized at 0x100
    this.sp = 0xfffe; // Stack Pointer.  Initialized at 0xfffe
    this.ime = false; // Interrupt master enable flag. Starts unset
    this.requestIme = 0; // Flag that sets IME flag after next instruccion. Used by EI instruction
    this.isHalted = false;
    this.#isStopped = false;
    this.#cycleCounter = 0;
    this.CLOCKSPEED = 4194304; // Hz

    // Initialize subsystems
    this.mmu = new MMU(this);
    this.timer = new Timer(this);
    this.gpu = new PPU(this);
    this.joypad = new Joypad(this);
    this.apu = new APU(this);

    // Opcode / instruction tables
    this.#opcodeTable = new OpcodeTable(this);
    this.#instructionTable = this.#opcodeTable.instructionTable;
    this.prefixInstructionTable = this.#opcodeTable.prefixInstructionTable;
  }

  init(): void {
    this.mmu.clearMemory();

    this.pc = 0x100;
    this.setRegister("AF", 0x01b0);
    this.setRegister("BC", 0x0013);
    this.setRegister("DE", 0x00d8);
    this.setRegister("HL", 0x014d);
    this.sp = 0xfffe;

    this.mmu.ioRegs[0xff00 & 0x7f] = 0xcf; // P1
    this.mmu.writeByte(0xff10, 0x80);
    this.mmu.writeByte(0xff11, 0xbf);
    this.mmu.writeByte(0xff12, 0xf3);
    this.mmu.writeByte(0xff13, 0xff);
    this.mmu.writeByte(0xff14, 0xbf);
    this.mmu.writeByte(0xff16, 0x3f);
    this.mmu.writeByte(0xff18, 0xff);
    this.mmu.writeByte(0xff19, 0xbf);
    this.mmu.writeByte(0xff1a, 0x7f);
    this.mmu.writeByte(0xff1b, 0xff);
    this.mmu.writeByte(0xff1c, 0x9f);
    this.mmu.writeByte(0xff1e, 0xbf);
    this.mmu.writeByte(0xff20, 0xff);
    this.mmu.writeByte(0xff23, 0xbf);
    this.mmu.writeByte(0xff24, 0x77);
    this.mmu.writeByte(0xff25, 0xf3);
    this.mmu.writeByte(0xff26, 0xf1);
    this.mmu.writeByte(0xff40, 0x91);
    this.mmu.writeByte(0xff41, 0x81);
    this.mmu.writeByte(0xff44, 0x91);
    this.mmu.writeByte(0xff46, 0xff);
    this.mmu.writeByte(0xff47, 0xfc);
    this.mmu.writeByte(0xff48, 0xff);
    this.mmu.writeByte(0xff49, 0xff);
  }

  static Registers = Object.freeze({
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
    F: "F",
    H: "H",
    L: "L",
  });

  getRegister(register: string): number | undefined {
    if (typeof register !== "string") {
      console.error("Unknown register: " + register);
      return;
    }

    register = register.toUpperCase();

    // Simple register
    if (register.length == 1 && register in CPU.Registers) {
      const index = Object.keys(CPU.Registers).indexOf(register);
      return this.#registersValues![index];
    }
    // Combined register
    else if (register.length == 2) {
      const left = register.split("")[0];
      const right = register.split("")[1];

      if (left in CPU.Registers && right in CPU.Registers) {
        const leftIndex = Object.keys(CPU.Registers).indexOf(left);
        const rightIndex = Object.keys(CPU.Registers).indexOf(right);

        return (
          (this.#registersValues![leftIndex] << 8) |
          this.#registersValues![rightIndex]
        );
      } else console.error("Unknown combined register: " + register);
    } else console.error("Unknown register: " + register);
  }

  setRegister(register: string, value: number): void {
    if (typeof register !== "string") {
      console.error("Unknown register: " + register);
      return;
    }

    register = register.toUpperCase();

    // Simple register
    if (register.length == 1 && register in CPU.Registers) {
      const index = Object.keys(CPU.Registers).indexOf(register);
      this.#registersValues![index] =
        register !== "F" ? value & 0xff : value & 0xf0;
    }
    // Combined register
    else if (register.length == 2) {
      const left = register.split("")[0];
      const right = register.split("")[1];

      if (left in CPU.Registers && right in CPU.Registers) {
        const leftIndex = Object.keys(CPU.Registers).indexOf(left);
        const rightIndex = Object.keys(CPU.Registers).indexOf(right);

        this.#registersValues![leftIndex] = (value & 0xff00) >> 8;
        this.#registersValues![rightIndex] =
          right !== "F" ? value & 0xff : value & 0xf0;
      } else throw new Error("Unknown combined register: " + register);
    } else throw new Error("Unknown register: " + register);
  }

  setFlags(flags: string, values: FlagValues): void {
    if (flags.length !== 4) {
      console.error("Flags string must be of length 4 (e.g., 'ZNHC').");
      return;
    }

    // Get current register F value
    let registerF = this.getRegister("F") ?? 0;

    // Iterate through each flag position (Z, N, H, C)
    for (let i = 0; i < 4; i++) {
      const flagName = flags[i]; // The flag name (Z, N, H, C)

      if (flagName === "-") {
        // If the flag is "-", don't change it
        continue;
      }

      // Determine the flag value based on the flag name or the corresponding value in 'values'
      let flagValue: boolean | undefined;

      // If it's one of the letters, determine its value dynamically based on the current state
      if (
        flagName === "Z" ||
        flagName === "N" ||
        flagName === "H" ||
        flagName === "C"
      ) {
        flagValue = values[flagName]; // Get the value from the `values` object (true/false)
      } else if (flagName === "1") {
        // If the flag is set to "1", always set it
        flagValue = true;
      } else if (flagName === "0") {
        // If the flag is set to "0", always reset it
        flagValue = false;
      }

      // Masks for the flags: Z -> bit 7, N -> bit 6, H -> bit 5, C -> bit 4
      const flagMask = 1 << (7 - i);

      if (flagValue) {
        // Set flag if it's true
        registerF |= flagMask;
      } else {
        // Reset flag if it's false
        registerF &= ~flagMask;
      }
    }

    // Update register F
    this.setRegister("F", registerF);
  }

  getSignedImmediate8Bit(): number {
    return getSignedByte(this.mmu.readByte(this.pc + 1));
  }

  getImmediate16Bit(): number {
    return this.mmu.readWord(this.pc + 1);
  }

  #execInstruction(): number {
    const opcode = this.mmu.readByte(this.pc); // Fetch opcode
    const fetch = this.#instructionTable[opcode]; // Decode opcode

    if (!fetch)
      throw new Error(
        "Unknown opcode: 0x" +
          opcode.toString(16) +
          " at 0x" +
          this.pc.toString(16)
      );

    const oldPC = this.pc;
    fetch.instruction(); // Execute opcode
    if (oldPC === this.pc || fetch.mnemonic[0] === "JR")
      this.pc += fetch.length; // Update PC if it wasn't modified by a jump or subroutine instruction, except JR

    // Return instruction cycles
    return typeof fetch.cycles === "function" ? fetch.cycles() : fetch.cycles;
  }

  emulateFrame(): void {
    let vBlank = false;

    while (!vBlank) {
      let cycles = 4;
      if (!this.isHalted) cycles = this.#execInstruction();
      this.#cycleCounter += cycles;

      this.timer.updateTimers(cycles);
      vBlank = this.gpu.updateGraphics(cycles);
      this.apu.updateAudio(cycles);

      this.#checkInterrupts();
      // Enable IME requested by EI. EI sets requestIme to 2.
      this.#handleRequestIme();
    }
  }

  requestInterrupt(interruptId: number): void {
    let ifValue = this.mmu.readByte(this.#if);
    ifValue = setBit(ifValue, interruptId);
    this.mmu.writeByte(this.#if, ifValue);
    this.isHalted = false;
  }

  #checkInterrupts(): void {
    if (this.ime) {
      let ifValue = this.mmu.readByte(this.#if);
      let ieValue = this.mmu.readByte(this.#ie);

      if (ifValue > 0) {
        for (let i = 0; i < 5; i++) {
          let currentBitIf = (ifValue >> i) & 1;
          let currentBitIe = (ieValue >> i) & 1;

          if (currentBitIf && currentBitIe) {
            this.#serviceInterrupt(i);
            break;
          }
        }
      }
    }
  }

  #serviceInterrupt(interruptId: number): void {
    this.ime = false;
    let ifValue = this.mmu.readByte(this.#if);
    ifValue = resetBit(ifValue, interruptId); // Reset serviced interrupt bit
    this.mmu.ioRegs[this.#if & 0x7f] = ifValue;
    this.isHalted = false;
    this.#cycleCounter += 20;

    this.#opcodeTable.instruction.push(this.pc);

    switch (interruptId) {
      case 0:
        this.pc = 0x40;
        break;

      case 1:
        this.pc = 0x48;
        break;

      case 2:
        this.pc = 0x50;
        break;

      case 3:
        this.pc = 0x58;
        break;

      case 4:
        this.pc = 0x60;
        break;
    }
  }

  #handleRequestIme(): void {
    if (this.requestIme > 0) {
      if (this.requestIme == 1) this.ime = true;
      this.requestIme--;
    }
  }

  private _getDebugElement(id: string): HTMLElement | null {
    if (this._domCache.has(id)) return this._domCache.get(id) ?? null;
    if (typeof document === "undefined") {
      this._domCache.set(id, null);
      return null;
    }

    const el = document.getElementById(id);
    const res = el instanceof HTMLElement ? el : null;
    this._domCache.set(id, res);
    return res;
  }

  updateDebugBox(): void {
    const debugPC = this._getDebugElement("pc");
    if (debugPC)
      debugPC.innerHTML = `$${this.pc
        .toString(16)
        .toUpperCase()
        .padStart(4, "0")}`;

    const debugSP = this._getDebugElement("sp");
    if (debugSP)
      debugSP.innerHTML = `$${this.sp
        .toString(16)
        .toUpperCase()
        .padStart(4, "0")}`;

    const debugA = this._getDebugElement("a");
    if (debugA)
      debugA.innerHTML = `$${(this.getRegister("A") ?? 0)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`;

    const debugB = this._getDebugElement("b");
    if (debugB)
      debugB.innerHTML = `$${(this.getRegister("B") ?? 0)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`;

    const debugC = this._getDebugElement("c");
    if (debugC)
      debugC.innerHTML = `$${(this.getRegister("C") ?? 0)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`;

    const debugD = this._getDebugElement("d");
    if (debugD)
      debugD.innerHTML = `$${(this.getRegister("D") ?? 0)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`;

    const debugE = this._getDebugElement("e");
    if (debugE)
      debugE.innerHTML = `$${(this.getRegister("E") ?? 0)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`;

    const debugH = this._getDebugElement("h");
    if (debugH)
      debugH.innerHTML = `$${(this.getRegister("H") ?? 0)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`;

    const debugL = this._getDebugElement("l");
    if (debugL)
      debugL.innerHTML = `$${(this.getRegister("L") ?? 0)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`;

    const debugF = this._getDebugElement("f");
    if (debugF)
      debugF.innerHTML = `$${(((this.getRegister("F") ?? 0) >> 4) & 0x0f)
        .toString(2)
        .padStart(4, "0")}`;
  }

  setupStopButton(): void {
    const stop = this._getDebugElement("stop");
    if (!stop) return;

    stop.addEventListener("click", () => {
      this.#isStopped = !this.#isStopped;
    });
  }
}

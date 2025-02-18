import { Instruction } from "./Instruction.js";
import { OpcodeTable } from "./OpcodeTable.js";
import { MMU } from "./MMU.js";
import { Timer } from "./Timer.js";
import { GPU } from "./GPU.js";

export class CPU {
  constructor() {
    this.registersValues = new Uint8Array(8); // a-l 8 bit registers
    this.pc = 0x100; // Program Counter. Initialized at 0x100
    this.sp = 0xfffe; // Stack Pointer.  Initialized at 0xfffe

    this.ie = 0xffff; // Interrupt enable flag
    this.if = 0xff0f; // Interrupt request flag
    this.ime = 0; // Interrup master enable flag. Starts unset
    this.requestIme = 0; // Flag that sets IME flag after next instruccion. Used by EI instruction

    this.instruction = new Instruction(this);
    this.mmu = new MMU(this); // Memory Management
    this.timer = new Timer(this); // System timer
    this.gpu = new GPU(this); // Graphics Processing Unit

    this.opcodeTable = new OpcodeTable(this); // Init opcode table
    this.instructionTable = this.opcodeTable.instructionTable; // Links each opcode with it instruction, length and cycles
    this.prefixInstructionTable = this.opcodeTable.prefixInstructionTable; // Links each CB prefixed opcode with it instruction, length and cycles
  }

  /* TODO: Init function that sets registers, SP, PC & ROM registers to its initial value
     Ref: http://www.codeslinger.co.uk/pages/projects/gameboy/hardware.html
  */

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

  /**
   * Retrieves the value of a specified CPU register. Supports both simple and combined registers.
   *
   * @param {string} register - The name of the register to retrieve.
   *                            Can be a single register (e.g., "A", "B")
   *                            or a combined register (e.g., "AF", "BC").
   * @returns {number | undefined} The value stored in the register. For combined registers,
   *                               returns a 16-bit value where the higher 8 bits are from
   *                               the first register and the lower 8 bits are from the second.
   */
  getRegister(register) {
    if (typeof register !== "string") {
      console.error("Unknown register: " + register);
      return;
    }

    register = register.toUpperCase();

    // Simple register
    if (register.length == 1 && register in CPU.Registers) {
      const index = Object.keys(CPU.Registers).indexOf(register);
      return this.registersValues[index];
    } else if (register.length == 2) {
      const left = register.split("")[0];
      const right = register.split("")[1];

      if (left in CPU.Registers && right in CPU.Registers) {
        const leftIndex = Object.keys(CPU.Registers).indexOf(left);
        const rightIndex = Object.keys(CPU.Registers).indexOf(right);

        return (
          (this.registersValues[leftIndex] << 8) |
          this.registersValues[rightIndex]
        );
      } else console.error("Unknown combined register: " + register);
    } else console.error("Unknown register: " + register);
  }

  /**
   * Sets the value of a specified CPU register. Supports both simple and combined registers.
   *
   * @param {string} register - The name of the register to modify.
   *                            Can be a single register (e.g., "A", "B")
   *                            or a combined register (e.g., "AF", "BC").
   * @param {number} value - The value to set in the register. For combined registers,
   *                         the higher 8 bits are stored in the first register,
   *                         and the lower 8 bits in the second.
   */
  setRegister(register, value) {
    if (typeof register !== "string") {
      console.error("Unknown register: " + register);
      return;
    }

    register = register.toUpperCase();

    // Simple register
    if (register.length == 1 && register in CPU.Registers) {
      const index = Object.keys(CPU.Registers).indexOf(register);
      this.registersValues[index] = value;
    }
    // Combined register
    else if (register.length == 2) {
      const left = register.split("")[0];
      const right = register.split("")[1];

      if (left in CPU.Registers && right in CPU.Registers) {
        const leftIndex = Object.keys(CPU.Registers).indexOf(left);
        const rightIndex = Object.keys(CPU.Registers).indexOf(right);

        this.registersValues[leftIndex] = (value & 0xff00) >> 8;
        this.registersValues[rightIndex] = value & 0xff;
      } else throw new Error("Unknown combined register: " + register);
    } else throw new Error("Unknown register: " + register);
  }

  /**
   * Sets the flags in the F register.
   * Flags are affected in Z, N, H, C order.
   *
   * @param {string} flags - A string of flags to set, e.g., "ZNHC" or "001-" (where Z = Zero, N = Subtract, H = Half Carry, C = Carry. 0 means reset; 1 means set; - means no change; flag letter means activation depends on flag value).
   * @param {Object} values - Object containing the values for the flags Z, N, H, C. e.g. { Z: true, N: false, H: true, C: false }.
   */
  setFlags(flags, values) {
    if (flags.length !== 4) {
      console.error("Flags string must be of length 4 (e.g., 'ZNHC').");
      return;
    }

    // Get current register F value
    let registerF = this.getRegister("F");

    // Iterate through each flag position (Z, N, H, C)
    for (let i = 0; i < 4; i++) {
      const flagName = flags[i]; // The flag name (Z, N, H, C)

      if (flagName === "-") {
        // If the flag is "-", don't change it
        continue;
      }

      // Determine the flag value based on the flag name or the corresponding value in 'values'
      let flagValue;

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

  getSignedValue(value) {
    return (value << 24) >> 24;
  }

  getSignedImmediate8Bit() {
    return (this.mmu.readByte(this.pc + 1) << 24) >> 24;
  }

  getImmediate16Bit() {
    return this.mmu.readWord(this.pc + 1);
  }

  emulateCycle() {
    const opcode = this.mmu.readByte(this.pc); // Fetch opcode
    const fetch = this.instructionTable[opcode]; // Decode opcode

    if (!fetch) throw new Error("Unknown opcode: 0x" + opcode.toString(16));

    // console.log(`PC: ${this.pc.toString(16)} Opcode: ${opcode.toString(16)}`);

    const oldPC = this.pc;
    fetch.instruction(); // Execute opcode
    if (oldPC === this.pc) this.pc += fetch.length; // Update PC if wasn't modified by an instruction

    // Return instruction cycles
    return typeof fetch.cycles === "function" ? fetch.cycles() : fetch.cycles;
  }

  // 69905 cycles / frame
  emulateFrame() {
    const maxCycles = 69905;
    let cycleCounter = 0;

    while (cycleCounter < maxCycles) {
      let cycles = this.emulateCycle();
      cycleCounter += cycles;
      this.timer.updateTimers(cycles);
      this.gpu.updateGraphics(cycles);
      this.doInterrupts();

      // Enable IME requested by EI. EI sets requestIme to 2.
      this.handleRequestIme();
    }
    // TODO: this.gpu.renderScreen();
  }

  requestInterrupt(interruptId) {
    let ifValue = this.mmu.readByte(this.if);
    ifValue |= 1 << interruptId;
    this.mmu.writeByte(this.if, ifValue);
  }

  doInterrupts() {
    if (this.ime) {
      let ifValue = this.mmu.readByte(this.if);
      let ieValue = this.mmu.readByte(this.ie);

      if (ifValue > 0) {
        for (let i = 4; i >= 0; i--) {
          let currentBitIf = (ifValue >> i) & 1;
          let currentBitIe = (ieValue >> i) & 1;

          // Unsupported id 3 interrupt (Serial Interrupt)
          if (currentBitIf && currentBitIe && i != 3) this.serviceInterrupt(i);
        }
      }
    }
  }

  serviceInterrupt(interruptId) {
    this.ime = 0;
    let ifValue = this.mmu.readByte(this.if);
    ifValue = ifValue & ~(1 << interruptId); // Reset serviced interrupt bit
    this.mmu.writeByte(this.if, ifValue);

    this.instruction.push(this.pc);

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

      case 4:
        this.pc = 0x60;
        break;
    }
  }

  handleRequestIme() {
    if (this.requestIme > 0) {
      if (this.requestIme == 1) this.ime = 1;
      this.requestIme--;
    }
  }
}

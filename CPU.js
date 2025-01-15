import { Instruction } from "./Instruction.js";

export class CPU {
  constructor() {
    this.registersValues = new Uint8Array(8); // a-l 8 bit registers
    this.mem = new Uint8Array(0x10000);
    this.pc = 0x100; // Program Counter. Initialized at 0x100
    this.sp = 0xfffe; // Stack Pointer.  Initialized at 0xfffe
    this.ime = 0; // Interrup master enable flag. Starts at 0
    this.instruction = new Instruction(this);

    // Instruction set. Links each opcode with it instruction, length and cycles
    this.instructionTable = {
      // LD (BC), A
      0x02: {
        instruction: () => this.instruction.LD_n_A("BC", true),
        length: 1,
        cycles: 8,
      },

      // LD B, d8
      0x06: {
        instruction: () => this.instruction.LD_nn_n("B"),
        length: 2,
        cycles: 8,
      },

      // LD A, (BC)
      0x0a: {
        instruction: () => this.instruction.LD_A_n("BC", true),
        length: 1,
        cycles: 8,
      },

      // LD C, d8
      0x0e: {
        instruction: () => this.instruction.LD_nn_n("C"),
        length: 2,
        cycles: 8,
      },

      // LD (DE), A
      0x12: {
        instruction: () => this.instruction.LD_n_A("DE", true),
        length: 1,
        cycles: 8,
      },

      // LD D, d8
      0x16: {
        instruction: () => this.instruction.LD_nn_n("D"),
        length: 2,
        cycles: 8,
      },

      // LD A, (DE)
      0x1a: {
        instruction: () => this.instruction.LD_A_n("DE", true),
        length: 1,
        cycles: 8,
      },

      // LD E, d8
      0x1e: {
        instruction: () => this.instruction.LD_nn_n("E"),
        length: 2,
        cycles: 8,
      },

      // LDI (HL), A
      0x22: {
        instruction: () => this.instruction.LDI_HL_A(),
        length: 1,
        cycles: 8,
      },

      // LD H, d8
      0x26: {
        instruction: () => this.instruction.LD_nn_n("H"),
        length: 2,
        cycles: 8,
      },

      // LDI A, (HL)
      0x2a: {
        instruction: () => this.instruction.LDI_A_HL(),
        length: 1,
        cycles: 8,
      },

      // LD L, d8
      0x2e: {
        instruction: () => this.instruction.LD_nn_n("L"),
        length: 2,
        cycles: 8,
      },

      // LDD (HL), A
      0x32: {
        instruction: () => this.instruction.LDD_HL_A(),
        length: 1,
        cycles: 8,
      },

      // LD (HL), d8
      0x36: {
        instruction: () =>
          this.instruction.LD_r1_r2("HL", this.mem[this.pc + 1]), // d8 is next PC address
        length: 2,
        cycles: 12,
      },

      // LDD A, (HL)
      0x3a: {
        instruction: () => this.instruction.LDD_A_HL(),
        length: 1,
        cycles: 8,
      },

      // LD A, d8
      0x3e: {
        instruction: () => this.instruction.LD_A_n("d8"),
        length: 2,
        cycles: 8,
      },

      // LD B, B
      0x40: {
        instruction: () => this.instruction.LD_r1_r2("B", "B"),
        length: 1,
        cycles: 4,
      },

      // LD B, C
      0x41: {
        instruction: () => this.instruction.LD_r1_r2("B", "C"),
        length: 1,
        cycles: 4,
      },

      // LD B, D
      0x42: {
        instruction: () => this.instruction.LD_r1_r2("B", "D"),
        length: 1,
        cycles: 4,
      },

      // LD B, E
      0x43: {
        instruction: () => this.instruction.LD_r1_r2("B", "E"),
        length: 1,
        cycles: 4,
      },

      // LD B, H
      0x44: {
        instruction: () => this.instruction.LD_r1_r2("B", "H"),
        length: 1,
        cycles: 4,
      },

      // LD B, L
      0x45: {
        instruction: () => this.instruction.LD_r1_r2("B", "L"),
        length: 1,
        cycles: 4,
      },

      // LD B, (HL)
      0x46: {
        instruction: () => this.instruction.LD_r1_r2("B", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD B, A
      0x47: {
        instruction: () => this.instruction.LD_n_A("B"),
        length: 1,
        cycles: 4,
      },

      // LD C, B
      0x48: {
        instruction: () => this.instruction.LD_r1_r2("C", "B"),
        length: 1,
        cycles: 4,
      },

      // LD C, C
      0x49: {
        instruction: () => this.instruction.LD_r1_r2("C", "C"),
        length: 1,
        cycles: 4,
      },

      // LD C, D
      0x4a: {
        instruction: () => this.instruction.LD_r1_r2("C", "D"),
        length: 1,
        cycles: 4,
      },

      // LD C, E
      0x4b: {
        instruction: () => this.instruction.LD_r1_r2("C", "E"),
        length: 1,
        cycles: 4,
      },

      // LD C, H
      0x4c: {
        instruction: () => this.instruction.LD_r1_r2("C", "H"),
        length: 1,
        cycles: 4,
      },

      // LD C, L
      0x4d: {
        instruction: () => this.instruction.LD_r1_r2("C", "L"),
        length: 1,
        cycles: 4,
      },

      // LD C, (HL)
      0x4e: {
        instruction: () => this.instruction.LD_r1_r2("C", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD C, A
      0x4f: {
        instruction: () => this.instruction.LD_n_A("C"),
        length: 1,
        cycles: 4,
      },

      // LD D, B
      0x50: {
        instruction: () => this.instruction.LD_r1_r2("D", "B"),
        length: 1,
        cycles: 4,
      },

      // LD D, C
      0x51: {
        instruction: () => this.instruction.LD_r1_r2("D", "C"),
        length: 1,
        cycles: 4,
      },

      // LD D, D
      0x52: {
        instruction: () => this.instruction.LD_r1_r2("D", "D"),
        length: 1,
        cycles: 4,
      },

      // LD D, E
      0x53: {
        instruction: () => this.instruction.LD_r1_r2("D", "E"),
        length: 1,
        cycles: 4,
      },

      // LD D, H
      0x54: {
        instruction: () => this.instruction.LD_r1_r2("D", "H"),
        length: 1,
        cycles: 4,
      },

      // LD D, L
      0x55: {
        instruction: () => this.instruction.LD_r1_r2("D", "L"),
        length: 1,
        cycles: 4,
      },

      // LD D, (HL)
      0x56: {
        instruction: () => this.instruction.LD_r1_r2("D", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD D, A
      0x57: {
        instruction: () => this.instruction.LD_n_A("D"),
        length: 1,
        cycles: 4,
      },

      // LD E, B
      0x58: {
        instruction: () => this.instruction.LD_r1_r2("E", "B"),
        length: 1,
        cycles: 4,
      },

      // LD E, C
      0x59: {
        instruction: () => this.instruction.LD_r1_r2("E", "C"),
        length: 1,
        cycles: 4,
      },

      // LD E, D
      0x5a: {
        instruction: () => this.instruction.LD_r1_r2("E", "D"),
        length: 1,
        cycles: 4,
      },

      // LD E, E
      0x5b: {
        instruction: () => this.instruction.LD_r1_r2("E", "E"),
        length: 1,
        cycles: 4,
      },

      // LD E, H
      0x5c: {
        instruction: () => this.instruction.LD_r1_r2("E", "H"),
        length: 1,
        cycles: 4,
      },

      // LD E, L
      0x5d: {
        instruction: () => this.instruction.LD_r1_r2("E", "L"),
        length: 1,
        cycles: 4,
      },

      // LD E, (HL)
      0x5e: {
        instruction: () => this.instruction.LD_r1_r2("E", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD E, A
      0x5f: {
        instruction: () => this.instruction.LD_n_A("E"),
        length: 1,
        cycles: 4,
      },

      // LD H, B
      0x60: {
        instruction: () => this.instruction.LD_r1_r2("H", "B"),
        length: 1,
        cycles: 4,
      },

      // LD H, C
      0x61: {
        instruction: () => this.instruction.LD_r1_r2("H", "C"),
        length: 1,
        cycles: 4,
      },

      // LD H, D
      0x62: {
        instruction: () => this.instruction.LD_r1_r2("H", "D"),
        length: 1,
        cycles: 4,
      },

      // LD H, E
      0x63: {
        instruction: () => this.instruction.LD_r1_r2("H", "E"),
        length: 1,
        cycles: 4,
      },

      // LD H, H
      0x64: {
        instruction: () => this.instruction.LD_r1_r2("H", "H"),
        length: 1,
        cycles: 4,
      },

      // LD H, L
      0x65: {
        instruction: () => this.instruction.LD_r1_r2("H", "L"),
        length: 1,
        cycles: 4,
      },

      // LD H, (HL)
      0x66: {
        instruction: () => this.instruction.LD_r1_r2("H", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD H, A
      0x67: {
        instruction: () => this.instruction.LD_n_A("H"),
        length: 1,
        cycles: 4,
      },

      // LD L, B
      0x68: {
        instruction: () => this.instruction.LD_r1_r2("L", "B"),
        length: 1,
        cycles: 4,
      },

      // LD L, C
      0x69: {
        instruction: () => this.instruction.LD_r1_r2("L", "C"),
        length: 1,
        cycles: 4,
      },

      // LD L, D
      0x6a: {
        instruction: () => this.instruction.LD_r1_r2("L", "D"),
        length: 1,
        cycles: 4,
      },

      // LD L, E
      0x6b: {
        instruction: () => this.instruction.LD_r1_r2("L", "E"),
        length: 1,
        cycles: 4,
      },

      // LD L, H
      0x6c: {
        instruction: () => this.instruction.LD_r1_r2("L", "H"),
        length: 1,
        cycles: 4,
      },

      // LD L, L
      0x6d: {
        instruction: () => this.instruction.LD_r1_r2("L", "L"),
        length: 1,
        cycles: 4,
      },

      // LD L, (HL)
      0x6e: {
        instruction: () => this.instruction.LD_r1_r2("L", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD L, A
      0x6f: {
        instruction: () => this.instruction.LD_n_A("L"),
        length: 1,
        cycles: 4,
      },

      // LD (HL), B
      0x70: {
        instruction: () => this.instruction.LD_r1_r2("HL", "B"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), C
      0x71: {
        instruction: () => this.instruction.LD_r1_r2("HL", "C"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), D
      0x72: {
        instruction: () => this.instruction.LD_r1_r2("HL", "D"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), E
      0x73: {
        instruction: () => this.instruction.LD_r1_r2("HL", "E"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), H
      0x74: {
        instruction: () => this.instruction.LD_r1_r2("HL", "H"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), L
      0x75: {
        instruction: () => this.instruction.LD_r1_r2("HL", "L"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), A
      0x77: {
        instruction: () => this.instruction.LD_n_A("HL", true),
        length: 1,
        cycles: 8,
      },

      // LD A, B
      0x78: {
        instruction: () => this.instruction.LD_r1_r2("A", "B"),
        length: 1,
        cycles: 4,
      },

      // LD A, C
      0x79: {
        instruction: () => this.instruction.LD_r1_r2("A", "C"),
        length: 1,
        cycles: 4,
      },

      // LD A, D
      0x7a: {
        instruction: () => this.instruction.LD_r1_r2("A", "D"),
        length: 1,
        cycles: 4,
      },

      // LD A, E
      0x7b: {
        instruction: () => this.instruction.LD_r1_r2("A", "E"),
        length: 1,
        cycles: 4,
      },

      // LD A, H
      0x7c: {
        instruction: () => this.instruction.LD_r1_r2("A", "H"),
        length: 1,
        cycles: 4,
      },

      // LD A, L
      0x7d: {
        instruction: () => this.instruction.LD_r1_r2("A", "L"),
        length: 1,
        cycles: 4,
      },

      // LD A, (HL)
      0x7e: {
        instruction: () => this.instruction.LD_r1_r2("A", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD A, A
      0x7f: {
        instruction: () => this.instruction.LD_r1_r2("A", "A"),
        length: 1,
        cycles: 4,
      },

      // LDH (a8), A
      0xe0: {
        instruction: () => this.instruction.LDH_n_A(this.mem[this.pc + 1]), // a8 is next pc address
        length: 2,
        cycles: 12,
      },

      // LD (C), A
      0xe2: {
        instruction: () => this.instruction.LD_OffsetC_A(),
        length: 1,
        cycles: 8,
      },

      // LD (a16), A
      0xea: {
        instruction: () => this.instruction.LD_n_A("a16", true),
        length: 3,
        cycles: 16,
      },

      // LDH A, (a8)
      0xf0: {
        instruction: () => this.instruction.LDH_A_n(this.mem[this.pc + 1]), // a8 is next pc address
        length: 2,
        cycles: 12,
      },

      // LD A, (C)
      0xf2: {
        instruction: () => this.instruction.LD_A_OffsetC(),
        length: 1,
        cycles: 8,
      },

      // LD A, (a16)
      0xfa: {
        instruction: () => this.instruction.LD_A_n("a16", true),
        length: 3,
        cycles: 16,
      },
    };
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
      } else console.error("Unknown combined register: " + register);
    } else console.error("Unknown register: " + register);
  }

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

  getImmediate16Bit() {
    const lowByte = this.mem[this.pc + 1];
    const highByte = this.mem[this.pc + 2];

    return (highByte << 8) | lowByte;
  }

  executeInstruction(opcode) {
    const fetch = this.instructionTable[opcode];
    if (!fetch) throw new Error(`Unknown opcode: ${opcode}`);
    fetch.instruction();
  }
}

export class CPU {
  constructor() {
    this.registersValues = new Uint8Array(8); // a-l 8 bit registers
    this.mem = new Uint8Array(0x10000);
    this.pc = 0x100; // Program Counter. Initialized at 0x100
    this.sp = 0xfffe; // Stack Pointer.  Initialized at 0xfffe
    this.ime = 0; // Interrup master enable flag. Starts at 0
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
}

export class Instruction {
  constructor(cpu) {
    this.cpu = cpu;
  }

  // --------------------- 8-bit LD functions ---------------------

  /**
   * Loads an 8-bit immediate value into a specified register.
   * @param {string} dstReg - The destination register.
   * @param {number} value - The 8-bit immediate value to load.
   */
  LD_nn_n(dstReg, value) {
    this.cpu.setRegister(dstReg, value);
  }

  /**
   * Transfers an 8-bit value between two registers, or between a register and memory address stored in register HL.
   * Also covers the opcode 36 LD (HL), n (Load 8-bit immediate to address stored in HL)
   * @param {string|number} srcReg - The source register or memory address.
   * @param {string|number} dstReg - The destination register or memory address.
   */
  LD_r1_r2(srcReg, dstReg) {
    // Source register is a combined register (pointer). Load value from pointer address
    if (srcReg.length == 2) {
      const address = this.cpu.getRegister(srcReg);
      this.cpu.setRegister(dstReg, this.cpu.mem[address]);
    }

    // Dest. register is a combined register (pointer). Load value into pointer address
    else if (dstReg.length == 2) {
      const address = this.cpu.getRegister(dstReg);
      // If source is an immediate, then load 8-bit value directly.
      this.cpu.mem[address] = this.isImmediate(srcReg)
        ? srcReg
        : this.cpu.getRegister(srcReg);
    }

    // Source and dest are simple registers
    else this.cpu.setRegister(dstReg, this.cpu.getRegister(srcReg));
  }

  /**
   * Loads a value into the A register.
   * @param {string|number} value - The value to load (register name, memory address, or immediate value).
   * @param {boolean} [isPointer=false] - Whether the value is a memory pointer.
   */
  LD_A_n(value, isPointer = false) {
    if (isPointer) {
      // Value is a 16-bit immediate pointer to a memory address
      if (this.isImmediate(value))
        this.cpu.setRegister("A", this.cpu.mem[value]);
      // Value is a combined register that points to a memory address
      else {
        const address = this.cpu.getRegister(value);
        this.cpu.setRegister("A", this.cpu.mem[address]);
      }
    }

    // Value is a 8-bit immediate
    else if (this.isImmediate(value)) this.cpu.setRegister("A", value);
    // Value is a simple register
    else this.cpu.setRegister("A", this.cpu.getRegister(value));
  }

  /**
   * Stores the value from the A register into a specified destination.
   * @param {string|number} value - The destination register or memory address.
   * @param {boolean} [isPointer=false] - Whether the destination is a memory pointer.
   */
  LD_n_A(value, isPointer = false) {
    if (isPointer) {
      // Value is a 16-bit immediate pointer to a memory address
      if (this.isImmediate(value))
        this.cpu.mem[value] = this.cpu.getRegister("A");
      // Value is a combined register that points to a memory address
      else {
        const address = this.cpu.getRegister(value);
        this.cpu.mem[address] = this.cpu.getRegister("A");
      }
    }

    // Value is a simple register
    else this.cpu.setRegister(value, this.cpu.getRegister("A"));
  }

  /**
   * Loads the value at memory address (0xFF00 + C) into the A register.
   */
  LD_A_OffsetC() {
    // C register value (offset)
    const C = this.cpu.getRegister("C");

    const value = this.cpu.mem[0xff00 + C];

    this.cpu.setRegister("A", value);
  }

  /**
   * Stores the value of the A register into memory address (0xFF00 + C).
   */
  LD_OffsetC_A() {
    // C register value (offset)
    const C = this.cpu.getRegister("C");

    const address = 0xff00 + C;

    this.cpu.mem[address] = this.cpu.getRegister("A");
  }

  /**
   * Loads the value at memory address HL into the A register and decrements HL.
   */
  LDD_A_HL() {
    const address = this.cpu.getRegister("HL");

    const value = this.cpu.mem[address];

    this.cpu.setRegister("A", value);

    this.cpu.setRegister("HL", address - 1);
  }

  /**
   * Stores the value of the A register into memory address HL and decrements HL.
   */
  LDD_HL_A() {
    const address = this.cpu.getRegister("HL");

    this.cpu.mem[address] = this.cpu.getRegister("A");

    this.cpu.setRegister("HL", address - 1);
  }

  /**
   * Loads the value at memory address HL into the A register and increments HL.
   */

  LDI_A_HL() {
    const address = this.cpu.getRegister("HL");

    const value = this.cpu.mem[address];

    this.cpu.setRegister("A", value);

    this.cpu.setRegister("HL", address + 1);
  }

  /**
   * Stores the value of the A register into memory address HL and increments HL.
   */
  LDI_HL_A() {
    const address = this.cpu.getRegister("HL");

    this.cpu.mem[address] = this.cpu.getRegister("A");

    this.cpu.setRegister("HL", address + 1);
  }

  /**
   * Stores the value of the A register into memory address (0xFF00 + n).
   * @param {number} n - The 8-bit offset.
   */
  LDH_n_A(n) {
    const address = 0xff00 + n;

    this.cpu.mem[address] = this.cpu.getRegister("A");
  }

  /**
   * Loads the value at memory address (0xFF00 + n) into the A register.
   * @param {number} n - The 8-bit offset.
   */
  LDH_A_n(n) {
    const value = this.cpu.mem[0xff00 + n];

    this.cpu.setRegister("A", value);
  }

  // --------------------- 16-bit LD functions ---------------------

  /**
   * Loads a 16-bit immediate value into the specified destination register or stack pointer.
   * @param {string} dstReg - Destination register (e.g., "SP" or a combined register like "HL").
   * @param {number} value - 16-bit immediate value to load.
   */
  LD_n_nn(dstReg, value) {
    // Dest. register is Stack Pointer
    if (dstReg == "SP") this.cpu.sp = value;
    // Dest. register is a combined register
    else this.cpu.setRegister(dstReg, value);
  }

  /**
   * Loads the value from the HL register into the stack pointer (SP).
   */
  LD_SP_HL() {
    const HL = this.cpu.getRegister("HL");
    this.cpu.sp = HL;
  }

  /**
   * Adds an 8-bit signed immediate value to the stack pointer and stores the result in HL.
   * Updates the H and C flags.
   * @param {number} n - Signed 8-bit immediate value to add to SP.
   */
  LDHL_SP_n(n) {
    const result = this.cpu.sp + n;

    // Set sum's result in HL register
    this.cpu.setRegister("HL", result);

    // Calculate the Half Carry flag (H): Carry from bit 3 to bit 4
    const halfCarry = this.isHalfCarry8bit(this.cpu.sp, n, "add");

    // Calculate the Carry flag (C): Carry from bit 7 to bit 8
    const carry = this.isCarry8bit(this.cpu.sp, n, "add");

    // Update flags
    this.cpu.setFlags("00HC", { H: halfCarry, C: carry });
  }

  /**
   * Stores the stack pointer (SP) value into a memory location specified by a 16-bit address.
   * @param {number} address - 16-bit memory address to store SP.
   */
  LD_nn_SP(address) {
    const lowByte = this.cpu.sp & 0xff;
    const highByte = (this.cpu.sp & 0xff00) >> 8;

    this.cpu.mem[address] = lowByte;
    this.cpu.mem[address + 1] = highByte;
  }

  /**
   * Pushes the value of a 16-bit register onto the stack.
   * Decrements SP twice before storing the values.
   * @param {string} register - Combined register to push (e.g., "AF", "BC").
   */
  push(register) {
    // Decrement SP twice
    this.cpu.sp -= 2;

    // Split register into high & low
    const highRegister = this.cpu.getRegister(register[0]);
    const lowRegister = this.cpu.getRegister(register[1]);

    // Storage highRegister at address sp & lowRegister at address sp+1
    this.cpu.mem[this.cpu.sp] = highRegister;
    this.cpu.mem[this.cpu.sp + 1] = lowRegister;
  }

  /**
   * Pops a 16-bit value from the stack into the specified register.
   * Increments SP twice after retrieving the values.
   * @param {string} register - Combined register to load the popped value into (e.g., "AF", "BC").
   */
  pop(register) {
    // Get current sp value (highByte) and next one (lowByte)
    const highByte = this.cpu.mem[this.cpu.sp];
    const lowByte = this.cpu.mem[this.cpu.sp + 1];

    // Bitwise OR to make 16-bit value
    const value = (highByte << 8) | lowByte;

    // Storage popped value into register
    this.cpu.setRegister(register, value);

    // Increment SP twice
    this.cpu.sp += 2;
  }

  // --------------------- 8-bit ALU functions ---------------------

  ADD_A_n(value) {
    const registerA = this.cpu.getRegister("A");
    let add;

    // Determine the value to add
    if (value === "HL") {
      add = this.cpu.mem[this.cpu.getRegister("HL")]; // Memory address stored in HL
    } else if (this.isImmediate(value)) add = value; // Immediate 8-bit value
    else add = this.cpu.getRegister(value); // Simple register value

    const result = registerA + add;

    // Calculate flags
    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H: this.isHalfCarry8bit(registerA, add, "add"), // Half-carry
      C: this.isCarry8bit(registerA, add, "add"), // Carry
    };

    // Update the A register with the result (truncated to 8 bits)
    this.cpu.setRegister("A", result & 0xff);

    // Set flags Z0HC
    this.cpu.setFlags("Z0HC", flags);
  }

  ADC_A_n(value) {
    const carryBit = (this.cpu.getRegister("F") & 0b00010000) >> 4; // Extract carry flag
    const registerA = this.cpu.getRegister("A");
    let add;

    // Determine the value to add
    if (value === "HL") {
      add = this.cpu.mem[this.cpu.getRegister("HL")]; // Memory address stored in HL
    } else if (this.isImmediate(value)) add = value; // Immediate 8-bit value
    else add = this.cpu.getRegister(value); // Simple register value

    const result = registerA + add + carryBit;

    // Calculate flags
    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H: this.isHalfCarry8bit(registerA, add + carryBit, "add"), // Half-carry with carry bit included
      C: this.isCarry8bit(registerA, add + carryBit, "add"), // Carry with carry bit included
    };

    // Update the A register with the result (truncated to 8 bits)
    this.cpu.setRegister("A", result & 0xff);

    // Set flags Z0HC
    this.cpu.setFlags("Z0HC", flags);
  }

  SUB_A_n(value) {
    const registerA = this.cpu.getRegister("A");
    let sub;

    // Determine the value to sub
    if (value === "HL") {
      sub = this.cpu.mem[this.cpu.getRegister("HL")]; // Memory address stored in HL
    } else if (this.isImmediate(value)) sub = value; // Immediate 8-bit value
    else sub = this.cpu.getRegister(value); // Simple register value

    const result = registerA - sub;

    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H: this.isHalfCarry8bit(registerA, sub, "sub"), // Half-carry with carry bit included
      C: this.isCarry8bit(registerA, sub, "sub"), // Carry with carry bit included
    };

    // Update the A register with the result (truncated to 8 bits)
    this.cpu.setRegister("A", result & 0xff);

    // Set flags Z1HC
    this.cpu.setFlags("Z1HC", flags);
  }

  SBC_A_n(value) {
    const carryBit = (this.cpu.getRegister("F") & 0b00010000) >> 4; // Extract carry flag
    const registerA = this.cpu.getRegister("A");
    let sub;

    // Determine the value to sub
    if (value === "HL") {
      sub = this.cpu.mem[this.cpu.getRegister("HL")]; // Memory address stored in HL
    } else if (this.isImmediate(value)) sub = value; // Immediate 8-bit value
    else sub = this.cpu.getRegister(value); // Simple register value

    const result = registerA - (sub + carryBit);

    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H: this.isHalfCarry8bit(registerA, sub + carryBit, "sub"), // Half-carry with carry bit included
      C: this.isCarry8bit(registerA, sub + carryBit, "sub"), // Carry with carry bit included
    };

    // Update the A register with the result (truncated to 8 bits)
    this.cpu.setRegister("A", result & 0xff);

    // Set flags Z1HC
    this.cpu.setFlags("Z1HC", flags);
  }

  AND_n(value) {
    const registerA = this.cpu.getRegister("A");
    let and;

    // Determine the value to and
    if (value === "HL") {
      and = this.cpu.mem[this.cpu.getRegister("HL")]; // Memory address stored in HL
    } else if (this.isImmediate(value)) and = value; // Immediate 8-bit value
    else and = this.cpu.getRegister(value); // Simple register value

    const result = registerA & and;

    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
    };

    // Update the A register with the result (truncated to 8 bits)
    this.cpu.setRegister("A", result & 0xff);

    // Set flags Z1HC
    this.cpu.setFlags("Z010", flags);
  }

  OR_n(value) {
    const registerA = this.cpu.getRegister("A");
    let or;

    // Determine the value to or
    if (value === "HL") {
      or = this.cpu.mem[this.cpu.getRegister("HL")]; // Memory address stored in HL
    } else if (this.isImmediate(value)) or = value; // Immediate 8-bit value
    else or = this.cpu.getRegister(value); // Simple register value

    const result = registerA | or;

    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
    };

    // Update the A register with the result (truncated to 8 bits)
    this.cpu.setRegister("A", result & 0xff);

    // Set flags Z1HC
    this.cpu.setFlags("Z000", flags);
  }

  XOR_n(value) {
    const registerA = this.cpu.getRegister("A");
    let xor;

    // Determine the value to xor
    if (value === "HL") {
      xor = this.cpu.mem[this.cpu.getRegister("HL")]; // Memory address stored in HL
    } else if (this.isImmediate(value)) xor = value; // Immediate 8-bit value
    else xor = this.cpu.getRegister(value); // Simple register value

    const result = registerA ^ xor;

    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
    };

    // Update the A register with the result (truncated to 8 bits)
    this.cpu.setRegister("A", result & 0xff);

    // Set flags Z1HC
    this.cpu.setFlags("Z000", flags);
  }

  CP_n(value) {
    const registerA = this.cpu.getRegister("A");
    let cp;

    // Determine the value to compare
    if (value === "HL") {
      cp = this.cpu.mem[this.cpu.getRegister("HL")]; // Memory address stored in HL
    } else if (this.isImmediate(value)) cp = value; // Immediate 8-bit value
    else cp = this.cpu.getRegister(value); // Simple register value

    const result = registerA - cp;

    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H: this.isHalfCarry8bit(registerA, cp, "sub"), // Half-carry
      C: this.isCarry8bit(registerA, cp, "sub"), // Carry
    };

    // Set flags Z1HC
    this.cpu.setFlags("Z1HC", flags);
  }

  INC_n(register) {
    let registerValue = this.cpu.getRegister(register);
    let result;

    if (register === "HL") {
      // Increment value at memory address HL
      result = ++this.cpu.mem[registerValue];
    } else {
      // Increment register value
      result = ++registerValue;
      this.cpu.setRegister(register, result);
    }

    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H: this.isHalfCarry8bit(result - 1, 1, "add"), // Half-carry
    };

    // Set flags Z0H-
    this.cpu.setFlags("Z0H-", flags);
  }

  DEC_n(register) {
    let registerValue = this.cpu.getRegister(register);
    let result;

    if (register === "HL") {
      // Decrement value at memory address HL
      result = --this.cpu.mem[registerValue];
    } else {
      // Decrement register value
      result = --registerValue;
      this.cpu.setRegister(register, result);
    }

    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H: this.isHalfCarry8bit(result + 1, 1, "sub"), // Half-carry
    };

    // Set flags Z1H-
    this.cpu.setFlags("Z1H-", flags);
  }

  // --------------------- 16-bit Arithmetic functions ---------------------
  ADD_HL_n(register) {
    const registerHL = this.cpu.getRegister("HL");
    let add;

    if (register === "SP") add = this.cpu.sp; // Src. reg. is Stack Pointer
    else add = this.cpu.getRegister(register); // Src. reg. is a combined reg.

    const result = registerHL + add;

    // Calculate flags
    const flags = {
      H: this.isHalfCarry16bit(registerHL, add, "add"), // Half-carry
      C: this.isCarry16bit(registerHL, add, "add"), // Carry
    };

    // Update the A register with the result (truncated to 16 bits)
    this.cpu.setRegister("HL", result & 0xffff);

    // Set flags -0HC
    this.cpu.setFlags("-0HC", flags);
  }

  ADD_SP_n(value) {
    const sp = this.cpu.sp;
    const result = sp + value;

    // Calculate flags
    const flags = {
      H: this.isHalfCarry16bit(sp, value, "add"), // Half-carry
      C: this.isCarry16bit(sp, value, "add"), // Carry
    };

    // Update the SP with the result (truncated to 16 bits)
    this.cpu.sp = result & 0xffff;

    // Set flags 00HC
    this.cpu.setFlags("00HC", flags);
  }

  INC_nn(register) {
    if (register === "SP") this.cpu.sp++; // Dst. reg. is Stack Pointer
    else this.cpu.setRegister(this.cpu.getRegister(register) + 1); // Dst. reg. is combined reg.
  }

  DEC_nn(register) {
    if (register === "SP") this.cpu.sp--; // Dst. reg. is Stack Pointer
    else this.cpu.setRegister(this.cpu.getRegister(register) - 1); // Dst. reg. is combined reg.
  }

  // --------------------- Miscellaneous functions ---------------------
  SWAP_n(register) {
    function swapNibbles(value) {
      return ((value & 0x0f) << 4) | ((value & 0xf0) >> 4);
    }

    let result; // Value swapped

    // Target is value stored in address HL
    if (register == "HL") {
      let address = this.cpu.mem[this.cpu.getRegister("HL")];
      result = swapNibbles(this.cpu.mem[address]);
      this.cpu.mem[address] = result;
    }
    // Target is a simple register
    else {
      let value = this.cpu.getRegister(register);
      result = swapNibbles(value);
      this.cpu.setRegister(register, result);
    }

    // Set Z000 flags
    this.cpu.setFlags("Z000", { Z: result == 0 });
  }

  // TODO: DAA instruction
  DAA() {}

  CPL() {
    let registerA = this.cpu.getRegister("A");

    registerA = ~registerA & 0xff;

    this.cpu.setRegister("A", registerA);

    this.cpu.setFlags("-11-");
  }

  CCF() {
    const carry = (this.cpu.getRegister("F") & (0b00010000 >> 4)) == 1;

    this.cpu.setFlags("-00C", { C: !carry });
  }

  SCF() {
    this.cpu.setFlags("-001");
  }

  // TODO: HALT instrruction
  HALT() {}

  // TODO: STOP instrruction
  STOP() {}

  DI() {
    this.cpu.ime = 0;
  }

  // TODO: EI must enable interruptions after next machine cycle
  EI() {
    this.cpu.ime = 1;
  }

  // --------------------- Rotates & Shifts functions ---------------------
  leftRotate(value) {
    const msb = value >> 7; // Most significant bit (bit 7)
    const result = ((value << 1) | msb) & 0xff; // Left rotate

    // Set Z & C flags. Old msb bit is stored in C flag
    this.setRotationFlags(result, msb);

    return result;
  }

  leftRotateCarry(value) {
    const msb = value >> 7; // Most significant bit (bit 7)
    const flagC = (this.cpu.getRegister("F") & 0b00010000) >> 4;
    const result = ((value << 1) | flagC) & 0xff; // Left rotate

    // Set Z & C flags. Old msb bit is stored in C flag
    this.setRotationFlags(result, msb);

    return result;
  }

  rightRotate(value) {
    const lsb = value & 0x01; // Least significant bit (bit 0)
    const result = ((value >> 1) | (lsb << 7)) & 0xff; // Right rotate

    // Set Z & C flags. Old lsb bit is stored in C flag
    this.setRotationFlags(result, lsb);

    return result;
  }

  rightRotateCarry(value) {
    const lsb = value & 0x01; // Least significant bit (bit 0)
    const flagC = (this.cpu.getRegister("F") & 0b00010000) >> 4;
    const result = ((value >> 1) | (flagC << 7)) & 0xff; // Right rotate

    // Set Z & C flags. Old lsb bit is stored in C flag
    this.setRotationFlags(result, lsb);

    return result;
  }

  setRotationFlags(result, carryBit) {
    // Set Z & C flags. Old lsb bit is stored in C flag
    const flags = {
      Z: result === 0,
      C: carryBit === 1,
    };

    this.cpu.setFlags("Z00C", flags);
  }

  RLCA() {
    let A = cpu.getRegister("A");
    const leftRotation = this.leftRotate(A);

    this.cpu.setRegister("A", leftRotation);
  }

  RLA() {
    let A = cpu.getRegister("A");
    const leftRotation = this.leftRotateCarry(A);

    this.cpu.setRegister("A", leftRotation);
  }

  RRCA() {
    let A = cpu.getRegister("A");
    const rightRotation = this.rightRotate(A);

    this.cpu.setRegister("A", rightRotation);
  }

  RRA() {
    let A = cpu.getRegister("A");
    const rightRotation = this.rightRotateCarry(A);

    this.cpu.setRegister("A", rightRotation);
  }

  RLC_n(register) {
    let value;
    let leftRotation;

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mem[HL];
      leftRotation = this.leftRotate(value);
      this.cpu.mem[HL] = leftRotation;
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      leftRotation = this.leftRotate(value);
      this.cpu.setRegister(register, leftRotation);
    }
  }

  RL_n(register) {
    let value;
    let leftRotation;

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mem[HL];
      leftRotation = this.leftRotateCarry(value);
      this.cpu.mem[HL] = leftRotation;
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      leftRotation = this.leftRotateCarry(value);
      this.cpu.setRegister(register, leftRotation);
    }
  }

  RRC_n(register) {
    let value;
    let leftRotation;

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mem[HL];
      leftRotation = this.rightRotate(value);
      this.cpu.mem[HL] = leftRotation;
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      leftRotation = this.rightRotate(value);
      this.cpu.setRegister(register, leftRotation);
    }
  }

  RR_n(register) {
    let value;
    let leftRotation;

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mem[HL];
      leftRotation = this.rightRotateCarry(value);
      this.cpu.mem[HL] = leftRotation;
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      leftRotation = this.rightRotateCarry(value);
      this.cpu.setRegister(register, leftRotation);
    }
  }

  SLA_n(register) {
    let value;
    let leftShift;
    let msb; // Most significant bit (bit 7)

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mem[HL];
      leftShift = (value << 1) & 0xff; // Left shift
      this.cpu.mem[HL] = leftShift;
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      leftShift = (value << 1) & 0xff; // Left shift
      this.cpu.setRegister(register, leftShift);
    }

    // Set Z & C flags (same as rotation instructions)
    msb = value >> 7;
    this.setRotationFlags(leftShift, msb);
  }

  SRA_n(register) {
    let value;
    let rightShift;
    let lsb; // Least significant bit (bit 0)
    let msb; // Most significant bit (bit 7)

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mem[HL];
      msb = value >> 7;
      rightShift = ((value >> 1) | (msb << 7)) & 0xff; // Right shift not changing msb
      this.cpu.mem[HL] = rightShift;
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      msb = value >> 7;
      rightShift = ((value >> 1) | (msb << 7)) & 0xff; // Right shift not changing msb
      this.cpu.setRegister(register, rightShift);
    }

    // Set Z & C flags (same as rotation instructions)
    lsb = value & 0x01;
    this.setRotationFlags(rightShift, lsb);
  }

  SRL_n(register) {
    let value;
    let rightShift;
    let lsb; // Least significant bit (bit 0)

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mem[HL];
      rightShift = (value >> 1) & 0xff; // Right shift
      this.cpu.mem[HL] = rightShift;
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      msb = value >> 7;
      rightShift = (value >> 1) & 0xff; // Right shift
      this.cpu.setRegister(register, rightShift);
    }

    // Set Z & C flags (same as rotation instructions)
    lsb = value & 0x01;
    this.setRotationFlags(rightShift, lsb);
  }

  /**
   * Determines if there is a half-carry (carry from bit 3 to bit 4) in an 8-bit addition.
   *
   * @param {number} a - The first operand (8-bit value).
   * @param {number} b - The second operand (8-bit value).
   * @param {string} operation - The operation type
   * @returns {boolean} - True if there is a half-carry, false otherwise.
   */
  isHalfCarry8bit(a, b, operation) {
    operation = operation.toLowerCase();
    let result;

    switch (operation) {
      case "add":
        // Perform the addition, checking for a carry from bit 3 to bit 4
        result = (a & 0xf) + (b & 0xf) > 0xf;
        break;

      case "sub":
        // Check for a borrow from bit 4
        result = (a & 0xf) < (b & 0xf);
        break;

      default:
        throw new Error("Unknown operation: " + operation);
    }

    return result;
  }

  /**
   * Determines if there is a half-carry (carry from bit 11) in an 16-bit operation.
   *
   * @param {number} a - The first operand (16-bit value).
   * @param {number} b - The second operand (16-bit value).
   * @param {string} operation - The operation type.
   * @returns {boolean} - True if there is a half-carry, false otherwise.
   */
  isHalfCarry16bit(a, b, operation) {
    operation = operation.toLowerCase();
    let result;

    switch (operation) {
      case "add":
        // Perform the addition, checking for a carry from bit 11
        result = (a & 0xfff) + (b & 0xfff) > 0xfff;
        break;

      case "sub":
        // Check for a borrow from bit 11
        result = (a & 0xfff) < (b & 0xfff);
        break;

      default:
        throw new Error("Unknown operation: " + operation);
    }

    return result;
  }

  /**
   * Determines if there is a carry (carry from bit 7 to bit 8) in an 8-bit addition.
   *
   * @param {number} a - The first operand (8-bit value).
   * @param {number} b - The second operand (8-bit value).
   * @param {string} operation - The operation type.
   * @returns {boolean} - True if there is a carry, false otherwise.
   */
  isCarry8bit(a, b, operation) {
    operation = operation.toLowerCase();
    let result;

    switch (operation) {
      case "add":
        // Perform the addition, checking for a carry from bit 7 to bit 8
        result = (a & 0xff) + (b & 0xff) > 0xff;
        break;

      case "sub":
        // Check for borrow
        result = (a & 0xff) < (b & 0xff);
        break;

      default:
        throw new Error("Unknown operation: " + operation);
    }

    return result;
  }

  /**
   * Determines if there is a carry (carry from bit 15) in an 16-bit operation.
   *
   * @param {number} a - The first operand (16-bit value).
   * @param {number} b - The second operand (16-bit value).
   * @param {string} operation - The operation type.
   * @returns {boolean} - True if there is a carry, false otherwise.
   */
  isCarry16bit(a, b, operation) {
    operation = operation.toLowerCase();
    let result;

    switch (operation) {
      case "add":
        // Perform the addition, checking for a carry from bit 15
        result = (a & 0xffff) + (b & 0xffff) > 0xffff;
        break;

      case "sub":
        // Check for borrow
        result = (a & 0xffff) < (b & 0xffff);
        break;

      default:
        throw new Error("Unknown operation: " + operation);
    }

    return result;
  }

  isImmediate(value) {
    return typeof value === "number";
  }
}

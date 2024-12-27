export class CPU {
  constructor() {
    this.registersValues = new Uint8Array(8); // a-l 8 bit registers
    this.mem = new Uint8Array(0x10000);
    this.pc = 0x100; // Program Counter. Initialized at 0x100
    this.sp = 0xfffe; // Stack Pointer.  Initialized at 0xfffe
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
      const flagMask = 1 << (3 - i);

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
    let adder;

    // Determine the value to add
    if (value === "HL") {
      adder = this.cpu.mem[this.cpu.getRegister("HL")]; // Memory address stored in HL
    } else if (this.isImmediate(value)) adder = value; // Immediate 8-bit value
    else adder = this.cpu.getRegister(value); // Simple register value

    const result = registerA + adder;

    // Calculate flags
    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H: this.isHalfCarry8bit(registerA, adder, "add"), // Half-carry
      C: this.isCarry8bit(registerA, adder, "add"), // Carry
    };

    // Update the A register with the result (truncated to 8 bits)
    this.cpu.setRegister("A", result & 0xff);

    // Set flags Z0HC
    this.cpu.setFlags("Z0HC", flags);
  }

  ADC_A_n(value) {
    const carryBit = (this.cpu.getRegister("F") & 0b00010000) >> 4; // Extract carry flag
    const registerA = this.cpu.getRegister("A");
    let adder;

    // Determine the value to add
    if (value === "HL") {
      adder = this.cpu.mem[this.cpu.getRegister("HL")]; // Memory address stored in HL
    } else if (this.isImmediate(value)) adder = value; // Immediate 8-bit value
    else adder = this.cpu.getRegister(value); // Simple register value

    const result = registerA + adder + carryBit;

    // Calculate flags
    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H: this.isHalfCarry8bit(registerA, adder + carryBit, "add"), // Half-carry with carry bit included
      C: this.isCarry8bit(registerA, adder + carryBit, "add"), // Carry with carry bit included
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
      H: this.isHalfCarry8bit(registerA, sub, "sub"), // Half-carry
      C: this.isCarry8bit(registerA, sub, "sub"), // Carry
    };

    // Set flags Z1HC
    this.cpu.setFlags("Z1HC", flags);
  }

  INC_n(register) {
    const registerValue = this.cpu.getRegister(register);
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
    const registerValue = this.cpu.getRegister(register);
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

  isImmediate(value) {
    return typeof value === "number";
  }

  /**
   * Determines if there is a half-carry (carry from bit 3 to bit 4) in an 8-bit addition.
   *
   * @param {number} a - The first operand (8-bit value).
   * @param {number} b - The second operand (8-bit value).
   * @param {string} operation - The operation type ("add" in this case).
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
   * Determines if there is a carry (carry from bit 7 to bit 8) in an 8-bit addition.
   *
   * @param {number} a - The first operand (8-bit value).
   * @param {number} b - The second operand (8-bit value).
   * @param {string} operation - The operation type ("add" in this case).
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
}

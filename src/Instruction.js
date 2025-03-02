export class Instruction {
  constructor(cpu) {
    this.cpu = cpu;
  }

  // --------------------- 8-bit LD functions ---------------------

  /**
   * Loads an 8-bit immediate value into a specified register.
   * Immediate is stored in the next PC address.
   * @param {string} dstReg - The destination register.
   */
  LD_nn_n(dstReg) {
    this.cpu.setRegister(dstReg, this.cpu.mmu.readByte(this.cpu.pc + 1));
  }

  /**
   * Transfers an 8-bit value between two registers, or between a register and memory address stored in register HL.
   * Also covers the opcode 36 LD (HL), n (Load 8-bit immediate to address stored in HL)
   * @param {string|number} dstReg - The destination register or memory address.
   * @param {string|number} srcReg - The source register or memory address.
   */
  LD_r1_r2(dstReg, srcReg) {
    // Source register is a combined register (pointer). Load value from pointer address
    if (srcReg.length === 2) {
      const address = this.cpu.getRegister(srcReg);
      this.cpu.setRegister(dstReg, this.cpu.mmu.readByte(address));
    }

    // Dest. register is a combined register (pointer). Load value into pointer address
    else if (dstReg.length === 2) {
      const address = this.cpu.getRegister(dstReg);

      // If source is an immediate, then load 8-bit value directly.
      this.cpu.mmu.writeByte(
        address,
        this.isImmediate(srcReg) ? srcReg : this.cpu.getRegister(srcReg)
      );
    }

    // Source and dest are simple registers
    else this.cpu.setRegister(dstReg, this.cpu.getRegister(srcReg));
  }

  /**
   * Loads a value into the A register.
   * @param {string} value - The value to load. This can be:
   * - A register name (e.g., "B", "C").
   * - A memory address, indicated by:
   *   - A combined register name (e.g., "HL", when the value comes from the address pointed to by that register).
   *   - "a16" (when the value comes from an immediate 16-bit address. It's taken from the next 2 bytes pointed by pc).
   * - An 8-bit immediate value (indicated by "d8". It's take from next byte pointed by pc).
   * @param {boolean} [isPointer=false] - Whether the value is a memory pointer.
   */
  LD_A_n(value, isPointer = false) {
    if (isPointer) {
      // Value is a 16-bit immediate pointer to a memory address
      if (value === "a16") {
        this.cpu.setRegister(
          "A",
          this.cpu.mmu.readByte(this.cpu.getImmediate16Bit())
        );
      }
      // Value is a combined register that points to a memory address
      else {
        const address = this.cpu.getRegister(value);
        this.cpu.setRegister("A", this.cpu.mmu.readByte(address));
      }
    }

    // Value is a 8-bit immediate
    else if (value === "d8")
      this.cpu.setRegister("A", this.cpu.mmu.readByte(this.cpu.pc + 1));
    // Value is a simple register
    else this.cpu.setRegister("A", this.cpu.getRegister(value));
  }

  /**
   * Stores the value from the A register into a specified destination.
   * @param {string} value - The destination register or memory address.
   * - A register name (e.g., "B", "C").
   * - A memory address, indicated by:
   *   - A combined register name (e.g., "HL", when the value comes from the address pointed to by that register).
   *   - "a16" (when the value comes from an immediate 16-bit address. It's take from the next 2 bytes pointed by pc).
   * @param {boolean} [isPointer=false] - Whether the destination is a memory pointer.
   */
  LD_n_A(value, isPointer = false) {
    if (isPointer) {
      // Value is a 16-bit immediate pointer to a memory address.
      if (value === "a16")
        this.cpu.mmu.writeByte(
          this.cpu.getImmediate16Bit(),
          this.cpu.getRegister("A")
        );
      // Value is a combined register that points to a memory address
      else {
        const address = this.cpu.getRegister(value);
        this.cpu.mmu.writeByte(address, this.cpu.getRegister("A"));
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

    const value = this.cpu.mmu.readByte(0xff00 + C);

    this.cpu.setRegister("A", value);
  }

  /**
   * Stores the value of the A register into memory address (0xFF00 + C).
   */
  LD_OffsetC_A() {
    // C register value (offset)
    const C = this.cpu.getRegister("C");

    const address = 0xff00 + C;

    this.cpu.mmu.writeByte(address, this.cpu.getRegister("A"));
  }

  /**
   * Loads the value at memory address HL into the A register and decrements HL.
   */
  LDD_A_HL() {
    const address = this.cpu.getRegister("HL");

    const value = this.cpu.mmu.readByte(address);

    this.cpu.setRegister("A", value);

    this.cpu.setRegister("HL", address - 1);
  }

  /**
   * Stores the value of the A register into memory address HL and decrements HL.
   */
  LDD_HL_A() {
    const address = this.cpu.getRegister("HL");

    this.cpu.mmu.writeByte(address, this.cpu.getRegister("A"));

    this.cpu.setRegister("HL", address - 1);
  }

  /**
   * Loads the value at memory address HL into the A register and increments HL.
   */

  LDI_A_HL() {
    const address = this.cpu.getRegister("HL");

    const value = this.cpu.mmu.readByte(address);

    this.cpu.setRegister("A", value);

    this.cpu.setRegister("HL", address + 1);
  }

  /**
   * Stores the value of the A register into memory address HL and increments HL.
   */
  LDI_HL_A() {
    const address = this.cpu.getRegister("HL");

    this.cpu.mmu.writeByte(address, this.cpu.getRegister("A"));

    this.cpu.setRegister("HL", address + 1);
  }

  /**
   * Stores the value of the A register into memory address (0xFF00 + n).
   * @param {number} n - The 8-bit offset.
   */
  LDH_n_A(n) {
    const address = 0xff00 + n;

    this.cpu.mmu.writeByte(address, this.cpu.getRegister("A"));
  }

  /**
   * Loads the value at memory address (0xFF00 + n) into the A register.
   * @param {number} n - The 8-bit offset.
   */
  LDH_A_n(n) {
    const value = this.cpu.mmu.readByte(0xff00 + n);

    this.cpu.setRegister("A", value);
  }

  // --------------------- 16-bit LD functions ---------------------

  /**
   * Loads a 16-bit immediate value into the specified destination register or stack pointer.
   * @param {string} dstReg - Destination register (e.g., "SP" or a combined register like "HL").
   */
  LD_n_nn(dstReg) {
    // Get the 16-Bit immediate
    const value = this.cpu.getImmediate16Bit();
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
   */
  LDHL_SP_n() {
    const n = this.cpu.getSignedImmediate8Bit();
    const result = this.cpu.sp + n;
    // Set sum's result in HL register
    this.cpu.setRegister("HL", result);

    // Calculate the Half Carry flag (H): Carry from bit 3 to bit 4. If n is negative, check as a sub.
    const halfCarry = this.isHalfCarry8bit(
      this.cpu.sp,
      Math.abs(n),
      n < 0 ? "sub" : "add"
    );

    // Calculate the Carry flag (C): Carry from bit 7 to bit 8. If n is negative, check as a sub.
    const carry = this.isCarry8bit(
      this.cpu.sp,
      Math.abs(n),
      n < 0 ? "sub" : "add"
    );

    // Update flags
    this.cpu.setFlags("00HC", { H: halfCarry, C: carry });
  }

  /**
   * Stores the stack pointer (SP) value into a memory location specified by a 16-bit immediate address.
   */
  LD_nn_SP() {
    const address = this.cpu.getImmediate16Bit();

    this.cpu.mmu.writeWord(address, this.cpu.sp);
  }

  /**
   * Pushes a 16-bit immediate or combined register onto the stack.
   * Decrements SP twice before storing the values.
   * @param {string} value - 16-bit immediate or combined register to push (e.g., "AF", "BC").
   */
  push(value) {
    let word = value;

    // Target is a combined register
    if (!this.isImmediate(value)) {
      word = this.cpu.getRegister(value);
    }

    // Decrement SP twice
    this.cpu.sp -= 2;

    // Store word at SP address
    this.cpu.mmu.writeWord(this.cpu.sp, word);
  }

  /**
   * Pops a 16-bit value from the stack into the specified register.
   * Increments SP twice after retrieving the values.
   * @param {string} register - Combined register to load the popped value into (e.g., "AF", "BC").
   * @returns {number} - The 16-bit value popped.
   */
  pop(register) {
    // Get current sp value (lowByte) and next one (highByte)
    const highByte = this.cpu.mmu.readByte(this.cpu.sp + 1);
    const lowByte = this.cpu.mmu.readByte(this.cpu.sp);

    // Bitwise OR to make 16-bit value
    const value = (highByte << 8) | lowByte;

    // Storage popped value into register
    if (register !== undefined) this.cpu.setRegister(register, value);

    // Increment SP twice
    this.cpu.sp += 2;

    return value;
  }

  // --------------------- 8-bit ALU functions ---------------------
  /**
   * Adds a value to the A register and updates flags.
   * @param {string|number} value - The value to add. Can be a register name, "HL" for memory address, or an immediate value.
   */
  ADD_A_n(value) {
    const registerA = this.cpu.getRegister("A");
    let add;

    // Determine the value to add
    if (value === "HL") {
      add = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
    } else if (this.isImmediate(value)) add = value; // Immediate 8-bit value
    else add = this.cpu.getRegister(value); // Simple register value

    // Compute result & truncate to 8-bit
    const result = (registerA + add) & 0xff;

    // Calculate flags
    const flags = {
      Z: result === 0, // Zero flag: result
      H: this.isHalfCarry8bit(registerA, add, "add"), // Half-carry
      C: this.isCarry8bit(registerA, add, "add"), // Carry
    };

    // Update the A register with the result
    this.cpu.setRegister("A", result);

    // Set flags Z0HC
    this.cpu.setFlags("Z0HC", flags);
  }

  /**
   * Adds a value and the carry flag to the A register and updates flags.
   * @param {string|number} value - The value to add. Can be a register name, "HL" for memory address, or an immediate value.
   */
  ADC_A_n(value) {
    const carryBit = (this.cpu.getRegister("F") & 0b00010000) >> 4; // Extract carry flag
    const registerA = this.cpu.getRegister("A");
    let add;

    // Determine the value to add
    if (value === "HL") {
      add = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
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

  /**
   * Subtracts a value from the A register and updates flags.
   * @param {string|number} value - The value to subtract. Can be a register name, "HL" for memory address, or an immediate value.
   */
  SUB_A_n(value) {
    const registerA = this.cpu.getRegister("A");
    let sub;

    // Determine the value to sub
    if (value === "HL") {
      sub = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
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

  /**
   * Subtracts a value and the carry flag from the A register and updates flags.
   * @param {string|number} value - The value to subtract. Can be a register name, "HL" for memory address, or an immediate value.
   */
  SBC_A_n(value) {
    const carryBit = (this.cpu.getRegister("F") & 0b00010000) >> 4; // Extract carry flag
    const registerA = this.cpu.getRegister("A");
    let sub;

    // Determine the value to sub
    if (value === "HL") {
      sub = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
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

  /**
   * Performs a bitwise AND operation between the A register and a value, updating flags.
   * @param {string|number} value - The value to AND. Can be a register name, "HL" for memory address, or an immediate value.
   */
  AND_n(value) {
    const registerA = this.cpu.getRegister("A");
    let and;

    // Determine the value to and
    if (value === "HL") {
      and = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
    } else if (this.isImmediate(value)) and = value; // Immediate 8-bit value
    else and = this.cpu.getRegister(value); // Simple register value

    const result = registerA & and;

    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
    };

    // Update the A register with the result (truncated to 8 bits)
    this.cpu.setRegister("A", result & 0xff);

    // Set flags Z010
    this.cpu.setFlags("Z010", flags);
  }

  /**
   * Performs a bitwise OR operation between the A register and a value, updating flags.
   * @param {string|number} value - The value to OR. Can be a register name, "HL" for memory address, or an immediate value.
   */
  OR_n(value) {
    const registerA = this.cpu.getRegister("A");
    let or;

    // Determine the value to or
    if (value === "HL") {
      or = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
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

  /**
   * Performs a bitwise XOR operation between the A register and a value, updating flags.
   * @param {string|number} value - The value to XOR. Can be a register name, "HL" for memory address, or an immediate value.
   */
  XOR_n(value) {
    const registerA = this.cpu.getRegister("A");
    let xor;

    // Determine the value to xor
    if (value === "HL") {
      xor = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
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

  /**
   * Compares the A register with a value by performing subtraction without storing the result. Flags are updated.
   * @param {string|number} value - The value to compare. Can be a register name, "HL" for memory address, or an immediate value.
   */
  CP_n(value) {
    const registerA = this.cpu.getRegister("A");
    let cp;

    // Determine the value to compare
    if (value === "HL") {
      cp = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
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

  /**
   * Increments the value of a register or the memory at the HL address, updating flags.
   * @param {string} register - The name of the register or "HL" for memory address to increment.
   */
  INC_n(register) {
    let registerValue = this.cpu.getRegister(register);
    let result;

    if (register === "HL") {
      // Increment value at memory address HL
      result = this.cpu.mmu.readByte(registerValue);
      result++;
      this.cpu.mmu.writeByte(registerValue, result);
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

  /**
   * Decrements the value of a register or the memory at the HL address, updating flags.
   * @param {string} register - The name of the register or "HL" for memory address to decrement.
   */
  DEC_n(register) {
    let registerValue = this.cpu.getRegister(register);
    let result;

    if (register === "HL") {
      // Decrement value at memory address HL
      result = this.cpu.mmu.readByte(registerValue);
      result--;
      this.cpu.mmu.writeByte(registerValue, result);
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
  /**
   * Adds a 16-bit register value to the HL register pair and updates flags.
   * @param {string} register - The name of the 16-bit register to add or "SP" (Stack Pointer) (e.g., "BC" or another combined register).
   */
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

  /**
   * Adds an immediate 8-bit signed value to the Stack Pointer (SP) and updates flags.
   */
  ADD_SP_n() {
    const sp = this.cpu.sp;
    const value = this.cpu.getSignedImmediate8Bit();
    const result = sp + value;

    // Calculate flags
    const flags = {
      H: this.isHalfCarry8bit(sp, Math.abs(value), value < 0 ? "sub" : "add"), // Half-carry. If value is negative, checks as a sub
      C: this.isCarry8bit(sp, Math.abs(value), value < 0 ? "sub" : "add"), // Carry. If value is negative, checks as a sub
    };

    // Update the SP with the result (truncated to 16 bits)
    this.cpu.sp = result & 0xffff;

    // Set flags 00HC
    this.cpu.setFlags("00HC", flags);
  }

  /**
   * Increments the value of a 16-bit register or the Stack Pointer (SP).
   * @param {string} register - The name of the 16-bit register to increment, or "SP" for the Stack Pointer.
   */
  INC_nn(register) {
    if (register === "SP") this.cpu.sp++; // Dst. reg. is Stack Pointer
    else this.cpu.setRegister(register, this.cpu.getRegister(register) + 1); // Dst. reg. is combined reg.
  }

  /**
   * Decrements the value of a 16-bit register or the Stack Pointer (SP).
   * @param {string} register - The name of the 16-bit register to decrement, or "SP" for the Stack Pointer.
   */
  DEC_nn(register) {
    if (register === "SP") this.cpu.sp--; // Dst. reg. is Stack Pointer
    else this.cpu.setRegister(register, this.cpu.getRegister(register) - 1); // Dst. reg. is combined reg.
  }

  // --------------------- Miscellaneous functions ---------------------
  SWAP_n(register) {
    const swapNibbles = (value) => {
      return ((value & 0x0f) << 4) | ((value & 0xf0) >> 4);
    };

    let result; // Value swapped

    // Target is value stored in address HL
    if (register == "HL") {
      let address = this.cpu.getRegister("HL");
      result = swapNibbles(this.cpu.mmu.readByte(address));
      this.cpu.mmu.writeByte(address, result);
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

  DAA() {
    const flags = this.cpu.getRegister("F");
    const flagN = (flags >> 6) & 1;
    const flagH = (flags >> 5) & 1;
    const flagC = (flags >> 4) & 1;
    const registerA = this.cpu.getRegister("A");
    let adjustment = 0;
    let result = 0;
    let carry = false;

    if (flagN) {
      if (flagH) adjustment -= 0x6;
      if (flagC) adjustment -= 0x60;
    } else {
      if (flagH || (registerA & 0xf) > 0x9) adjustment += 0x6;
      if (flagC || registerA > 0x99) {
        adjustment += 0x60;
        carry = true;
      }
    }

    result = registerA + adjustment;
    this.cpu.setRegister("A", result);

    this.cpu.setFlags("Z-0C", { Z: result == 0, C: carry });
  }

  CPL() {
    let registerA = this.cpu.getRegister("A");

    registerA = ~registerA;

    this.cpu.setRegister("A", registerA);

    this.cpu.setFlags("-11-");
  }

  CCF() {
    const carry = (this.cpu.getRegister("F") & 0b00010000) >> 4 == 1;

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

  EI() {
    this.cpu.requestIme = 2;
  }

  PREFIX_CB(opcode) {
    const fetch = this.cpu.prefixInstructionTable[opcode]; // Fetch opcode's instruction
    if (!fetch) throw new Error("Unknown opcode: " + opcode);

    fetch.instruction(); // Execute instruction

    return fetch.cycles; // Return instruction cycles
  }

  // --------------------- Rotates & Shifts functions ---------------------
  /**
   * Performs a left rotation on the given 8-bit value.
   * The most significant bit (MSB) is shifted to the least significant bit (LSB).
   * Updates the Z and C flags based on the result and the old MSB.
   *
   * @param {number} value - The 8-bit value to rotate.
   * @returns {number} - The result of the left rotation.
   */
  leftRotate(value) {
    const msb = value >> 7; // Most significant bit (bit 7)
    const result = ((value << 1) | msb) & 0xff; // Left rotate

    // Set Z & C flags. Old msb bit is stored in C flag
    this.setRotationFlags(result, msb);

    return result;
  }

  /**
   * Performs a left rotation on the given 8-bit value, incorporating the carry flag.
   * The carry flag is shifted into the least significant bit (LSB), and the MSB is used to update the carry flag.
   * Updates the Z and C flags based on the result and the old MSB.
   *
   * @param {number} value - The 8-bit value to rotate.
   * @returns {number} - The result of the left rotation with carry.
   */
  leftRotateCarry(value) {
    const msb = value >> 7; // Most significant bit (bit 7)
    const flagC = (this.cpu.getRegister("F") & 0b00010000) >> 4;
    const result = ((value << 1) | flagC) & 0xff; // Left rotate

    // Set Z & C flags. Old msb bit is stored in C flag
    this.setRotationFlags(result, msb);

    return result;
  }

  /**
   * Performs a right rotation on the given 8-bit value.
   * The least significant bit (LSB) is shifted to the most significant bit (MSB).
   * Updates the Z and C flags based on the result and the old LSB.
   *
   * @param {number} value - The 8-bit value to rotate.
   * @returns {number} - The result of the right rotation.
   */
  rightRotate(value) {
    const lsb = value & 0x01; // Least significant bit (bit 0)
    const result = ((value >> 1) | (lsb << 7)) & 0xff; // Right rotate

    // Set Z & C flags. Old lsb bit is stored in C flag
    this.setRotationFlags(result, lsb);

    return result;
  }

  /**
   * Performs a right rotation on the given 8-bit value, incorporating the carry flag.
   * The carry flag is shifted into the most significant bit (MSB), and the LSB is used to update the carry flag.
   * Updates the Z and C flags based on the result and the old LSB.
   *
   * @param {number} value - The 8-bit value to rotate.
   * @returns {number} - The result of the right rotation with carry.
   */
  rightRotateCarry(value) {
    const lsb = value & 0x01; // Least significant bit (bit 0)
    const flagC = (this.cpu.getRegister("F") & 0b00010000) >> 4;
    const result = ((value >> 1) | (flagC << 7)) & 0xff; // Right rotate

    // Set Z & C flags. Old lsb bit is stored in C flag
    this.setRotationFlags(result, lsb);

    return result;
  }

  /**
   * Sets the zero (Z) and carry (C) flags based on the rotation result and carry bit.
   *
   * @param {number} result - The result of the rotation or shift.
   * @param {number} carryBit - The bit shifted out during the operation.
   */
  setRotationFlags(result, carryBit) {
    // Set Z & C flags. Old lsb bit is stored in C flag
    const flags = {
      Z: result === 0,
      C: carryBit === 1,
    };

    this.cpu.setFlags("Z00C", flags);
  }

  /**
   * Performs a left rotation on the accumulator register (A).
   * Updates the A register with the result.
   */
  RLCA() {
    let A = this.cpu.getRegister("A");
    const leftRotation = this.leftRotate(A);

    this.cpu.setRegister("A", leftRotation);
  }

  /**
   * Performs a left rotation with carry on the accumulator register (A).
   * Updates the A register with the result.
   */
  RLA() {
    let A = this.cpu.getRegister("A");
    const leftRotation = this.leftRotateCarry(A);

    this.cpu.setRegister("A", leftRotation);
  }

  /**
   * Performs a right rotation on the accumulator register (A).
   * Updates the A register with the result.
   */
  RRCA() {
    let A = this.cpu.getRegister("A");
    const rightRotation = this.rightRotate(A);

    this.cpu.setRegister("A", rightRotation);
  }

  /**
   * Performs a right rotation with carry on the accumulator register (A).
   * Updates the A register with the result.
   */
  RRA() {
    let A = this.cpu.getRegister("A");
    const rightRotation = this.rightRotateCarry(A);

    this.cpu.setRegister("A", rightRotation);
  }

  /**
   * Performs a left rotation on a specified register or the memory location stored in HL.
   *
   * @param {string} register - The register name or "HL" for memory access.
   */
  RLC_n(register) {
    let value;
    let leftRotation;

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mmu.readByte(HL);
      leftRotation = this.leftRotate(value);
      this.cpu.mmu.writeByte(HL, leftRotation);
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      leftRotation = this.leftRotate(value);
      this.cpu.setRegister(register, leftRotation);
    }
  }

  /**
   * Performs a left rotation with carry on a specified register or the memory location stored in HL.
   *
   * @param {string} register - The register name or "HL" for memory access.
   */
  RL_n(register) {
    let value;
    let leftRotation;

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mmu.readByte(HL);
      leftRotation = this.leftRotateCarry(value);
      this.cpu.mmu.writeByte(HL, leftRotation);
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      leftRotation = this.leftRotateCarry(value);
      this.cpu.setRegister(register, leftRotation);
    }
  }

  /**
   * Performs a right rotation on a specified register or the memory location stored in HL.
   *
   * @param {string} register - The register name or "HL" for memory access.
   */
  RRC_n(register) {
    let value;
    let leftRotation;

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mmu.readByte(HL);
      leftRotation = this.rightRotate(value);
      this.cpu.mmu.writeByte(HL, leftRotation);
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      leftRotation = this.rightRotate(value);
      this.cpu.setRegister(register, leftRotation);
    }
  }

  /**
   * Performs a right rotation with carry on a specified register or the memory location stored in HL.
   *
   * @param {string} register - The register name or "HL" for memory access.
   */
  RR_n(register) {
    let value;
    let leftRotation;

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mmu.readByte(HL);
      leftRotation = this.rightRotateCarry(value);
      this.cpu.mmu.writeByte(HL, leftRotation);
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      leftRotation = this.rightRotateCarry(value);
      this.cpu.setRegister(register, leftRotation);
    }
  }

  /**
   * Performs an arithmetic left shift on a specified register or the memory location stored in HL.
   *
   * @param {string} register - The register name or "HL" for memory access.
   */
  SLA_n(register) {
    let value;
    let leftShift;
    let msb; // Most significant bit (bit 7)

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mmu.readByte(HL);
      leftShift = (value << 1) & 0xff; // Left shift
      this.cpu.mmu.writeByte(HL, leftShift);
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

  /**
   * Performs an arithmetic right shift on a specified register or the memory location stored in HL.
   *
   * @param {string} register - The register name or "HL" for memory access.
   */
  SRA_n(register) {
    let value;
    let rightShift;
    let lsb; // Least significant bit (bit 0)
    let msb; // Most significant bit (bit 7)

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mmu.readByte(HL);
      msb = value >> 7;
      rightShift = ((value >> 1) | (msb << 7)) & 0xff; // Right shift not changing msb
      this.cpu.mmu.writeByte(HL, rightShift);
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

  /**
   * Performs a logical right shift on a specified register or the memory location stored in HL.
   *
   * @param {string} register - The register name or "HL" for memory access.
   */
  SRL_n(register) {
    let value;
    let rightShift;
    let lsb; // Least significant bit (bit 0)

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mmu.readByte(HL);
      rightShift = (value >> 1) & 0xff; // Right shift
      this.cpu.mmu.writeByte(HL, rightShift);
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      rightShift = (value >> 1) & 0xff; // Right shift
      this.cpu.setRegister(register, rightShift);
    }

    // Set Z & C flags (same as rotation instructions)
    lsb = value & 0x01;
    this.setRotationFlags(rightShift, lsb);
  }

  // --------------------- BIT functions ---------------------
  /**
   * Tests a specific bit in a register or memory location.
   * Updates the zero (Z) flag based on the result, and sets fixed values for other flags.
   *
   * @param {number} bit - The bit position to test (0-7).
   * @param {string} register - The register name or "HL" for memory access.
   */
  BIT_b_r(bit, register) {
    let value;
    let result;

    // Target is mem address stored in HL
    if (register === "HL")
      value = this.cpu.mmu.readByte(this.cpu.getRegister("HL"));
    // Target is a simple register
    else value = this.cpu.getRegister(register);

    result = ((value >> bit) & 1) === 0;

    // Set Z10- flags
    this.cpu.setFlags("Z01-", { Z: result });
  }

  /**
   * Sets a specific bit in a register or memory location.
   *
   * @param {number} bit - The bit position to set (0-7).
   * @param {string} register - The register name or "HL" for memory access.
   */
  SET_b_r(bit, register) {
    let value;
    let result;

    // Function that sets bit n
    const setBit = (num, n) => num | (1 << n);

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mmu.readByte(HL);
      result = setBit(value, bit);
      this.cpu.mmu.writeByte(HL, result);
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      result = setBit(value, bit);
      this.cpu.setRegister(register, result);
    }
  }

  /**
   * Resets a specific bit in a register or memory location.
   *
   * @param {number} bit - The bit position to reset (0-7).
   * @param {string} register - The register name or "HL" for memory access.
   */
  RES_b_r(bit, register) {
    let value;
    let result;

    // Function that resets bit n
    const resetBit = (num, n) => num & ~(1 << n);

    // Target is mem address stored in HL
    if (register === "HL") {
      const HL = this.cpu.getRegister("HL");
      value = this.cpu.mmu.readByte(HL);
      result = resetBit(value, bit);
      this.cpu.mmu.writeByte(HL, result);
    }

    // Target is a simple register
    else {
      value = this.cpu.getRegister(register);
      result = resetBit(value, bit);
      this.cpu.setRegister(register, result);
    }
  }

  // --------------------- Jumps functions ---------------------
  /**
   * Performs an unconditional jump to the specified 16-bit address.
   *
   * @param {number} address - The 16-bit address to jump to.
   * @throws {Error} If the provided address is not valid or not immediate.
   */
  JP_nn(address) {
    if (!this.isImmediate(address))
      throw new Error(address + " is not an valid address");

    this.cpu.pc = address & 0xffff;
  }

  /**
   * Performs a conditional jump to the specified 16-bit address based on a condition.
   *
   * @param {string} condition - The condition to evaluate ("NZ", "Z", "NC", "C").
   * @param {number} address - The 16-bit address to jump to if the condition is met.
   * @throws {Error} If the condition is unknown or the address is not valid.
   * @returns {number} The number of clock cycles. 16 if jumped, 12 if not.
   */
  JP_cc_nn(condition, address) {
    if (!this.isImmediate(address))
      throw new Error(address + " is not a valid address");

    const flags = this.cpu.getRegister("F"); // ZNHC 0000
    const Z = flags >> 7;
    const C = (flags >> 4) & 1;

    // Map condition to its result
    const conditionMap = {
      NZ: Z === 0,
      Z: Z === 1,
      NC: C === 0,
      C: C === 1,
    };

    if (!(condition in conditionMap))
      throw new Error("Unknown condition: " + condition);

    if (conditionMap[condition]) {
      this.cpu.pc = address & 0xffff; // Jump
      return 16; // Clock cycles when jumped
    }

    return 12; // Clock cycles when not jumped
  }

  /**
   * Performs an unconditional jump to the address stored in the HL register.
   */
  JP_HL() {
    const address = this.cpu.getRegister("HL");
    this.cpu.pc = address & 0xffff;
  }

  /**
   * Performs a relative jump to the current program counter, offset by the given signed value.
   *
   * @param {number} value - The signed 8-bit offset for the relative jump.
   * @throws {Error} If the value is not valid or not immediate.
   */
  JR_n(value) {
    if (!this.isImmediate(value))
      throw new Error(value + " is not an valid value");

    this.cpu.pc = (this.cpu.pc + value) & 0xffff;
  }

  /**
   * Performs a conditional relative jump based on a condition and a signed offset value.
   *
   * @param {string} condition - The condition to evaluate ("NZ", "Z", "NC", "C").
   * @param {number} value - The signed 8-bit offset for the relative jump.
   * @throws {Error} If the condition is unknown or the value is not valid.
   * @returns {number} The number of clock cycles. 12 if jumped, 8 if not.
   */
  JR_cc_nn(condition, value) {
    if (!this.isImmediate(value))
      throw new Error(value + " is not an valid value");

    const flags = this.cpu.getRegister("F"); // ZNHC 0000
    const Z = flags >> 7;
    const C = (flags >> 4) & 1;

    // Map condition to its result
    const conditionMap = {
      NZ: Z === 0,
      Z: Z === 1,
      NC: C === 0,
      C: C === 1,
    };

    if (!(condition in conditionMap))
      throw new Error("Unknown condition: " + condition);

    if (conditionMap[condition]) {
      this.cpu.pc = (this.cpu.pc + value) & 0xffff; // Add value to current address and jump
      return 12; // Clock cycles when jumped
    }

    return 8; // Clock cycles when not jumped
  }

  // --------------------- Calls functions ---------------------
  /**
   * Calls a subroutine located at the specified address.
   * Pushes the current program counter (PC) onto the stack and jumps to the address.
   *
   * @param {number} address - The target address of the subroutine.
   * @throws {Error} If the provided address is not valid.
   */
  CALL_nn(address) {
    if (!this.isImmediate(address))
      throw new Error(address + " is not an valid address");

    // Push address of next instruction onto stack
    this.push(this.cpu.pc + 1);

    // Jump to address nn
    this.cpu.pc = address & 0xffff;
  }

  /**
   * Conditionally calls a subroutine located at the specified address.
   * The call is executed if the provided condition is met.
   *
   * @param {string} condition - The condition to evaluate ("NZ", "Z", "NC", "C").
   * @param {number} address - The target address of the subroutine.
   * @throws {Error} If the provided condition is unknown.
   * @returns {number} The number of clock cycles. 24 if called, 12 if not.
   */
  CALL_cc_nn(condition, address) {
    if (!this.isImmediate(address))
      throw new Error(address + " is not an valid address");

    const flags = this.cpu.getRegister("F"); // ZNHC 0000
    const Z = flags >> 7; // Zero flag
    const C = (flags >> 4) & 1; // Carry flag

    // Map condition to its result
    const conditionMap = {
      NZ: Z === 0,
      Z: Z === 1,
      NC: C === 0,
      C: C === 1,
    };

    if (!(condition in conditionMap))
      throw new Error("Unknown condition: " + condition);

    if (conditionMap[condition]) {
      this.CALL_nn(address); // Call address
      return 24; // Clock cycles when called
    }

    return 12; // Clock cycles when not called
  }

  // --------------------- Restarts functions ---------------------
  /**
   * Pushes the current program counter (PC) onto the stack
   * and jumps to the specified address.
   *
   * @param {number} address - The target address to jump to. Must be one of the valid RST addresses:
   * 0x00, 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, or 0x38.
   * @throws {Error} Throws an error if the provided address is not immediate or not a valid RST address.
   */
  RST_n(address) {
    // Valid RST addresses (hexadecimal values)
    const validAddresses = [0x00, 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, 0x38];

    if (!this.isImmediate(address) || !validAddresses.includes(address))
      throw new Error(address + " is not an valid address");

    // Push present address onto stack
    this.push(this.cpu.pc);

    // Jump to address n
    this.cpu.pc = address;
  }

  // --------------------- Returns functions ---------------------
  /**
   * Pops the top two bytes from the stack and sets the program counter (PC)
   * to the popped address, effectively returning to the calling function or address.
   */
  RET() {
    const address = this.pop(); // Pop 2 bytes from stack
    this.cpu.pc = address; // Jump to popped address
  }

  /**
   * Evaluates a condition based on CPU flags, and if the condition is met,
   * it pops the top two bytes from the stack and sets the program counter (PC) to the popped address.
   *
   * @param {string} condition - The condition to evaluate ("NZ", "Z", "NC", "C").
   * @throws {Error} Throws an error if an unknown condition is provided.
   * @returns {number} The number of clock cycles. 20 if returned, 8 if not.
   */
  RET_cc(condition) {
    const flags = this.cpu.getRegister("F"); // ZNHC 0000
    const Z = flags >> 7;
    const C = (flags >> 4) & 1;

    // Map condition to its result
    const conditionMap = {
      NZ: Z === 0,
      Z: Z === 1,
      NC: C === 0,
      C: C === 1,
    };

    if (!(condition in conditionMap))
      throw new Error("Unknown condition: " + condition);

    if (conditionMap[condition]) {
      this.RET(); // Return
      return 20; // Clock cycles when returned
    }

    return 8; // Clock cycles when not returned
  }

  RETI() {
    this.RET();
    this.cpu.ime = 1; // IME is set right after this instruction
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

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

    this.setRegister("F", registerF);
  }
}

export class Instruction {
  constructor(cpu) {
    this.cpu = cpu;
  }

  // --------------------- 8-bit LD functions ---------------------
  LD_nn_n(dstReg, value) {
    this.cpu.setRegister(dstReg, value);
  }

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

  LD_A_OffsetC() {
    // C register value (offset)
    const C = this.cpu.getRegister("C");

    const value = this.cpu.mem[0xff00 + C];

    this.cpu.setRegister("A", value);
  }

  LD_OffsetC_A() {
    // C register value (offset)
    const C = this.cpu.getRegister("C");

    const address = 0xff00 + C;

    this.cpu.mem[address] = this.cpu.getRegister("A");
  }

  LDD_A_HL() {
    const address = this.cpu.getRegister("HL");

    const value = this.cpu.mem[address];

    this.cpu.setRegister("A", value);

    this.cpu.setRegister("HL", address - 1);
  }

  LDD_HL_A() {
    const address = this.cpu.getRegister("HL");

    this.cpu.mem[address] = this.cpu.getRegister("A");

    this.cpu.setRegister("HL", address - 1);
  }

  LDI_A_HL() {
    const address = this.cpu.getRegister("HL");

    const value = this.cpu.mem[address];

    this.cpu.setRegister("A", value);

    this.cpu.setRegister("HL", address + 1);
  }

  LDI_HL_A() {
    const address = this.cpu.getRegister("HL");

    this.cpu.mem[address] = this.cpu.getRegister("A");

    this.cpu.setRegister("HL", address + 1);
  }

  LDH_n_A(n) {
    const address = 0xff00 + n;

    this.cpu.mem[address] = this.cpu.getRegister("A");
  }

  LDH_A_n(n) {
    const value = this.cpu.mem[0xff00 + n];

    this.cpu.setRegister("A", value);
  }

  // --------------------- 16-bit LD functions ---------------------
  LD_n_nn(dstReg, value) {
    // Dest. register is Stack Pointer
    if (dstReg == "SP") this.cpu.sp = value;
    // Dest. register is a combined register
    else this.cpu.setRegister(dstReg, value);
  }

  LD_SP_HL() {
    const HL = this.cpu.getRegister("HL");
    this.cpu.sp = HL;
  }

  LDHL_SP_n(n) {
    const result = this.cpu.sp + n;

    // Set sum's result in HL register
    this.cpu.setRegister("HL", result);

    // Calculate the Half Carry flag (H): Carry from bit 3 to bit 4
    const halfCarry = (this.cpu.sp & 0xf) + (n & 0xf) > 0xf;

    // Calculate the Carry flag (C): Carry from bit 7 to bit 8
    const carry = (this.cpu.sp & 0xff) + (n & 0xff) > 0xff;

    // Update flags
    this.cpu.setFlags("00HC", { H: halfCarry, C: carry });
  }

  LD_nn_SP(address) {
    const lowByte = this.cpu.sp & 0xff;
    const highByte = (this.cpu.sp & 0xff00) >> 8;

    this.cpu.mem[address] = lowByte;
    this.cpu.mem[address + 1] = highByte;
  }

  push(register) {
    // Decrement SP twice
    this.cpu.sp -= 2;

    // Split parameter register into high & low
    const highRegister = this.cpu.getRegister(register[0]);
    const lowRegister = this.cpu.getRegister(register[1]);

    // Storage highRegister in address sp & lowRegister in address sp+1
    this.cpu.mem[this.cpu.sp] = highRegister;
    this.cpu.mem[this.cpu.sp + 1] = lowRegister;
  }

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

  isImmediate(value) {
    return typeof value === "number";
  }
}

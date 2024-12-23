class CPU {
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
}

class Instruction {
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
    const C = this.getRegister("C");

    const value = this.cpu.mem[0xff00 + C];

    this.cpu.setRegister("A", value);
  }

  LD_OffsetC_A() {
    // C register value (offset)
    const C = this.getRegister("C");

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

    this.cpu.setRegister("A", n);
  }

  // TODO:
  // --------------------- 16-bit LD functions ---------------------

  isImmediate(value) {
    return typeof value === "number";
  }
}

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

// Test simple registers getters & setters
console.log("TEST SIMPLE REGISTERS GETTERS & SETTERS");
let value = 0x11;
for (const register of Object.values(CPU.Registers)) {
  cpu.setRegister(register, value);
  console.log(
    "REGISTER " + register + " :0x" + cpu.getRegister(register).toString(16)
  );
  value += 0x11;
}

cpu = new CPU();
instruction = new Instruction(cpu);

// Test combined registers getters & setters
console.log("\n\nTEST COMBINED REGISTERS GETTERS & SETTERS");
cpu.setRegister("AF", 0x1122);
cpu.setRegister("BC", 0x3344);
cpu.setRegister("DE", 0x5566);
cpu.setRegister("HL", 0x7788);

console.log("REGISTER AF: 0x" + cpu.getRegister("AF").toString(16));
console.log("REGISTER BC: 0x" + cpu.getRegister("BC").toString(16));
console.log("REGISTER DE: 0x" + cpu.getRegister("DE").toString(16));
console.log("REGISTER HL: 0x" + cpu.getRegister("HL").toString(16));

cpu = new CPU();
instruction = new Instruction(cpu);
value = 0x11;

// Test 8-Bit LD's
console.log("\n\nTEST 8-BIT LOADS");

// LD nn,n
console.log("  LD nn,n");
for (const register of Object.values(CPU.Registers)) {
  instruction.LD_nn_n(register, value);
  console.log(
    "    REGISTER " + register + " :0x" + cpu.getRegister(register).toString(16)
  );
  value += 0x11;
}

// LD r1,r2
console.log("  \nLD r1,r2");
console.log("    Simple to simple register");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " -> B=0x" +
    cpu.getRegister("B").toString(16)
);
instruction.LD_r1_r2("A", "B");
console.log("      LD B,A: B=0x" + cpu.getRegister("B").toString(16));

console.log("    (HL) to simple register");
console.log(
  "      HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " -> C=0x" +
    cpu.getRegister("C").toString(16)
);
cpu.mem[cpu.getRegister("HL")] = 0xcc;
console.log(
  "      Value at address 0x" +
    cpu.getRegister("HL").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("HL")].toString(16)
);
instruction.LD_r1_r2("HL", "C");
console.log("      LD C,(HL): C=0x" + cpu.getRegister("C").toString(16));

console.log("    Simple to (HL)");
console.log(
  "      HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " -> D=0x" +
    cpu.getRegister("D").toString(16)
);
cpu.mem[cpu.getRegister("HL")] = 0xcc;
console.log(
  "      Value at address 0x" +
    cpu.getRegister("HL").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("HL")].toString(16)
);
instruction.LD_r1_r2("D", "HL");
console.log(
  "      LD (HL),D: Value at address 0x" +
    cpu.getRegister("HL").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("HL")].toString(16)
);

value = 0xff;
console.log("    8-bit Immediate to (HL)");
console.log(
  "      HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " -> d8=0x" +
    value.toString(16)
);
console.log(
  "      Value at address 0x" +
    cpu.getRegister("HL").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("HL")].toString(16)
);
instruction.LD_r1_r2(value, "HL");
console.log(
  "      LD (HL),d8: Value at address 0x" +
    cpu.getRegister("HL").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("HL")].toString(16)
);

// LD A,n
console.log("\n  LD A, n");
console.log("    Simple register to A");
cpu.setRegister("B", 0xbb);
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " <- B=0x" +
    cpu.getRegister("B").toString(16)
);
instruction.LD_A_n("B");
console.log("      LD A,B: A=0x" + cpu.getRegister("A").toString(16));

console.log("    8-bit immediate to A");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " <- d8=0x" +
    value.toString(16)
);
instruction.LD_A_n(value);
console.log("      LD A,d8: A=0x" + cpu.getRegister("A").toString(16));

console.log("    (Combined register) to A");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " <- BC=0x" +
    cpu.getRegister("BC").toString(16)
);
cpu.mem[cpu.getRegister("BC")] = 0xfe;
console.log(
  "      Value at address 0x" +
    cpu.getRegister("BC").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("BC")].toString(16)
);
instruction.LD_A_n("BC", true);
console.log("      LD A,d8: A=0x" + cpu.getRegister("A").toString(16));

let d16Value = 0xcafe;
console.log("    (16-bit immediate) to A");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " <- d16=0x" +
    d16Value.toString(16)
);
cpu.mem[d16Value] = 0xaf;
console.log(
  "      Value at address 0x" +
    d16Value.toString(16) +
    " = 0x" +
    cpu.mem[d16Value].toString(16)
);
instruction.LD_A_n(d16Value, true);
console.log("      LD A,d16: A=0x" + cpu.getRegister("A").toString(16));

// LD n,A
console.log("\n  LD n, A");
console.log("    A to simple register");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " -> B=0x" +
    cpu.getRegister("B").toString(16)
);
instruction.LD_n_A("B");
console.log("      LD B,A: B=0x" + cpu.getRegister("B").toString(16));

console.log("    A to (combined register)");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " -> DE=0x" +
    cpu.getRegister("DE").toString(16)
);
cpu.mem[cpu.getRegister("DE")] = 0xde;
console.log(
  "      Value at address 0x" +
    cpu.getRegister("DE").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("DE")].toString(16)
);
instruction.LD_n_A("DE", true);
console.log(
  "      LD (DE),A: (DE)=0x" + cpu.mem[cpu.getRegister("DE")].toString(16)
);

console.log("    A to (16-bit immediate)");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " -> d16=0x" +
    d16Value.toString(16)
);
cpu.mem[d16Value] = 0xef;
console.log(
  "      Value at address 0x" +
    d16Value.toString(16) +
    " = 0x" +
    cpu.mem[d16Value].toString(16)
);
instruction.LD_A_n(d16Value, true);
console.log("      LD (d16),A: (d16)=0x" + cpu.mem[d16Value].toString(16));



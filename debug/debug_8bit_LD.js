import { CPU } from "../CPU.js";
import { Instruction } from "../Instruction.js";

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

// LD A,(C)
console.log("\n  LD A,(C)");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " , C=0x" +
    cpu.getRegister("C").toString(16)
);
cpu.mem[cpu.getRegister("C") + 0xff00] = 0xac;
console.log(
  "      Value at address (0x" +
    cpu.getRegister("C").toString(16) +
    " + " +
    "0xff00)" +
    " = 0x" +
    cpu.mem[cpu.getRegister("C") + 0xff00].toString(16)
);
instruction.LD_A_OffsetC();
console.log("      LD A,(C): A=0x" + cpu.getRegister("A").toString(16));

// LD (C),A
console.log("\n  LD (C),A");
cpu.setRegister("A", 0xca);
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " , C=0x" +
    cpu.getRegister("C").toString(16)
);
cpu.mem[cpu.getRegister("C") + 0xff00] = 0xac;
console.log(
  "      Value at address (0x" +
    cpu.getRegister("C").toString(16) +
    " + " +
    "0xff00)" +
    " = 0x" +
    cpu.mem[cpu.getRegister("C") + 0xff00].toString(16)
);
instruction.LD_OffsetC_A();
console.log(
  "      LD (C),A: (C)=0x" + cpu.mem[cpu.getRegister("C") + 0xff00].toString(16)
);

// LDD A,(HL)
console.log("\n  LDD A,(HL)");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log(
  "      Value at address 0x" +
    cpu.getRegister("HL").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("HL")].toString(16)
);
instruction.LDD_A_HL();
console.log("      LD A,(HL): A=0x" + cpu.getRegister("A").toString(16));
console.log(
  "      HL value after operation: 0x" + cpu.getRegister("HL").toString(16)
);

// LDD (HL),A
console.log("\n  LDD (HL),A");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
cpu.mem[cpu.getRegister("HL")] = 0xae;
console.log(
  "      Value at address 0x" +
    cpu.getRegister("HL").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("HL")].toString(16)
);
instruction.LDD_HL_A();
console.log(
  "      LD (HL),A: (HL)=0x" + cpu.mem[cpu.getRegister("HL") + 1].toString(16)
);
console.log(
  "      HL value after operation: 0x" + cpu.getRegister("HL").toString(16)
);

cpu.setRegister("HL", 0x1234);

// LDI A,(HL)
console.log("\n  LDI A,(HL)");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
cpu.mem[cpu.getRegister("HL")] = 0x23;
console.log(
  "      Value at address 0x" +
    cpu.getRegister("HL").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("HL")].toString(16)
);
instruction.LDI_A_HL();
console.log("      LDI A,(HL): A=0x" + cpu.getRegister("A").toString(16));
console.log(
  "      HL value after operation: 0x" + cpu.getRegister("HL").toString(16)
);

// LDI (HL),A
console.log("\n  LDI (HL),A");
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
cpu.mem[cpu.getRegister("HL")] = 0x33;
console.log(
  "      Value at address 0x" +
    cpu.getRegister("HL").toString(16) +
    " = 0x" +
    cpu.mem[cpu.getRegister("HL")].toString(16)
);
instruction.LDI_HL_A();
console.log(
  "      LDI (HL),A: (HL)=0x" + cpu.mem[cpu.getRegister("HL") - 1].toString(16)
);
console.log(
  "      HL value after operation: 0x" + cpu.getRegister("HL").toString(16)
);

// LDH (n),A
console.log("\n  LDH (n),A");
value = 0xab;
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " , n=0x" +
    value.toString(16)
);
cpu.mem[value + 0xff00] = 0x33;
console.log(
  "      Value at address (0x" +
    value.toString(16) +
    " + 0xff00) = 0x" +
    cpu.mem[value + 0xff00].toString(16)
);
instruction.LDH_n_A(value);
console.log("      LDH (n),A: (n)=0x" + cpu.mem[value + 0xff00].toString(16));

// LDH A,(n)
console.log("\n  LDH A,(n)");
value = 0xcd;
console.log(
  "      A=0x" +
    cpu.getRegister("A").toString(16) +
    " , n=0x" +
    value.toString(16)
);
cpu.mem[value + 0xff00] = 0xdc;
console.log(
  "      Value at address (0x" +
    value.toString(16) +
    " + 0xff00) = 0x" +
    cpu.mem[value + 0xff00].toString(16)
);
instruction.LDH_A_n(value);
console.log("      LDH A,(n): A=0x" + cpu.getRegister("A").toString(16));

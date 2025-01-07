import { CPU } from "../CPU.js";
import { Instruction } from "../Instruction.js";

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

let value = 0b11000110;

let result;

// Basic rotation functions
console.log("BASIC ROTATION FUNCTIONS");
console.log("Value: 0b" + value.toString(2));

// leftRotate
console.log("\nFLAGS: " + cpu.getRegister("F").toString(2));
result = instruction.leftRotate(value);
console.log("LEFT ROTATE: 0b" + result.toString(2));
console.log("FLAGS: " + cpu.getRegister("F").toString(2));

// leftRotateCarry (C FLAG 0)
cpu.setFlags("---0");
console.log("\nFLAGS: " + cpu.getRegister("F").toString(2));
result = instruction.leftRotateCarry(value);
console.log("LEFT ROTATE CARRY (C FLAG = 0): 0b" + result.toString(2));
console.log("FLAGS: " + cpu.getRegister("F").toString(2));

// leftRotateCarry (C FLAG 1)
cpu.setFlags("---1");
console.log("\nFLAGS: " + cpu.getRegister("F").toString(2));
result = instruction.leftRotateCarry(value);
console.log("LEFT ROTATE CARRY (C FLAG = 1): 0b" + result.toString(2));
console.log("FLAGS: " + cpu.getRegister("F").toString(2));
cpu.setFlags("---0");

// rightRotate
console.log("\nFLAGS: " + cpu.getRegister("F").toString(2));
result = instruction.rightRotate(value);
console.log("RIGHT ROTATE: 0b" + result.toString(2));
console.log("FLAGS: " + cpu.getRegister("F").toString(2));

// rightRotateCarry (C FLAG 0)
console.log("\nFLAGS: " + cpu.getRegister("F").toString(2));
result = instruction.rightRotateCarry(value);
console.log("RIGHT ROTATE CARRY (C FLAG = 0): 0b" + result.toString(2));
console.log("FLAGS: " + cpu.getRegister("F").toString(2));

// rightRotateCarry (C FLAG 1)
cpu.setFlags("---1");
console.log("\nFLAGS: " + cpu.getRegister("F").toString(2));
result = instruction.rightRotateCarry(value);
console.log("RIGHT ROTATE CARRY (C FLAG = 1): 0b" + result.toString(2));
console.log("FLAGS: " + cpu.getRegister("F").toString(2));
cpu.setFlags("---0");

// TEST ZERO FLAG, N&H RESET
console.log("\nTEST ZERO FLAG, N & H RESET");
value = 0b10000000;
cpu.setFlags("-110");
console.log("Value: 0b" + value.toString(2));
console.log("FLAGS: " + cpu.getRegister("F").toString(2));
result = instruction.leftRotateCarry(value);
console.log("LEFT ROTATE CARRY (C FLAG = 0): 0b" + result.toString(2));
console.log("FLAGS: " + cpu.getRegister("F").toString(2));

// RLCA
console.log("\nRLCA");
value = 0b11000110;
cpu.setRegister("A", value);
cpu.setRegister("F", 0);
console.log("    A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RLCA();
console.log("    RLCA : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// RLA
console.log("\nRLA");

console.log("  Carry = 0");
cpu.setRegister("A", value);
cpu.setRegister("F", 0);
console.log("    A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RLA();
console.log("    RLA : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  Carry = 1");
cpu.setRegister("A", value);
cpu.setFlags("0001");
console.log("    A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RLA();
console.log("    RLA : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// RRCA
console.log("\nRRCA");
cpu.setRegister("A", value);
cpu.setRegister("F", 0);
console.log("    A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RRCA();
console.log("    RRCA : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// RRA
console.log("\nRRA");

console.log("  Carry = 0");
cpu.setRegister("A", value);
cpu.setRegister("F", 0);
console.log("    A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RRA();
console.log("    RRA : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  Carry = 1");
cpu.setRegister("A", value);
cpu.setFlags("0001");
console.log("    A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RRA();
console.log("    RLA : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// RLC n
console.log("\nRLC n");

cpu.setRegister("C", value);
cpu.setRegister("F", 0);
console.log("  Rotate simple register");
console.log("    C=0b" + cpu.getRegister("C").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RLC_n("C");
console.log("    RLC n : C=0b" + cpu.getRegister("C").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("HL", 0x1234);
cpu.mem[0x1234] = value;
cpu.setRegister("F", 0);
console.log("  Rotate (HL)");
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    Value at address 0x1234=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RLC_n("HL");
console.log("    RLC n : HL=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// RL n
console.log("\nRL n");

cpu.setRegister("B", value);
cpu.setRegister("F", 0);
console.log("  Rotate simple register");
console.log("   Carry = 0");
console.log("    B=0b" + cpu.getRegister("B").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RL_n("B");
console.log("    RL n : B=0b" + cpu.getRegister("B").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("B", value);
cpu.setFlags("0001");
console.log("   Carry = 1");
console.log("    B=0b" + cpu.getRegister("B").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RL_n("B");
console.log("    RL n : B=0b" + cpu.getRegister("B").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("HL", 0x1234);
cpu.mem[0x1234] = value;
cpu.setRegister("F", 0);
console.log("  Rotate (HL)");
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    Value at address 0x1234=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RLC_n("HL");
console.log("    RLCA : HL=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// RRC n
console.log("\nRRC n");

cpu.setRegister("C", value);
cpu.setRegister("F", 0);
console.log("  Rotate simple register");
console.log("    C=0b" + cpu.getRegister("C").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RRC_n("C");
console.log("    RRC n : C=0b" + cpu.getRegister("C").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("HL", 0x1234);
cpu.mem[0x1234] = value;
cpu.setRegister("F", 0);
console.log("  Rotate (HL)");
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    Value at address 0x1234=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RRC_n("HL");
console.log("    RLC n : HL=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// RR n
console.log("\nRR n");

cpu.setRegister("B", value);
cpu.setRegister("F", 0);
console.log("  Rotate simple register");
console.log("   Carry = 0");
console.log("    B=0b" + cpu.getRegister("B").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RR_n("B");
console.log("    RR n : B=0b" + cpu.getRegister("B").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("B", value);
cpu.setFlags("0001");
console.log("   Carry = 1");
console.log("    B=0b" + cpu.getRegister("B").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RR_n("B");
console.log("    RR n : B=0b" + cpu.getRegister("B").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("HL", 0x1234);
cpu.mem[0x1234] = value;
cpu.setRegister("F", 0);
console.log("  Rotate (HL)");
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    Value at address 0x1234=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.RR_n("HL");
console.log("    RR n : HL=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// SLA n
console.log("SLA n");
value = 0b11000110;

cpu.setRegister("D", value);
cpu.setFlags("0110");
console.log("  Shift simple register (test N & H reset)");
console.log("    D=0b" + cpu.getRegister("D").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SLA_n("D");
console.log("    SLA n : D=0b" + cpu.getRegister("D").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  Shift (HL)");
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    Value at address 0x1234=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SLA_n("HL");
console.log("    SLA n : (HL)=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// SRA n
console.log("SRA n");
value = 0b11000110;

cpu.setRegister("D", value);
cpu.setFlags("0110");
console.log("  Shift simple register (test N & H reset)");
console.log("    D=0b" + cpu.getRegister("D").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SRA_n("D");
console.log("    SRA n : D=0b" + cpu.getRegister("D").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  Shift (HL)");
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    Value at address 0x1234=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SRA_n("HL");
console.log("    SRA n : (HL)=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// SRL n
console.log("SRL n");
value = 0b11000110;

cpu.setRegister("D", value);
cpu.setFlags("0110");
console.log("  Shift simple register (test N & H reset)");
console.log("    D=0b" + cpu.getRegister("D").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SRL_n("D");
console.log("    SRL n : D=0b" + cpu.getRegister("D").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  Shift (HL)");
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    Value at address 0x1234=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SRL_n("HL");
console.log("    SRL n : (HL)=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

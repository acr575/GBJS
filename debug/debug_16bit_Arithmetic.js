import { CPU } from "../CPU.js";
import { Instruction } from "../Instruction.js";

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

let initValue = 0x1234;
let addValue = 0xabcd;

function getSignedRepresentation8Bit(number) {
  return (number << 24) >> 24;
}

console.log("DEBUG 16-bit ARITHMETIC INSTRUCTIONS");

// ADD HL,n
console.log("\nADD HL,n");
cpu.setRegister("HL", initValue);
cpu.setRegister("BC", addValue);
cpu.setRegister("F", 0b01000000);
console.log("  Add from combined register (checks N flag reset)");
console.log(
  "    HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " , BC=0x" +
    cpu.getRegister("BC").toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_HL_n("BC");
console.log("    ADD HL,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.sp = 0x1211;
console.log("  Add from SP (with half carry)");
console.log(
  "    HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " , SP=0x" +
    cpu.sp.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_HL_n("SP");
console.log("    ADD HL,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  Check carry flag");
console.log(
  "    HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " , BC=0x" +
    cpu.getRegister("BC").toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_HL_n("BC");
console.log("    ADD HL,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  Check carry & half-carry flag");
console.log(
  "    HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " , BC=0x" +
    cpu.getRegister("BC").toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_HL_n("BC");
console.log("    ADD HL,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// ADD SP,n
cpu.setFlags("1100");
addValue = 0xff;
cpu.mem[cpu.pc + 1] = addValue;
console.log("\nADD SP,r8 (signed value)");
console.log("  Check Z & N reset");
console.log(
  "    Mem[pc+1]=0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "(" +
    getSignedRepresentation8Bit(cpu.mem[cpu.pc + 1]).toString(16) +
    "); SP=0x" +
    cpu.sp.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_SP_n(addValue);
console.log("    ADD SP,n : SP=0x" + cpu.sp.toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

addValue = 0x7f;
cpu.sp++;
cpu.mem[cpu.pc + 1] = addValue;
console.log("  Check half-carry");
console.log(
  "    Mem[pc+1]=0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "(" +
    getSignedRepresentation8Bit(cpu.mem[cpu.pc + 1]).toString(16) +
    "); SP=0x" +
    cpu.sp.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_SP_n(addValue);
console.log("    ADD SP,n : SP=0x" + cpu.sp.toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

addValue = 0xbf;
cpu.sp = 0x1231;
cpu.mem[cpu.pc + 1] = addValue;
console.log("  Check carry");
console.log(
  "    Mem[pc+1]=0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "(" +
    getSignedRepresentation8Bit(cpu.mem[cpu.pc + 1]).toString(16) +
    "); SP=0x" +
    cpu.sp.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_SP_n(addValue);
console.log("    ADD SP,n : SP=0x" + cpu.sp.toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

addValue = 0x6f;
cpu.sp = 0x12a1;
cpu.mem[cpu.pc + 1] = addValue;
console.log("  Check carry");
console.log(
  "    Mem[pc+1]=0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "(" +
    getSignedRepresentation8Bit(cpu.mem[cpu.pc + 1]).toString(16) +
    "); SP=0x" +
    cpu.sp.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_SP_n(addValue);
console.log("    ADD SP,n : SP=0x" + cpu.sp.toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// INC nn
console.log("\nINC nn");
console.log("  Combined register");
console.log("    BC=0x" + cpu.getRegister("BC").toString(16));
instruction.INC_nn("BC");
console.log("    INC nn : BC=0x" + cpu.getRegister("BC").toString(16));

console.log("  SP");
console.log("    SP=0x" + cpu.sp.toString(16));
instruction.INC_nn("SP");
console.log("    INC nn : SP=0x" + cpu.sp.toString(16));

// DEC nn
console.log("\nDEC nn");
console.log("  Combined register");
console.log("    BC=0x" + cpu.getRegister("BC").toString(16));
instruction.DEC_nn("BC");
console.log("    DEC nn : BC=0x" + cpu.getRegister("BC").toString(16));

console.log("  SP");
console.log("    SP=0x" + cpu.sp.toString(16));
instruction.DEC_nn("SP");
console.log("    DEC nn : SP=0x" + cpu.sp.toString(16));

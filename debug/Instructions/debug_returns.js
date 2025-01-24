import { CPU } from "../../CPU.js";
import { Instruction } from "../../Instruction.js";

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

instruction.push(Math.floor(Math.random() * 0x10000)); // Push random 16-bit number onto stack

// RET
console.log("RET");
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
instruction.RET();
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

// RET cc
console.log("\nRET cc");

// cc = NZ
instruction.push(Math.floor(Math.random() * 0x10000)); // Push random 16-bit number onto stack
console.log("  cc=NZ");
console.log("\tZ=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("1000");
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
instruction.RET_cc("NZ");
console.log("\tRET cc: PC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

console.log("\n\tZ=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0000");
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
instruction.RET_cc("NZ");
console.log("\tRET cc: PC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

// cc = Z
instruction.push(Math.floor(Math.random() * 0x10000)); // Push random 16-bit number onto stack
console.log("\n  cc=Z");
console.log("\tZ=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0000");
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
instruction.RET_cc("Z");
console.log("\tRET cc: PC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

console.log("\n\tZ=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("1000");
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
instruction.RET_cc("Z");
console.log("\tRET cc: PC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

// cc = NC
instruction.push(Math.floor(Math.random() * 0x10000)); // Push random 16-bit number onto stack
console.log("\n  cc=NC");
console.log("\tC=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0001");
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
instruction.RET_cc("NC");
console.log("\tRET cc: PC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

console.log("\n\tC=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0000");
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
instruction.RET_cc("NC");
console.log("\tRET cc: PC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

// cc = C
instruction.push(Math.floor(Math.random() * 0x10000)); // Push random 16-bit number onto stack
console.log("\n  cc=C");
console.log("\tC=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0000");
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
instruction.RET_cc("C");
console.log("\tRET cc: PC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

console.log("\n\tC=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0001");
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
instruction.RET_cc("C");
console.log("\tRET cc: PC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

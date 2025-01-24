import { CPU } from "../../CPU.js";
import { Instruction } from "../../Instruction.js";

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

let address = 0x1234;

// CALL nn
console.log("CALL nn");

console.log("\tPC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
console.log("\tCALL 0x" + address.toString(16));
instruction.CALL_nn(address);
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

// CALL cc,nn
console.log("\nCALL cc,nn");

// cc = NZ
address += 20;
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
console.log("\tCALL 0x" + address.toString(16));
instruction.CALL_cc_nn("NZ", address);
console.log("\tPC=0x" + cpu.pc.toString(16));
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
console.log("\tCALL 0x" + address.toString(16));
instruction.CALL_cc_nn("NZ", address);
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

// cc = Z
address += 20;
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
console.log("\tCALL 0x" + address.toString(16));
instruction.CALL_cc_nn("Z", address);
console.log("\tPC=0x" + cpu.pc.toString(16));
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
console.log("\tCALL 0x" + address.toString(16));
instruction.CALL_cc_nn("Z", address);
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

// cc = NC
address += 20;
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
console.log("\tCALL 0x" + address.toString(16));
instruction.CALL_cc_nn("NC", address);
console.log("\tPC=0x" + cpu.pc.toString(16));
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
console.log("\tCALL 0x" + address.toString(16));
instruction.CALL_cc_nn("NC", address);
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

// cc = C
address += 20;
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
console.log("\tCALL 0x" + address.toString(16));
instruction.CALL_cc_nn("C", address);
console.log("\tPC=0x" + cpu.pc.toString(16));
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
console.log("\tCALL 0x" + address.toString(16));
instruction.CALL_cc_nn("C", address);
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log(
  "\tSP=x0" +
    cpu.sp.toString(16) +
    ", mem[SP]=0x" +
    cpu.mem[cpu.sp].toString(16) +
    ", mem[SP+1]=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

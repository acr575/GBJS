import { CPU } from "../../CPU.js";
import { Instruction } from "../../Instruction.js";

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

let address = 0xf4f4;
let add = 0x20;

// JP nn
console.log("JP nn");

console.log("  JP to 16 bit value");
console.log("\tPC=0x" + cpu.pc.toString(16));
instruction.JP_nn(address);
console.log("\tJP " + address.toString(16) + ": PC=0x" + cpu.pc.toString(16));

console.log("  JP with wrong parameter");
console.log("\tPC=0x" + cpu.pc.toString(16));
try {
  instruction.JP_nn("A");
} catch (error) {
  console.error(error);
}

// JP cc,nn
console.log("\nJP cc,nn");

// cc = NZ
address += 1;
console.log("  cc=NZ");
console.log("\tZ=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("1000");
instruction.JP_cc_nn("NZ", address);
console.log("\tJP " + address.toString(16) + ": PC=0x" + cpu.pc.toString(16));

console.log("\n\tZ=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0000");
instruction.JP_cc_nn("NZ", address);
console.log("\tJP " + address.toString(16) + ": PC=0x" + cpu.pc.toString(16));

// cc = Z
address += 1;
console.log("\n  cc=Z");
console.log("\tZ=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0000");
instruction.JP_cc_nn("Z", address);
console.log("\tJP " + address.toString(16) + ": PC=0x" + cpu.pc.toString(16));

console.log("\n\tZ=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("1000");
instruction.JP_cc_nn("Z", address);
console.log("\tJP " + address.toString(16) + ": PC=0x" + cpu.pc.toString(16));

// cc = NC
address += 1;
console.log("\n  cc=NC");
console.log("\tC=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0001");
instruction.JP_cc_nn("NC", address);
console.log("\tJP " + address.toString(16) + ": PC=0x" + cpu.pc.toString(16));

console.log("\n\tC=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0000");
instruction.JP_cc_nn("NC", address);
console.log("\tJP " + address.toString(16) + ": PC=0x" + cpu.pc.toString(16));

// cc = C
address += 1;
console.log("\n  cc=C");
console.log("\tC=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0000");
instruction.JP_cc_nn("C", address);
console.log("\tJP " + address.toString(16) + ": PC=0x" + cpu.pc.toString(16));

console.log("\n\tC=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
cpu.setFlags("0001");
instruction.JP_cc_nn("C", address);
console.log("\tJP " + address.toString(16) + ": PC=0x" + cpu.pc.toString(16));

// JP (HL)
console.log("\nJP (HL)");
cpu.setRegister("HL", 0x1234);
cpu.mem[0x1234] = ++address;
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("\tPC=0x" + cpu.pc.toString(16));
instruction.JP_HL();
console.log("\tJP (HL): PC=0x" + cpu.pc.toString(16));

// JR n
console.log("\nJR n");
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log("\tn=0x" + add.toString(16));
console.log("\tPC+n=0x" + (cpu.pc + add).toString(16));
instruction.JR_n(add);
console.log("\tJR n: PC=0x" + cpu.pc.toString(16));

// JR cc, nn
console.log("\nJR cc, nn");

// cc = NZ
address += 1;
console.log("  cc=NZ");
console.log("\tZ=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log("\tn=0x" + add.toString(16));
console.log("\tPC+n=0x" + (cpu.pc + add).toString(16));
cpu.setFlags("1000");
instruction.JR_cc_nn("NZ", add);
console.log("\tJR nn,cc: PC=0x" + cpu.pc.toString(16));

console.log("\n\tZ=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log("\tn=0x" + add.toString(16));
console.log("\tPC+n=0x" + (cpu.pc + add).toString(16));
cpu.setFlags("0000");
instruction.JR_cc_nn("NZ", add);
console.log("\tJR nn,cc: PC=0x" + cpu.pc.toString(16));

// cc = Z
address += 1;
console.log("\n  cc=Z");
console.log("\tZ=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log("\tn=0x" + add.toString(16));
console.log("\tPC+n=0x" + (cpu.pc + add).toString(16));
cpu.setFlags("0000");
instruction.JR_cc_nn("Z", add);
console.log("\tJR nn,cc: PC=0x" + cpu.pc.toString(16));

console.log("\n\tZ=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log("\tn=0x" + add.toString(16));
console.log("\tPC+n=0x" + (cpu.pc + add).toString(16));
cpu.setFlags("1000");
instruction.JR_cc_nn("Z", add);
console.log("\tJR nn,cc: PC=0x" + cpu.pc.toString(16));

// cc = NC
address += 1;
console.log("\n  cc=NC");
console.log("\tC=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log("\tn=0x" + add.toString(16));
console.log("\tPC+n=0x" + (cpu.pc + add).toString(16));
cpu.setFlags("0001");
instruction.JR_cc_nn("NC", add);
console.log("\tJR nn,cc: PC=0x" + cpu.pc.toString(16));

console.log("\n\tC=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log("\tn=0x" + add.toString(16));
console.log("\tPC+n=0x" + (cpu.pc + add).toString(16));
cpu.setFlags("0000");
instruction.JR_cc_nn("NC", add);
console.log("\tJR nn,cc: PC=0x" + cpu.pc.toString(16));

// cc = C
address += 1;
console.log("\n  cc=C");
console.log("\tC=0");
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log("\tn=0x" + add.toString(16));
console.log("\tPC+n=0x" + (cpu.pc + add).toString(16));
cpu.setFlags("0000");
instruction.JR_cc_nn("C", add);
console.log("\tJR nn,cc: PC=0x" + cpu.pc.toString(16));

console.log("\n\tC=1");
console.log("\tPC=0x" + cpu.pc.toString(16));
console.log("\tn=0x" + add.toString(16));
console.log("\tPC+n=0x" + (cpu.pc + add).toString(16));
cpu.setFlags("0001");
instruction.JR_cc_nn("C", add);
console.log("\tJR nn,cc: PC=0x" + cpu.pc.toString(16));

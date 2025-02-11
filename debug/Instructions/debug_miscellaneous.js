import { CPU } from "../../src/CPU.js";

const cpu = new CPU();

/* TEST SWAP */
console.log("TEST SWAP");
cpu.setRegister("B", 0xab);

console.log("  Simple register");
console.log(`\tB=0x${cpu.getRegister("B").toString(16)}`);
cpu.instruction.SWAP_n("B");
console.log("\tSWAP");
console.log(`\tB=0x${cpu.getRegister("B").toString(16)}`);

cpu.setRegister("HL", 0xc123);
cpu.mmu.writeByte(0xc123, 0xcd);
console.log("  (HL)");
console.log(
  `\tHL=0x${cpu.getRegister("HL").toString(16)}; Value at addr. HL=0x${cpu.mmu
    .readByte(0xc123)
    .toString(16)}`
);
cpu.instruction.SWAP_n("HL");
console.log("\tSWAP");
console.log(`\tValue at addr. HL=0x${cpu.mmu.readByte(0xc123).toString(16)}`);

console.log("\n");

/* TEST DAA */
console.log("TEST DAA");

cpu.setRegister("A", 0xff);
cpu.setFlags("-1--");
console.log(`Initial A value: A=0x${cpu.getRegister("A").toString(16)}`);

// N=1
console.log("  N=1");
console.log("   H=0, C=0");
cpu.instruction.DAA();
console.log("\tDAA() - No action on A");
console.log(
  `\tA=0x${cpu.getRegister("A").toString(16)}; Flags: ${(
    cpu.getRegister("F") >> 4
  ).toString(2)}`
);

console.log("   H=0, C=1");
cpu.setFlags("-101");
console.log("\tDAA() - Sub 0x60 from A");
cpu.instruction.DAA();
console.log(
  `\tA=0x${cpu.getRegister("A").toString(16)}; Flags: ${(
    cpu.getRegister("F") >> 4
  ).toString(2)}`
);

console.log("   H=1, C=0");
cpu.setFlags("-110");
console.log("\tDAA() - Sub 0x6 from A");
cpu.instruction.DAA();
console.log(
  `\tA=0x${cpu.getRegister("A").toString(16)}; Flags: ${(
    cpu.getRegister("F") >> 4
  ).toString(2)}`
);

console.log("   H=1, C=1");
cpu.setFlags("-111");
console.log("\tDAA() - Sub 0x6 and 0x60 from A");
cpu.instruction.DAA();
console.log(
  `\tA=0x${cpu.getRegister("A").toString(16)}; Flags: ${(
    cpu.getRegister("F") >> 4
  ).toString(2)}`
);

console.log("\n");

// N=0
cpu.setFlags("-000");
console.log("  N=0");
console.log("   H=0, C=0, A&0xF>0x9");
cpu.setRegister("A", 0x0a);
console.log(`\tA=0x${cpu.getRegister("A").toString(16)}`);
cpu.instruction.DAA();
console.log("\tDAA() Add 0x6 to A");
console.log(
  `\tA=0x${cpu.getRegister("A").toString(16)}; Flags: ${(
    cpu.getRegister("F") >> 4
  ).toString(2)}`
);

console.log("   H=0, C=1");
cpu.setFlags("-001");
console.log("\tDAA() - Add 0x60 to A");
cpu.instruction.DAA();
console.log(
  `\tA=0x${cpu.getRegister("A").toString(16)}; Flags: ${(
    cpu.getRegister("F") >> 4
  ).toString(2)}`
);

console.log("   H=1, C=0");
cpu.setFlags("-010");
console.log("\tDAA() - Add 0x6 to A");
cpu.instruction.DAA();
console.log(
  `\tA=0x${cpu.getRegister("A").toString(16)}; Flags: ${(
    cpu.getRegister("F") >> 4
  ).toString(2)}`
);

console.log("   H=1, C=1");
cpu.setFlags("-011");
console.log("\tDAA() - Add 0x6 and 0x60 to A");
cpu.instruction.DAA();
console.log(
  `\tA=0x${cpu.getRegister("A").toString(16)}; Flags: ${(
    cpu.getRegister("F") >> 4
  ).toString(2)}`
);

console.log("\n");

/* TEST CPL */
cpu.setFlags("0000");
console.log("TEST CPL");
console.log(`\tA=0x${cpu.getRegister("A").toString(2)}`);
console.log("\tCPL");
cpu.instruction.CPL();
console.log(
  `\tA=0x${cpu.getRegister("A").toString(2)}; Flags: ${(
    cpu.getRegister("F") >> 4
  ).toString(2)}`
);

console.log("\n");

/* TEST CCF */
cpu.setFlags("0110");
console.log("TEST CCF");
console.log(`\tF=0b${(cpu.getRegister("F") >> 4).toString(2)}`);
console.log("\tCCF");
cpu.instruction.CCF();
console.log(`\tF=0b${(cpu.getRegister("F") >> 4).toString(2)}`);
console.log("\tCCF");
cpu.setFlags("0001");
cpu.instruction.CCF();
console.log(`\tF=0b${(cpu.getRegister("F") >> 4).toString(2)}`);

console.log("\n");

/* TEST DI */
console.log("DI");
cpu.ime = 1;
console.log(`\tIME= ${cpu.ime}`);
cpu.instruction.DI();
console.log("\tDI");
console.log(`\tIME= ${cpu.ime}`);

/* TEST EI */
console.log("EI");
console.log(`\tIME= ${cpu.ime}`);
cpu.instruction.EI();
console.log("\tEI");
cpu.handleRequestIme();
console.log(`\tInstruction following EI: IME= ${cpu.ime}`);
cpu.handleRequestIme();
console.log(`\tAfter instruction following EI: IME= ${cpu.ime}`);

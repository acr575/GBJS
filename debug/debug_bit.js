import { CPU } from "../CPU.js";
import { Instruction } from "../Instruction.js";

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

let value = 0b11000110;

// BIT b,r
console.log("BIT b,r");

cpu.setRegister("D", value);
cpu.setFlags("0100");
console.log("  Test each bit of simple register");
console.log("    D=0b" + cpu.getRegister("D").toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
for (let i = 0; i < 8; i++) {
  instruction.BIT_b_r(i, "D");
  console.log(
    "    BIT " +
      i +
      ", D : FLAGS AFTER: ZNHC=" +
      (cpu.getRegister("F") >> 4).toString(2)
  );
}

console.log("  Bit (HL)");
cpu.setRegister("HL", 0x1234);
cpu.mem[0x1234] = 0b11000110;
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    Value at address 0x1234=0b" + cpu.mem[0x1234].toString(2));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
for (let i = 0; i < 8; i++) {
  instruction.BIT_b_r(i, "HL");
  console.log(
    "    BIT " +
      i +
      ", (HL) : FLAGS AFTER: ZNHC=" +
      (cpu.getRegister("F") >> 4).toString(2)
  );
}

// SET b,r
console.log("\nSET b,r");

cpu.setRegister("D", value);
cpu.setRegister("F", 0);
console.log("  Set each bit of simple register");
console.log("    D=0b" + cpu.getRegister("D").toString(2));
for (let i = 0; i < 8; i++) {
  cpu.setRegister("D", value);
  instruction.SET_b_r(i, "D");
  console.log("    SET " + i + ", D: D=0b" + cpu.getRegister("D").toString(2));
}

console.log("  Set (HL)");
cpu.setRegister("HL", 0x1234);
cpu.mem[0x1234] = 0b11000110;
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    Value at address 0x1234=0b" + cpu.mem[0x1234].toString(2));
for (let i = 0; i < 8; i++) {
  cpu.mem[0x1234] = value;
  instruction.SET_b_r(i, "HL");
  console.log("    SET " + i + ", (HL): (HL)=0b" + cpu.mem[0x1234].toString(2));
}

// RES b,r
console.log("\nRES b,r");

cpu.setRegister("D", value);
cpu.setRegister("F", 0);
console.log("  Reset each bit of simple register");
console.log("    D=0b" + cpu.getRegister("D").toString(2));
for (let i = 0; i < 8; i++) {
  cpu.setRegister("D", value);
  instruction.RES_b_r(i, "D");
  console.log("    RES " + i + ", D: D=0b" + cpu.getRegister("D").toString(2));
}

console.log("  Reset (HL)");
cpu.setRegister("HL", 0x1234);
cpu.mem[0x1234] = 0b11000110;
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    Value at address 0x1234=0b" + cpu.mem[0x1234].toString(2));
for (let i = 0; i < 8; i++) {
  cpu.mem[0x1234] = value;
  instruction.RES_b_r(i, "HL");
  console.log("    RES " + i + ", (HL): (HL)=0b" + cpu.mem[0x1234].toString(2));
}

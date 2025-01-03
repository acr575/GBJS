import { CPU } from "../CPU.js";
import { Instruction } from "../Instruction.js";

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

let srcValue = 0x02;
let addValue = 0x05;
let subValue = 0x05;
let address = 0x1234;

console.log("DEBUG 8-bit ALU INSTRUCTIONS");
// ADD A,n
cpu.setRegister("A", srcValue);
cpu.setRegister("B", addValue);
cpu.setRegister("F", 0b01000000);
console.log("ADD A,n");
console.log("  Add from register (checks N flag reset)");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , B=0x" +
    cpu.getRegister("B").toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_A_n("B");
console.log("    ADD A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("HL", address);
cpu.mem[address] = 0x3;
console.log("  Add from (HL)");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log(
  "    Value at address 0x" +
    address.toString(16) +
    ": 0x" +
    cpu.mem[address].toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_A_n("HL");
console.log("    ADD A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  Add 8-bit immediate");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    addValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_A_n(addValue);
console.log("    ADD A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0);
addValue = 0;
console.log("  Test Zero Flag");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    addValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_A_n(addValue);
console.log("    ADD A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0xf);
addValue = 0x1;
console.log("  Test Half Carry");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    addValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_A_n(addValue);
console.log("    ADD A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0xf0);
addValue = 0x20;
console.log("  Test Carry");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    addValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_A_n(addValue);
console.log("    ADD A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0x8f);
cpu.setRegister("F", 0);
addValue = 0x72;
console.log("  Test Half Carry & Carry");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    addValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADD_A_n(addValue);
console.log("    ADD A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// ADC A,n
cpu.setRegister("A", srcValue);
cpu.setRegister("B", addValue);
cpu.setRegister("F", 0b00010000); // Set carry flag
console.log("\nADC A,n");
console.log("  Add from register with carry");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , B=0x" +
    cpu.getRegister("B").toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADC_A_n("B");
console.log("    ADC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("HL", address);
cpu.mem[address] = 0x3;
cpu.setRegister("F", 0); // Reset carry flag
console.log("  Add from (HL) with no initial carry");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log(
  "    Value at address 0x" +
    address.toString(16) +
    ": 0x" +
    cpu.mem[address].toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADC_A_n("HL");
console.log("    ADC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  Add 8-bit immediate with carry");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    addValue.toString(16)
);
cpu.setRegister("F", 0b00010000); // Set carry flag
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADC_A_n(addValue);
console.log("    ADC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0xf);
cpu.setRegister("F", 0b00010000); // Set carry flag
addValue = 0x1;
console.log("  Test Half Carry with carry-in");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    addValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADC_A_n(addValue);
console.log("    ADC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0xf0);
cpu.setRegister("F", 0); // No carry flag
addValue = 0x20;
console.log("  Test Carry with no initial carry");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    addValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADC_A_n(addValue);
console.log("    ADC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0x8f);
cpu.setRegister("F", 0b00010000); // Set carry flag
addValue = 0x72;
console.log("  Test Half Carry & Carry with carry-in");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    addValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.ADC_A_n(addValue);
console.log("    ADC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// SUB A,n
srcValue = 0x15;
subValue = 0x05;
cpu.setRegister("A", srcValue);
cpu.setRegister("B", subValue);
cpu.setRegister("F", 0);
console.log("\nSUB A,n");
console.log("  Sub from register (checks N flag set)");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , B=0x" +
    cpu.getRegister("B").toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SUB_A_n("B");
console.log("    SUB A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("HL", address);
cpu.mem[address] = 0x3;
cpu.setRegister("A", 0x9);
console.log("  Sub from (HL)");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log(
  "    Value at address 0x" +
    address.toString(16) +
    ": 0x" +
    cpu.mem[address].toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SUB_A_n("HL");
console.log("    SUB A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0x10);
subValue = 0x10;
console.log("  Test Zero Flag");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    subValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SUB_A_n(subValue);
console.log("    SUB A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("F", 0);
cpu.setRegister("A", 0x11);
subValue = 0x2;
console.log("  Test Half Borrow");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    subValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SUB_A_n(subValue);
console.log("    SUB A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0x10);
subValue = 0x20;
console.log("  Test Borrow");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    subValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SUB_A_n(subValue);
console.log("    SUB A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("F", 0);
cpu.setRegister("A", 0x31);
subValue = 0x45;
console.log("  Test Half Borrow & Borrow");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    subValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SUB_A_n(subValue);
console.log("    SUB A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// SBC A,n
srcValue = 0xb;
subValue = 0x05;
cpu.setRegister("A", srcValue);
cpu.setRegister("B", subValue);
cpu.setRegister("F", 0b00010000); // Set carry flag
console.log("\nSBC A,n");
console.log("  Sub from register with carry");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , B=0x" +
    cpu.getRegister("B").toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SBC_A_n("B");
console.log("    SBC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("HL", address);
cpu.mem[address] = 0x3;
cpu.setRegister("F", 0); // Reset carry flag
console.log("  Sub from (HL) with no initial carry");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log(
  "    Value at address 0x" +
    address.toString(16) +
    ": 0x" +
    cpu.mem[address].toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SBC_A_n("HL");
console.log("    SBC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0x11);
subValue = 0x10;
cpu.setRegister("F", 0b00010000); // Set carry flag
console.log("  Test Zero Flag");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    subValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SBC_A_n(subValue);
console.log("    SBC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0x11);
cpu.setRegister("F", 0b00010000); // Set carry flag
subValue = 0x1;
console.log("  Test Half Borrow with carry-in");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    subValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SBC_A_n(subValue);
console.log("    SBC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0x10);
cpu.setRegister("F", 0); // Reset carry flag
subValue = 0x20;
console.log("  Test Borrow with no initial carry");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    subValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SBC_A_n(subValue);
console.log("    SBC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0x31);
cpu.setRegister("F", 0b00010000); // Set carry flag
subValue = 0x44;
console.log("  Test Half Borrow & Borrow with carry-in");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    subValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.SBC_A_n(subValue);
console.log("    SBC A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// AND A,n
let andValue = 0b10101100;
console.log("\nAND n");
cpu.setRegister("A", 0b00101111);
cpu.setRegister("B", 0b01001011);
cpu.setRegister("F", 0b01010000);
console.log("  AND from register (test N & C flags reset)");
console.log(
  "    A=0b" +
    cpu.getRegister("A").toString(2) +
    " , B=0b" +
    cpu.getRegister("B").toString(2)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.AND_n("B");
console.log("    AND A,n : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  AND from (HL) (Test Zero flag)");
cpu.mem[address] = 0b0100;
console.log(
  "    A=0b" +
    cpu.getRegister("A").toString(2) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log(
  "    Value at address 0x" +
    address.toString(16) +
    ": 0b" +
    cpu.mem[address].toString(2)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.AND_n("HL");
console.log("    AND A,n : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0b11010011);
console.log("  AND 8-bit immediate");
console.log(
  "    A=0b" +
    cpu.getRegister("A").toString(2) +
    " , d8=0b" +
    andValue.toString(2)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.AND_n(andValue);
console.log("    AND A,n : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// OR A,n
let orValue = 0b01101000;
console.log("\nOR n");
cpu.setRegister("A", 0b00101111);
cpu.setRegister("B", 0b01001011);
cpu.setRegister("F", 0b01110000);
console.log("  OR from register (test N & H & C flags reset)");
console.log(
  "    A=0b" +
    cpu.getRegister("A").toString(2) +
    " , B=0b" +
    cpu.getRegister("B").toString(2)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.OR_n("B");
console.log("    OR A,n : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  OR from (HL) (Test Zero flag)");
cpu.setRegister("A", 0);
cpu.mem[address] = 0;
console.log(
  "    A=0b" +
    cpu.getRegister("A").toString(2) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log(
  "    Value at address 0x" +
    address.toString(16) +
    ": 0b" +
    cpu.mem[address].toString(2)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.OR_n("HL");
console.log("    OR A,n : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0b11010011);
console.log("  OR 8-bit immediate");
console.log(
  "    A=0b" +
    cpu.getRegister("A").toString(2) +
    " , d8=0b" +
    orValue.toString(2)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.OR_n(andValue);
console.log("    OR A,n : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// XOR A,n
let xorValue = 0b01101000;
console.log("\nXOR n");
cpu.setRegister("A", 0b00101111);
cpu.setRegister("B", 0b01001011);
cpu.setRegister("F", 0b01110000);
console.log("  XOR from register (test N & H & C flags reset)");
console.log(
  "    A=0b" +
    cpu.getRegister("A").toString(2) +
    " , B=0b" +
    cpu.getRegister("B").toString(2)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.XOR_n("B");
console.log("    XOR A,n : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

console.log("  XOR from (HL) (Test Zero flag)");
cpu.setRegister("A", 0b1111);
cpu.mem[address] = 0b1111;
console.log(
  "    A=0b" +
    cpu.getRegister("A").toString(2) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log(
  "    Value at address 0x" +
    address.toString(16) +
    ": 0b" +
    cpu.mem[address].toString(2)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.XOR_n("HL");
console.log("    XOR A,n : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0b11000011);
console.log("  XOR 8-bit immediate");
console.log(
  "    A=0b" +
    cpu.getRegister("A").toString(2) +
    " , d8=0b" +
    xorValue.toString(2)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.XOR_n(xorValue);
console.log("    XOR A,n : A=0b" + cpu.getRegister("A").toString(2));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// CP n
console.log("\nCP n");
cpu.setRegister("A", 0x10);
subValue = 0x10;
console.log("  Test Zero Flag");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    subValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.CP_n(subValue);
console.log("    CP n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("F", 0);
cpu.setRegister("A", 0x11);
cpu.mem[address] = 0x2;
console.log("  Test Half Borrow");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log(
  "    Value at address 0x" +
    address.toString(16) +
    ": 0x" +
    cpu.mem[address].toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.CP_n("HL");
console.log("    CP A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("A", 0x10);
cpu.setRegister("B", 0x20);
console.log("  Test Borrow");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , B=0x" +
    cpu.getRegister("B").toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.CP_n("B");
console.log("    SUB CP,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("F", 0);
cpu.setRegister("A", 0x31);
subValue = 0x45;
console.log("  Test Half Borrow & Borrow");
console.log(
  "    A=0x" +
    cpu.getRegister("A").toString(16) +
    " , d8=0x" +
    subValue.toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.CP_n(subValue);
console.log("    CP A,n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// INC n
console.log("\nINC n");
console.log("  Increment register (test N reset & don't affect C)");
cpu.setRegister("A", 0x10);
console.log("    A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.INC_n("A");
console.log("    INC n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("F", 0);
cpu.mem[address] = 0xf;
console.log("  Increment (HL) (test Half Carry)");
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log(
  "    Value at address 0x" +
    address.toString(16) +
    ": 0x" +
    cpu.mem[address].toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.INC_n("HL");
console.log("    INC n : A=0x" + cpu.mem[address].toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// DEC n
console.log("\nDEC n");
console.log("  Decrement register (test F,N set & don't affect C)");
cpu.setRegister("A", 0x1);
cpu.setRegister("F", 0b00010000);
console.log("    A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.DEC_n("A");
console.log("    DEC n : A=0x" + cpu.getRegister("A").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.setRegister("F", 0);
cpu.mem[address] = 0x10;
console.log("  Decrement (HL) (test Half Carry)");
console.log("    HL=0x" + cpu.getRegister("HL").toString(16));
console.log(
  "    Value at address 0x" +
    address.toString(16) +
    ": 0x" +
    cpu.mem[address].toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.DEC_n("HL");
console.log("    INC n : A=0x" + cpu.mem[address].toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

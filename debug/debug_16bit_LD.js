import { CPU } from "../CPU.js";
import { Instruction } from "../Instruction.js";

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

let value = 0xddee;

// LD n,nn
console.log("DEBUG 16-bit LD INSTRUCTIONS");
console.log("LD n, nn");
console.log("  To combined register");
cpu.setRegister("BC", 0xbbcc);
console.log(
  "    BC=0x" +
    cpu.getRegister("BC").toString(16) +
    " , d16=0x" +
    value.toString(16)
);
instruction.LD_n_nn("BC", value);
console.log("    LD BC,d16 : BC=0x" + cpu.getRegister("BC").toString(16));

console.log("  To SP");
console.log(
  "    SP=0x" + cpu.sp.toString(16) + " , d16=0x" + value.toString(16)
);
instruction.LD_n_nn("SP", value);
console.log("    LD SP,d16 : SP=0x" + cpu.sp.toString(16));

// LD SP,HL
cpu.setRegister("HL", 0xffdd);
console.log("LD SP,HL");
console.log(
  "    SP=0x" +
    cpu.sp.toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16)
);
instruction.LD_SP_HL();
console.log("    LD SP,HL : SP=0x" + cpu.sp.toString(16));

// LDHL SP,n
cpu.setRegister("HL", 0xabcd);
cpu.setRegister("F", 0b11000000);
cpu.sp = 0x1122;
value = 0x25;
console.log("LDHL SP,n");
console.log("  CASE 1: NO CARRY (tests flags ZN reset)");
console.log(
  "    SP=0x" +
    cpu.sp.toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " , n=0x" +
    value.toString(16)
);
console.log("    SP+n=0x" + (cpu.sp + value).toString(16));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.LDHL_SP_n(value);
console.log("    LDHL SP,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.sp = 0x8;
value = 0x9;
console.log("  CASE 2: HALF CARRY");
console.log(
  "    SP=0x" +
    cpu.sp.toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " , n=0x" +
    value.toString(16)
);
console.log("    SP+n=0x" + (cpu.sp + value).toString(16));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.LDHL_SP_n(value);
console.log("    LDHL SP,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.sp = 0xf0;
value = 0x20;
cpu.setRegister("F", 0);
console.log("  CASE 3: CARRY");
console.log(
  "    SP=0x" +
    cpu.sp.toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " , n=0x" +
    value.toString(16)
);
console.log("    SP+n=0x" + (cpu.sp + value).toString(16));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.LDHL_SP_n(value);
console.log("    LDHL SP,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.sp = 0xfff;
value = 0x1;
cpu.setRegister("F", 0);
console.log("  CASE 4: CARRY & HALF CARRY");
console.log(
  "    SP=0x" +
    cpu.sp.toString(16) +
    " , HL=0x" +
    cpu.getRegister("HL").toString(16) +
    " , n=0x" +
    value.toString(16)
);
console.log("    SP+n=0x" + (cpu.sp + value).toString(16));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.LDHL_SP_n(value);
console.log("    LDHL SP,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// LD (nn),SP
value = 0x1111;
cpu.sp = 0x1234;
console.log("LD (nn),SP");
console.log(
  "    SP=0x" + cpu.sp.toString(16) + " , nn=0x" + value.toString(16)
);
console.log(
  "    Value at address 0x" +
    value.toString(16) +
    ": 0x" +
    cpu.mem[value].toString(16)
);
console.log(
  "    Value at address 0x" +
    (value + 1).toString(16) +
    ": 0x" +
    cpu.mem[value + 1].toString(16)
);
instruction.LD_nn_SP(value);
console.log(
  "    LD (nn),SP : Addr. 0x" +
    value.toString(16) +
    "=0x" +
    cpu.mem[value].toString(16)
);
console.log(
  "                 Addr. 0x" +
    (value + 1).toString(16) +
    "=0x" +
    cpu.mem[value + 1].toString(16)
);

//PUSH nn
console.log("PUSH nn");
console.log(
  "    SP=0x" +
    cpu.sp.toString(16) +
    " , BC=0x" +
    cpu.getRegister("BC").toString(16)
);
console.log(
  "    Value at address 0x" +
    (cpu.sp - 2).toString(16) +
    ": 0x" +
    cpu.mem[cpu.sp - 2].toString(16)
);
console.log(
  "    Value at address 0x" +
    (cpu.sp - 1).toString(16) +
    ": 0x" +
    cpu.mem[cpu.sp - 1].toString(16)
);
instruction.push("BC");
console.log(
  "    PUSH nn : Addr. 0x" +
    cpu.sp.toString(16) +
    "=0x" +
    cpu.mem[cpu.sp].toString(16)
);
console.log(
  "              Addr. 0x" +
    (cpu.sp + 1).toString(16) +
    "=0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);

//POP nn
console.log("POP nn");
console.log(
  "    SP=0x" +
    cpu.sp.toString(16) +
    " , DE=0x" +
    cpu.getRegister("DE").toString(16)
);
console.log(
  "    Value at address 0x" +
    cpu.sp.toString(16) +
    ": 0x" +
    cpu.mem[cpu.sp].toString(16)
);
console.log(
  "    Value at address 0x" +
    (cpu.sp + 1).toString(16) +
    ": 0x" +
    cpu.mem[cpu.sp + 1].toString(16)
);
instruction.pop("DE");
console.log("    POP nn : DE = 0x" + cpu.getRegister("DE").toString(16));

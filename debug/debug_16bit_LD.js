import { CPU } from "../CPU.js";
import { Instruction } from "../Instruction.js";

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

let value = 0xddee;

function getSignedRepresentation8Bit(number) {
  return (number << 24) >> 24;
}

// LD n,nn
console.log("DEBUG 16-bit LD INSTRUCTIONS");
console.log("LD n, nn");
console.log("  To combined register");
cpu.setRegister("BC", 0xbbcc);
cpu.mem[cpu.pc + 1] = value & 0x00ff;
cpu.mem[cpu.pc + 2] = value >> 8;

console.log(
  "    Mem[pc+1]: 0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "; Mem[pc+2]: 0x" +
    cpu.mem[cpu.pc + 2].toString(16) +
    "; BC=0x" +
    cpu.getRegister("BC").toString(16)
);
instruction.LD_n_nn("BC", value);
console.log("    LD BC,d16 : BC=0x" + cpu.getRegister("BC").toString(16));

console.log("  To SP");
console.log(
  "    Mem[pc+1]: 0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "; Mem[pc+2]: 0x" +
    cpu.mem[cpu.pc + 2].toString(16) +
    "; SP=0x" +
    cpu.sp.toString(16)
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

// LDHL SP,r8
cpu.setRegister("HL", 0xabcd);
cpu.setRegister("F", 0b11000000);
cpu.sp = 0x0012;
value = 0xff;
cpu.mem[cpu.pc + 1] = value;
console.log("LDHL SP,r8 (signed value)");
console.log("  CASE 1: NO CARRY (tests flags ZN reset)");
console.log(
  "    Mem[pc+1]=0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "; SP=0x" +
    cpu.sp.toString(16) +
    "; HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log(
  "    SP+n=0x" + getSignedRepresentation8Bit(cpu.sp + value).toString(16)
);
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.LDHL_SP_n(value);
console.log("    LDHL SP,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.sp = 0x8;
value = 0x9;
cpu.mem[cpu.pc + 1] = value;
console.log("  CASE 2: HALF CARRY");
console.log(
  "    Mem[pc+1]=0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "; SP=0x" +
    cpu.sp.toString(16) +
    "; HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log("    SP+n=0x" + (cpu.sp + value).toString(16));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.LDHL_SP_n(value);
console.log("    LDHL SP,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.sp = 0xf0;
value = 0x20;
cpu.mem[cpu.pc + 1] = value;
cpu.setRegister("F", 0);
console.log("  CASE 3: CARRY");
console.log(
  "    Mem[pc+1]=0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "; SP=0x" +
    cpu.sp.toString(16) +
    "; HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log("    SP+n=0x" + (cpu.sp + value).toString(16));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.LDHL_SP_n(value);
console.log("    LDHL SP,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

cpu.sp = 0xfff;
value = 0x1;
cpu.mem[cpu.pc + 1] = value;
cpu.setRegister("F", 0);
console.log("  CASE 4: CARRY & HALF CARRY");
console.log(
  "    Mem[pc+1]=0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "; SP=0x" +
    cpu.sp.toString(16) +
    "; HL=0x" +
    cpu.getRegister("HL").toString(16)
);
console.log("    SP+n=0x" + (cpu.sp + value).toString(16));
console.log("    FLAGS BEFORE: ZNHC=" + cpu.getRegister("F").toString(2));
instruction.LDHL_SP_n(value);
console.log("    LDHL SP,n : HL=0x" + cpu.getRegister("HL").toString(16));
console.log("    FLAGS AFTER: ZNHC=" + cpu.getRegister("F").toString(2));

// LD (nn),SP
value = 0x1111;
cpu.sp = 0x1234;
cpu.mem[cpu.pc + 1] = value & 0xff;
cpu.mem[cpu.pc + 2] = value >> 8;
console.log("LD (nn),SP");
console.log(
  "    Mem[pc+1]: 0x" +
    cpu.mem[cpu.pc + 1].toString(16) +
    "; Mem[pc+2]: 0x" +
    cpu.mem[cpu.pc + 2].toString(16) +
    "; SP=0x" +
    cpu.sp.toString(16)
);
console.log(
  "    Value at address 0x" +
    value.toString(16) +
    ": 0x" +
    cpu.mem[value + 1].toString(16)
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
    cpu.mem[cpu.sp + 1].toString(16) +
      "\n\t\t\t  SP\t\t  =0x" +
        cpu.sp.toString(16)
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

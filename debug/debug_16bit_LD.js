import { CPU, Instruction } from "../gb.js";

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
cpu.sp = 0x1f;
value = 0x1;
console.log("LDHL SP,n");
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

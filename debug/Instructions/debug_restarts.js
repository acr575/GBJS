import { CPU } from "../../CPU.js";
import { Instruction } from "../../Instruction.js";

/* ######### DEBUG ######### */
let cpu = new CPU();
let instruction = new Instruction(cpu);

// Valid RST addresses (hexadecimal values)
const validAddresses = [0x00, 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, 0x38];

// RST n
console.log("RST n");

console.log("  Test RST to unvalid address");
try {
  instruction.RST_n(0x23);
} catch (error) {
  console.error(error + "\n");
}

console.log("\n");
validAddresses.forEach((address) => {
  cpu.pc = Math.floor(Math.random() * 0x10000);
  console.log("  Address 0x" + address.toString(16));
  console.log("\tPC=0x" + cpu.pc.toString(16));
  console.log(
    "\tSP=x0" +
      cpu.sp.toString(16) +
      ", mem[SP]=0x" +
      cpu.mmu.readWord(cpu.sp).toString(16)
  );
  instruction.RST_n(address);
  console.log("\tRST 0x" + address.toString(16));
  console.log("\tPC=0x" + cpu.pc.toString(16));
  console.log(
    "\tSP=x0" +
      cpu.sp.toString(16) +
      ", mem[SP]=0x" +
      cpu.mmu.readWord(cpu.sp).toString(16)
  );
  console.log("\n");
});

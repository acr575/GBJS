import { CPU } from "../src/CPU.js";

const cpu = new CPU();

/* Test Request Interrupt */
console.log("Test Request Interrupt");
console.log(`\tIF: ${cpu.mmu.readByte(cpu.if).toString(2)}`);
for (let i = 0; i <= 4; i++) {
  cpu.requestInterrupt(i);
  console.log(
    `\trequestInterrupt(${i}) IF: ${cpu.mmu.readByte(cpu.if).toString(2)}`
  );
}

console.log("\n");

/* Test Do Interrupts & Service Interrupt */
console.log("Test Do Interrupts & Service Interrupt");

// IME = 0
console.log("  IME = 0. Nothing happens");
cpu.doInterrupts();
console.log(`\tdoInterrupts()`);
console.log(`\t0x${cpu.pc.toString(16)}`);

// IME = 1
cpu.ime = 1;
cpu.mmu.writeByte(cpu.ie, 0b11111);
const pop = () => {
  return cpu.instruction.pop("BC");
};
console.log("  IME = 1");
console.log(`\tIF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`);
cpu.doInterrupts();
console.log(`\tIF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`);
console.log(`\tPC: 0x${cpu.pc.toString(16)}`);
console.log(`\tPOP: 0x${pop().toString(16)}`);
console.log(`\tPOP: 0x${pop().toString(16)}`);
console.log(`\tPOP: 0x${pop().toString(16)}`);
console.log(`\tPOP: 0x${pop().toString(16)}`);

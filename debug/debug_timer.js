import { Timer } from "../src/Timer.js";
import { CPU } from "../src/CPU.js";

const cpu = new CPU();
const timer = new Timer(cpu);

/* TEST getClockFreq() */
console.log("TEST getClockFreq()");
cpu.mmu.writeByte(0xff07, 0b11011110);
console.log(`\tTAC (0xff07)=0b${cpu.mmu.readByte(0xff07).toString(2)}`);
console.log(`\tgetClockFreq()=0b${timer.getClockFreq().toString(2)}`);

console.log("\n");

/* TEST setClockFreq() */
console.log("TEST setClockFreq()");
for (let i = 0; i < 4; i++) {
  console.log(`  FREQ=${i.toString(2)}`);
  cpu.mmu.writeByte(0xff07, i);
  console.log(`\tTAC (0xff07)=0b${cpu.mmu.readByte(0xff07).toString(2)}`);
  console.log(`\tsetClockFreq()`);
  timer.setClockFreq();
  console.log(`\ttimerCounter=${timer.timerCounter}`);
}

console.log("\n");

/* TEST writeTAC() */
console.log("TEST writeTAC()");
console.log("  Not changing current freq");
console.log(
  `\tTAC: ${cpu.mmu.readByte(0xff07).toString(2)}; timerCounter: ${
    timer.timerCounter
  }`
);
console.log("\twriteTAC(0b111)");
timer.writeTAC(0b111);
console.log(
  `\tTAC: ${cpu.mmu.readByte(0xff07).toString(2)}; timerCounter: ${
    timer.timerCounter
  }`
);

console.log("  Changing current freq");
console.log(
  `\tTAC: ${cpu.mmu.readByte(0xff07).toString(2)}; timerCounter: ${
    timer.timerCounter
  }`
);
console.log("\twriteTAC(0b101)");
timer.writeTAC(0b101);
console.log(
  `\tTAC: ${cpu.mmu.readByte(0xff07).toString(2)}; timerCounter: ${
    timer.timerCounter
  }`
);

console.log("\n");

/* TEST isTimaEnabled() */
console.log("TEST isTimaEnabled()");
console.log(`\tTAC enable flag: ${(cpu.mmu.readByte(0xff07) >> 2) & 1}`);
console.log(`\tisTimaEnabled(): ${timer.isTimaEnabled()}`);
timer.writeTAC(0b011);
console.log(`\tTAC enable flag: ${(cpu.mmu.readByte(0xff07) >> 2) & 1}`);
console.log(`\tisTimaEnabled(): ${timer.isTimaEnabled()}`);

console.log("\n");

/* TEST incDividerRegister() */
console.log("TEST incDividerRegister()");
console.log("  No reset, no increment");
console.log(`\tdividerCounter: ${timer.dividerCounter}`);
timer.incDividerRegister(16);
console.log("\tincDividerRegister(16)");
console.log(`\tdividerCounter: ${timer.dividerCounter}`);
console.log(`\tDIV: ${cpu.mmu.readByte(0xff04)}`);

console.log("  Reset, increment");
console.log(`\tdividerCounter: ${timer.dividerCounter}`);
timer.incDividerRegister(239);
console.log("\tincDividerRegister(239)");
console.log(`\tdividerCounter: ${timer.dividerCounter}`);
console.log(`\tDIV: ${cpu.mmu.readByte(0xff04)}`);

console.log("\n");

/* TEST updateTimers() */
timer.writeTAC(0b111);
console.log("TEST updateTimers()");
console.log("  timerCounter not getting to 0");
console.log(`\ttimerCounter: ${timer.timerCounter}`);
console.log("\tupdateTimers(24)");
timer.updateTimers(24);
console.log(`\ttimerCounter: ${timer.timerCounter}`);
console.log(`\tTIMA: ${cpu.mmu.readByte(0xff05)}`);

console.log("  timerCounter getting to 0");
console.log(`\ttimerCounter: ${timer.timerCounter}`);
console.log("\tupdateTimers(232)");
timer.updateTimers(232);
console.log(`\ttimerCounter: ${timer.timerCounter}`);
console.log(`\tTIMA: ${cpu.mmu.readByte(0xff05)}`);

cpu.mmu.writeByte(0xff05, 0xff);
cpu.mmu.writeByte(0xff06, 0xaa);
console.log("  TIMA overflows");
console.log(`\ttimerCounter: ${timer.timerCounter}`);
console.log("\tupdateTimers(256)");
timer.updateTimers(256);
console.log(`\ttimerCounter: ${timer.timerCounter}`);
console.log(`\tTMA: ${cpu.mmu.readByte(0xff06)}`);
console.log(`\tTIMA: ${cpu.mmu.readByte(0xff05)}`);

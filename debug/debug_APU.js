import { APU } from "../src/APU/APU.js";
import { CPU } from "../src/CPU.js";

const cpu = new CPU();
const apu = new APU(cpu);

cpu.mmu.writeByte(0xff26, 0b10000000); // NR52
cpu.mmu.writeByte(0xff24, 0b00100101); // NR50

console.log("Audio on: " + apu.isAudioOn());
console.log("Left volume: " + apu.getLeftVolume().toString(2));
console.log("Right volume: " + apu.getRightVolume().toString(2));

// CH2
cpu.mmu.writeByte(0xff16, 0b00001111); // NR21
cpu.mmu.writeByte(0xff17, 0b01000001); // NR22
cpu.mmu.writeByte(0xff18, 0b11100111); // NR23
cpu.mmu.writeByte(0xff19, 0b00001011); // NR24

console.log(
  "CH2 InitialLengthTimer: " + apu.ch2.getInitialLengthTimer().toString(2)
);
console.log("CH2 Wave duty: " + apu.ch2.getWaveDuty());
console.log("CH2 Initial volume: " + apu.ch2.getInitialVolume());
console.log("CH2 Envelop dir: " + apu.ch2.getEnvelopeDir());
console.log("CH2 Sweep pace: " + apu.ch2.getSweepPace().toString(2));
console.log("CH2 Period: " + apu.ch2.getPeriodFreq());
console.log("CH2 DAC: " + apu.ch2.isDACOn());

// CH3
// cpu.mmu.writeByte(0xff1a, 0b00000000);

document.getElementById("beep").addEventListener("click", () => {
  // apu.ch2.trigger();
});

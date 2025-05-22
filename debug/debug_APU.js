import { APU } from "../src/APU/APU.js";
import { CPU } from "../src/CPU.js";

const cpu = new CPU();
const apu = new APU(cpu);

// General registers

cpu.mmu.writeByte(0xff26, 0b10000000); // NR52
cpu.mmu.writeByte(0xff24, 0b00100101); // NR50

console.log("Audio on: " + apu.isAudioOn());
console.log("Left volume: " + apu.getLeftVolume().toString(2));
console.log("Right volume: " + apu.getRightVolume().toString(2));

console.log("\n");

// CH2
cpu.mmu.writeByte(0xff16, 0b00001111); // NR21
cpu.mmu.writeByte(0xff17, 0b01000001); // NR22
cpu.mmu.writeByte(0xff18, 0b11100111); // NR23
cpu.mmu.writeByte(0xff19, 0b00001011); // NR24

console.log("CH2 Length Timer: " + apu.ch2.getInitialLengthTimer().toString(2));
console.log("CH2 Wave duty: " + apu.ch2.getWaveDuty());
console.log("CH2 Initial volume: " + apu.ch2.getInitialVolume());
console.log("CH2 Envelop dir: " + apu.ch2.getEnvelopeDir());
console.log("CH2 Envelope pace: " + apu.ch2.getEnvelopePace().toString(2));
console.log("CH2 Period: " + apu.ch2.getPeriodFreq());
console.log("CH2 DAC: " + apu.ch2.isDACOn());

console.log("\n");

// CH3
cpu.mmu.writeByte(apu.ch3.nr30, 0b11000000); // DAC
cpu.mmu.writeByte(apu.ch3.nr31, 0b11111111); // Length timer
cpu.mmu.writeByte(apu.ch3.nr32, 0b01100000); // Output level
cpu.mmu.writeByte(apu.ch3.nr33, 0b10101100); // Period low
cpu.mmu.writeByte(apu.ch3.nr34, 0b11000101); // Period high & control

// Wave RAM filling
let sample = 0;
for (let i = apu.ch3.waveRam.start; i <= apu.ch3.waveRam.end; i++) {
  const upper = sample;
  const lower = 15 - sample;

  cpu.mmu.writeByte(i, (upper << 4) | lower);
  sample++;
}

console.log("CH3 DAC: " + apu.ch3.isDACOn());
console.log("CH3 Length timer: " + apu.ch3.getInitialLengthTimer().toString(2));
console.log("CH3 Output level: " + apu.ch3.getOutputLevel());
console.log(
  "CH3 Period: " + apu.ch3.getPeriod() + " Freq: " + apu.ch3.getPeriodFreq()
);
console.log("Length enabled: " + apu.ch3.isLengthEnabled());

console.log("\n");

// CH4
cpu.mmu.writeByte(apu.ch4.nr41, 0b00101000);
cpu.mmu.writeByte(apu.ch4.nr42, 0b10101110);
cpu.mmu.writeByte(apu.ch4.nr43, 0b10101101);

console.log("CH3 Length timer: " + apu.ch4.getInitialLengthTimer().toString(2));
console.log("CH4 Initial volume: " + apu.ch4.getInitialVolume());
console.log("CH4 Envelop dir: " + apu.ch4.getEnvelopeDir());
console.log("CH4 Envelope pace: " + apu.ch4.getEnvelopePace().toString(2));
console.log("CH4 DAC: " + apu.ch4.isDACOn());
console.log("CH4 Clock shift: " + apu.ch4.getClockShift().toString(2));
console.log("CH4 LFSR width: " + apu.ch4.getLFSRWidth().toString(2));
console.log("CH4 Clock divider: " + apu.ch4.getClockDivider().toString(2));
console.log("CH4 Clock freq: " + apu.ch4.getLFSRClockFreq());

document.getElementById("beep").addEventListener("click", () => {
  // apu.ch2.trigger();
  // apu.ch3.trigger();
  var bufferSize = 4096 * 4;
  const source = apu.audioCtx.createBufferSource();
  const buffer = apu.audioCtx.createBuffer(
    1,
    bufferSize,
    apu.audioCtx.sampleRate
  );
  const channelData = buffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) {
    channelData[i] = Math.random() * 2 - 1;
  }
  source.buffer = buffer;
  source.loop = true;
  source.connect(apu.audioCtx.destination);

  source.start();
});

import { setBit, testBit } from "../GameBoyUtils.js";
import { CH1 } from "./CH1.js";
import { CH2 } from "./CH2.js";
import { CH3 } from "./CH3.js";

export class APU {
  constructor(cpu) {
    this.cpu = cpu;

    this.audioCtx = new AudioContext();
    this.ch1 = new CH1(this);
    this.ch2 = new CH2(this);
    this.ch3 = new CH3(this);

    this.nr50 = 0xff24; // Master volume & VIN panning
    this.nr52 = 0xff26; // Audio master control

    this.channelsTriggerAddrs = {
      0xff14: this.ch1,
      0xff19: this.ch2,
    };

    this.channelsDACAddrs = {
      0xff12: this.ch1,
      0xff17: this.ch2,
      0xff1a: this.ch3,
    };
  }

  getLeftVolume() {
    return (this.cpu.mmu.readByte(this.nr50) >> 4) & 0b111; // Bits 4-6
  }

  getRightVolume() {
    return this.cpu.mmu.readByte(this.nr50) & 0b111; // Bits 0-2
  }

  getVINLeft() {
    return testBit(this.cpu.mmu.readByte(this.nr50), 7);
  }

  getVINRight() {
    return testBit(this.cpu.mmu.readByte(this.nr50), 3);
  }

  isAudioOn() {
    return testBit(this.cpu.mmu.readByte(this.nr52), 7);
  }

  updateAudio(cycles) {
    if (!this.isAudioOn()) return;

    this.ch1.update(cycles);
    this.ch2.update(cycles);
  }

  writeByte(addr, val) {
    if (addr == this.nr52) this.cpu.mmu.ioRegs[addr & 0x7f] = val & 0b10000000;
    // Only bit 7 writeable
    else if (!this.isAudioOn()) return; // Registers are read-only if audio off
    else if (Object.keys(this.channelsDACAddrs).includes(addr.toString()))
      this.handleDACWrite(addr, val);
    else if (Object.keys(this.channelsTriggerAddrs).includes(addr.toString()))
      this.handleChannelTrigger(addr, val);
    else this.cpu.mmu.ioRegs[addr & 0x7f] = val;
  }

  handleDACWrite(addr, val) {
    const targetChannel = this.channelsDACAddrs[addr];
    this.cpu.mmu.ioRegs[addr & 0x7f] = val;
    if (!targetChannel.isDACOn()) targetChannel.stop(); // DAC disabled
  }

  handleChannelTrigger(addr, val) {
    this.cpu.mmu.ioRegs[addr & 0x7f] = val;

    const targetChannel = this.channelsTriggerAddrs[addr];
    const targetChannelIndex = Object.keys(this.channelsTriggerAddrs).indexOf(
      addr.toString()
    );

    targetChannel.trigger();

    // Set NR52 channel's bit
    const currentNR52 = this.cpu.mmu.ioRegs[this.nr52 & 0x7f];
    this.cpu.mmu.ioRegs[this.nr52 & 0x7f] = setBit(
      currentNR52,
      targetChannelIndex
    );
  }
}

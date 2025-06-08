import { setBit, testBit } from "../GameBoyUtils.js";
import { CH1 } from "./CH1.js";
import { CH2 } from "./CH2.js";
import { CH3 } from "./CH3.js";
import { CH4 } from "./CH4.js";

export class APU {
  #ch1 = null;
  #ch2 = null;
  #ch3 = null;
  // #ch4 = null;
  #nr50 = 0xff24; // Master volume
  #nr51 = 0xff25; // Sound panning
  #nr52 = 0xff26; // Audio master control

  #channelsTriggerAddrs = {};
  #channelsDACAddrs = {};

  constructor(cpu) {
    this.cpu = cpu;

    this.audioCtx = new AudioContext();
    this.#ch1 = new CH1(this);
    this.#ch2 = new CH2(this);
    this.#ch3 = new CH3(this);
    // this.ch4 = new CH4(this);

    this.#channelsTriggerAddrs = {
      0xff14: this.#ch1,
      0xff19: this.#ch2,
      0xff1e: this.#ch3,
      // 0xff23: this.ch4,
    };

    this.#channelsDACAddrs = {
      0xff12: this.#ch1,
      0xff17: this.#ch2,
      0xff1a: this.#ch3,
      // 0xff21: this.ch4,
    };

    this.masterVolume = 0.05;
  }

  getLeftVolume() {
    return ((this.cpu.mmu.readByte(this.#nr50) >> 4) & 0b111) / 8; // Bits 4-6
  }

  getRightVolume() {
    return (this.cpu.mmu.readByte(this.#nr50) & 0b111) / 8; // Bits 0-2
  }

  getPanning(ch) {
    const panning = this.cpu.mmu.readByte(this.#nr51);

    return { left: testBit(panning, ch + 3), right: testBit(panning, ch - 1) };
  }

  #isAudioOn() {
    return testBit(this.cpu.mmu.readByte(this.#nr52), 7);
  }

  updateAudio(cycles) {
    if (!this.#isAudioOn()) return;

    if (this.#ch1.isTriggered) this.#ch1.update(cycles);
    if (this.#ch2.isTriggered) this.#ch2.update(cycles);
    if (this.#ch3.isTriggered) this.#ch3.update(cycles);
    // this.ch4.update(cycles);
  }

  writeByte(addr, val) {
    // Only bit 7 writeable
    if (addr == this.#nr52) this.#handleAudioPowerOnOff(val);
    else if (!this.#isAudioOn()) return; // Registers are read-only if audio off
    else if (addr == this.#nr51 || addr == this.#nr50)
      this.#handlePanning(addr, val); // Update channel padding & volume
    else if (Object.keys(this.#channelsDACAddrs).includes(addr.toString()))
      this.#handleDACWrite(addr, val);
    else if (Object.keys(this.#channelsTriggerAddrs).includes(addr.toString()))
      this.#handleChannelTrigger(addr, val);
    else this.cpu.mmu.ioRegs[addr & 0x7f] = val;
  }

  #handleAudioPowerOnOff(val) {
    if (this.#isAudioOn && !testBit(val, 7)) {
      // Stop all channels
      this.#ch1.stop();
      this.#ch2.stop();
      this.#ch3.stop();
      // this.#ch4.stop();
    }

    this.cpu.mmu.ioRegs[this.#nr52 & 0x7f] = val & 0b10000000;
  }

  #handlePanning(addr, val) {
    this.cpu.mmu.ioRegs[addr & 0x7f] = val;
    // if (this.#ch1.isTriggered) this.#ch1.updatePanning();
    // if (this.#ch2.isTriggered) this.#ch2.updatePanning();
    // if (this.#ch3.isTriggered) this.#ch3.updatePanning();
  }

  #handleDACWrite(addr, val) {
    const targetChannel = this.#channelsDACAddrs[addr];
    this.cpu.mmu.ioRegs[addr & 0x7f] = val;
    if (!targetChannel.isDACOn()) targetChannel.stop(); // DAC disabled
  }

  #handleChannelTrigger(addr, val) {
    this.cpu.mmu.ioRegs[addr & 0x7f] = val;

    if (!testBit(val, 7)) return;

    const targetChannel = this.#channelsTriggerAddrs[addr];
    const targetChannelIndex = Object.keys(this.#channelsTriggerAddrs).indexOf(
      addr.toString()
    );

    targetChannel.trigger();

    // Set NR52 channel's bit
    const currentNR52 = this.cpu.mmu.ioRegs[this.#nr52 & 0x7f];
    this.cpu.mmu.ioRegs[this.#nr52 & 0x7f] = setBit(
      currentNR52,
      targetChannelIndex
    );
  }
}

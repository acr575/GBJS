import { setBit, testBit } from "../GameBoyUtils.ts";
import { CH1 } from "./CH1.ts";
import { CH2 } from "./CH2.ts";
import { CH3 } from "./CH3.ts";
import { CH4 } from "./CH4.ts";

export class APU {
  cpu: any;

  ch1: CH1 | null = null;
  ch2: CH2 | null = null;
  ch3: CH3 | null = null;
  // ch4: CH4 | null = null;

  nr50: number = 0xff24; // Master volume
  nr51: number = 0xff25; // Sound panning
  nr52: number = 0xff26; // Audio master control

  channelsTriggerAddrs: Record<number, any> = {};
  channelsDACAddrs: Record<number, any> = {};
  channels: any[] = [];

  audioCtx: AudioContext | null = null;

  maxVolume: number = 0.1;
  masterVolume: number = this.maxVolume;

  constructor(cpu: any) {
    this.cpu = cpu;

    // Defensive AudioContext creation for non-browser environments (Node)
    if (typeof AudioContext !== "undefined") {
      try {
        this.audioCtx = new AudioContext();
      } catch (e) {
        this.audioCtx = null;
      }
    } else {
      this.audioCtx = null;
    }

    this.ch1 = new CH1(this);
    this.ch2 = new CH2(this);
    this.ch3 = new CH3(this);
    // this.ch4 = new CH4(this);
    this.channels = [this.ch1, this.ch2, this.ch3];

    this.channelsTriggerAddrs = {
      0xff14: this.ch1,
      0xff19: this.ch2,
      0xff1e: this.ch3,
      // 0xff23: this.ch4,
    };

    this.channelsDACAddrs = {
      0xff12: this.ch1,
      0xff17: this.ch2,
      0xff1a: this.ch3,
      // 0xff21: this.ch4,
    };

    this.maxVolume = 0.1;
    this.masterVolume = this.maxVolume;
  }

  getLeftVolume(): number {
    return ((this.cpu.mmu.readByte(this.nr50) >> 4) & 0b111) / 8; // Bits 4-6
  }

  getRightVolume(): number {
    return (this.cpu.mmu.readByte(this.nr50) & 0b111) / 8; // Bits 0-2
  }

  getPanning(ch: number) {
    const panning = this.cpu.mmu.readByte(this.nr51);

    return { left: testBit(panning, ch + 3), right: testBit(panning, ch - 1) };
  }

  private isAudioOn(): boolean {
    return testBit(this.cpu.mmu.readByte(this.nr52), 7);
  }

  updateAudio(cycles: number) {
    if (!this.isAudioOn()) return;

    if (this.ch1?.isTriggered) this.ch1.update(cycles);
    if (this.ch2?.isTriggered) this.ch2.update(cycles);
    if (this.ch3?.isTriggered) this.ch3.update(cycles);
    // this.ch4.update(cycles);
  }

  mute(...channels: number[]) {
    if (channels.length == 0) this.audioCtx?.suspend();
    else {
      channels.forEach((ch) => {
        const channelObject = this.channels[ch - 1];
        channelObject.stop?.();
        channelObject.triggerEnabled = false;
      });
    }
  }

  unmute(...channels: number[]) {
    if (channels.length == 0) this.audioCtx?.resume();
    else {
      channels.forEach((ch) => {
        const channelObject = this.channels[ch - 1];
        channelObject.triggerEnabled = true;
      });
    }
  }

  writeByte(addr: number, val: number) {
    // Only bit 7 writeable
    if (addr === this.nr52) this.handleAudioPowerOnOff(val);
    else if (!this.isAudioOn()) return; // Registers are read-only if audio off
    else if (addr === this.nr51 || addr === this.nr50) this.handlePanning(addr, val); // Update channel padding & volume
    else if (this.channelsDACAddrs[addr] !== undefined) this.handleDACWrite(addr, val);
    else if (this.channelsTriggerAddrs[addr] !== undefined) this.handleChannelTrigger(addr, val);
    else this.cpu.mmu.ioRegs[addr & 0x7f] = val;
  }

  private handleAudioPowerOnOff(val: number) {
    const wasOn = this.isAudioOn();
    if (wasOn && !testBit(val, 7)) {
      // Stop all channels
      this.ch1?.stop();
      this.ch2?.stop();
      this.ch3?.stop();
      // this.ch4.stop();
    }

    this.cpu.mmu.ioRegs[this.nr52 & 0x7f] = val & 0b10000000;
  }

  private handlePanning(addr: number, val: number) {
    this.cpu.mmu.ioRegs[addr & 0x7f] = val;
    // panning updates are deferred to channels
  }

  private handleDACWrite(addr: number, val: number) {
    const targetChannel = this.channelsDACAddrs[addr];
    this.cpu.mmu.ioRegs[addr & 0x7f] = val;
    if (targetChannel && !targetChannel.isDACOn()) targetChannel.stop(); // DAC disabled
  }

  private handleChannelTrigger(addr: number, val: number) {
    this.cpu.mmu.ioRegs[addr & 0x7f] = val;

    if (!testBit(val, 7)) return;

    const targetChannel = this.channelsTriggerAddrs[addr];
    const targetChannelIndex = Object.keys(this.channelsTriggerAddrs).indexOf(addr.toString());

    if (targetChannel?.triggerEnabled) targetChannel.trigger();

    // Set NR52 channel's bit
    const currentNR52 = this.cpu.mmu.ioRegs[this.nr52 & 0x7f];
    this.cpu.mmu.ioRegs[this.nr52 & 0x7f] = setBit(
      currentNR52,
      targetChannelIndex
    );
  }
}

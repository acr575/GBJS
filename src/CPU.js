import { OpcodeTable } from "./OpcodeTable.js";
import { MMU } from "./MMU.js";
import { Timer } from "./Timer.js";
import { GPU } from "./GPU.js";
import { Joypad } from "./Joypad.js";
import { APU } from "./APU/APU.js";
import { getSignedByte, resetBit, setBit } from "./GameBoyUtils.js";

const nextButton = document.getElementById("next");
const debugPC = document.getElementById("pc");
const debugSP = document.getElementById("sp");
const debugA = document.getElementById("a");
const debugF = document.getElementById("f");
const debugB = document.getElementById("b");
const debugC = document.getElementById("c");
const debugD = document.getElementById("d");
const debugE = document.getElementById("e");
const debugH = document.getElementById("h");
const debugL = document.getElementById("l");
const stop = document.getElementById("stop");

export class CPU {
  constructor() {
    this.registersValues = new Uint8Array(8); // a-l 8 bit registers
    this.pc = 0x100; // Program Counter. Initialized at 0x100
    this.sp = 0xfffe; // Stack Pointer.  Initialized at 0xfffe

    this.ie = 0xffff; // Interrupt enable flag
    this.if = 0xff0f; // Interrupt request flag
    this.ime = false; // Interrup master enable flag. Starts unset
    this.requestIme = 0; // Flag that sets IME flag after next instruccion. Used by EI instruction
    this.isHalted = 0;
    this.isStopped = 0;
    this.cycleCounter = 0;
    this.CLOCKSPEED = 4194304; // Hz

    this.mmu = new MMU(this); // Memory Management
    this.timer = new Timer(this); // System timer
    this.gpu = new GPU(this); // Graphics Processing Unit
    this.joypad = new Joypad(this); // Input
    this.apu = new APU(this); // Audio

    this.opcodeTable = new OpcodeTable(this); // Init opcode table
    this.instructionTable = this.opcodeTable.instructionTable; // Links each opcode with it instruction, length and cycles
    this.prefixInstructionTable = this.opcodeTable.prefixInstructionTable; // Links each CB prefixed opcode with it instruction, length and cycles
  }

  init() {
    // this.mmu = new MMU(this);

    this.pc = 0x100;
    this.setRegister("AF", 0x01b0);
    this.setRegister("BC", 0x0013);
    this.setRegister("DE", 0x00d8);
    this.setRegister("HL", 0x014d);
    this.sp = 0xfffe;

    this.mmu.ioRegs[0xff00 & 0x7f] = 0xcf; // P1
    this.mmu.writeByte(0xff10, 0x80);
    this.mmu.writeByte(0xff11, 0xbf);
    this.mmu.writeByte(0xff12, 0xf3);
    this.mmu.writeByte(0xff13, 0xff);
    this.mmu.writeByte(0xff14, 0xbf);
    this.mmu.writeByte(0xff16, 0x3f);
    this.mmu.writeByte(0xff18, 0xff);
    this.mmu.writeByte(0xff19, 0xbf);
    this.mmu.writeByte(0xff1a, 0x7f);
    this.mmu.writeByte(0xff1b, 0xff);
    this.mmu.writeByte(0xff1c, 0x9f);
    this.mmu.writeByte(0xff1e, 0xbf);
    this.mmu.writeByte(0xff20, 0xff);
    this.mmu.writeByte(0xff23, 0xbf);
    this.mmu.writeByte(0xff24, 0x77);
    this.mmu.writeByte(0xff25, 0xf3);
    this.mmu.writeByte(0xff26, 0xf1);
    this.mmu.writeByte(0xff40, 0x91);
    this.mmu.writeByte(0xff41, 0x81);
    this.mmu.writeByte(0xff44, 0x91);
    this.mmu.writeByte(0xff46, 0xff);
    this.mmu.writeByte(0xff47, 0xfc);
    this.mmu.writeByte(0xff48, 0xff);
    this.mmu.writeByte(0xff49, 0xff);
  }

  static Registers = Object.freeze({
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
    F: "F",
    H: "H",
    L: "L",
  });

  /**
   * Retrieves the value of a specified CPU register. Supports both simple and combined registers.
   *
   * @param {string} register - The name of the register to retrieve.
   *                            Can be a single register (e.g., "A", "B")
   *                            or a combined register (e.g., "AF", "BC").
   * @returns {number | undefined} The value stored in the register. For combined registers,
   *                               returns a 16-bit value where the higher 8 bits are from
   *                               the first register and the lower 8 bits are from the second.
   */
  getRegister(register) {
    if (typeof register !== "string") {
      console.error("Unknown register: " + register);
      return;
    }

    register = register.toUpperCase();

    // Simple register
    if (register.length == 1 && register in CPU.Registers) {
      const index = Object.keys(CPU.Registers).indexOf(register);
      return this.registersValues[index];
    }
    // Combined register
    else if (register.length == 2) {
      const left = register.split("")[0];
      const right = register.split("")[1];

      if (left in CPU.Registers && right in CPU.Registers) {
        const leftIndex = Object.keys(CPU.Registers).indexOf(left);
        const rightIndex = Object.keys(CPU.Registers).indexOf(right);

        return (
          (this.registersValues[leftIndex] << 8) |
          this.registersValues[rightIndex]
        );
      } else console.error("Unknown combined register: " + register);
    } else console.error("Unknown register: " + register);
  }

  /**
   * Sets the value of a specified CPU register. Supports both simple and combined registers.
   *
   * @param {string} register - The name of the register to modify.
   *                            Can be a single register (e.g., "A", "B")
   *                            or a combined register (e.g., "AF", "BC").
   * @param {number} value - The value to set in the register. For combined registers,
   *                         the higher 8 bits are stored in the first register,
   *                         and the lower 8 bits in the second.
   */
  setRegister(register, value) {
    if (typeof register !== "string") {
      console.error("Unknown register: " + register);
      return;
    }

    register = register.toUpperCase();

    // Simple register
    if (register.length == 1 && register in CPU.Registers) {
      const index = Object.keys(CPU.Registers).indexOf(register);
      this.registersValues[index] =
        register !== "F" ? value & 0xff : value & 0xf0;
    }
    // Combined register
    else if (register.length == 2) {
      const left = register.split("")[0];
      const right = register.split("")[1];

      if (left in CPU.Registers && right in CPU.Registers) {
        const leftIndex = Object.keys(CPU.Registers).indexOf(left);
        const rightIndex = Object.keys(CPU.Registers).indexOf(right);

        this.registersValues[leftIndex] = (value & 0xff00) >> 8;
        this.registersValues[rightIndex] =
          right !== "F" ? value & 0xff : value & 0xf0;
      } else throw new Error("Unknown combined register: " + register);
    } else throw new Error("Unknown register: " + register);
  }

  /**
   * Sets the flags in the F register.
   * Flags are affected in Z, N, H, C order.
   *
   * @param {string} flags - A string of flags to set, e.g., "ZNHC" or "001-" (where Z = Zero, N = Subtract, H = Half Carry, C = Carry. 0 means reset; 1 means set; - means no change; flag letter means activation depends on flag value).
   * @param {Object} values - Object containing the values for the flags Z, N, H, C. e.g. { Z: true, N: false, H: true, C: false }.
   */
  setFlags(flags, values) {
    if (flags.length !== 4) {
      console.error("Flags string must be of length 4 (e.g., 'ZNHC').");
      return;
    }

    // Get current register F value
    let registerF = this.getRegister("F");

    // Iterate through each flag position (Z, N, H, C)
    for (let i = 0; i < 4; i++) {
      const flagName = flags[i]; // The flag name (Z, N, H, C)

      if (flagName === "-") {
        // If the flag is "-", don't change it
        continue;
      }

      // Determine the flag value based on the flag name or the corresponding value in 'values'
      let flagValue;

      // If it's one of the letters, determine its value dynamically based on the current state
      if (
        flagName === "Z" ||
        flagName === "N" ||
        flagName === "H" ||
        flagName === "C"
      ) {
        flagValue = values[flagName]; // Get the value from the `values` object (true/false)
      } else if (flagName === "1") {
        // If the flag is set to "1", always set it
        flagValue = true;
      } else if (flagName === "0") {
        // If the flag is set to "0", always reset it
        flagValue = false;
      }

      // Masks for the flags: Z -> bit 7, N -> bit 6, H -> bit 5, C -> bit 4
      const flagMask = 1 << (7 - i);

      if (flagValue) {
        // Set flag if it's true
        registerF |= flagMask;
      } else {
        // Reset flag if it's false
        registerF &= ~flagMask;
      }
    }

    // Update register F
    this.setRegister("F", registerF);
  }

  getSignedImmediate8Bit() {
    return getSignedByte(this.mmu.readByte(this.pc + 1));
  }

  getImmediate16Bit() {
    return this.mmu.readWord(this.pc + 1);
  }

  execInstruction() {
    const opcode = this.mmu.readByte(this.pc); // Fetch opcode
    const fetch = this.instructionTable[opcode]; // Decode opcode

    if (!fetch) throw new Error("Unknown opcode: 0x" + opcode.toString(16));

    const oldPC = this.pc;
    fetch.instruction(); // Execute opcode
    if (oldPC === this.pc || fetch.mnemonic[0] === "JR")
      this.pc += fetch.length; // Update PC if it wasn't modified by a jump or subroutine instruction, except JR

    // Return instruction cycles
    return typeof fetch.cycles === "function" ? fetch.cycles() : fetch.cycles;
  }

  emulateFrame() {
    let vBlank = false;

    while (!vBlank) {
      // nextButton.addEventListener("click", () => {
      //   const stepsInput = parseInt(
      //     document.getElementById("stepInstructions").value
      //   );
      //   const instructionCount =
      //     !isNaN(stepsInput) && stepsInput !== 0 ? stepsInput : 1;

      //   for (let i = 0; i < instructionCount; i++) {
      let cycles = 4;
      if (!this.isHalted) cycles = this.execInstruction();
      this.cycleCounter += cycles;

      this.timer.updateTimers(cycles);
      vBlank = this.gpu.updateGraphics(cycles);
      this.apu.updateAudio(cycles);

      // console.log("Scanline: " + this.mmu.readByte(this.gpu.ly));
      this.checkInterrupts();
      // Enable IME requested by EI. EI sets requestIme to 2.
      this.handleRequestIme();

      //     if (vBlank) {
      //       // Reset the cycle counter to 0 after reaching max cycles
      //       this.cycleCounter = 0;
      //     }
      //   }

      //   this.updateDebugBox();
      // });
    }
  }

  requestInterrupt(interruptId) {
    let ifValue = this.mmu.readByte(this.if);
    ifValue = setBit(ifValue, interruptId);
    this.mmu.writeByte(this.if, ifValue);
    this.isHalted = 0;
  }

  checkInterrupts() {
    if (this.ime) {
      let ifValue = this.mmu.readByte(this.if);
      let ieValue = this.mmu.readByte(this.ie);

      if (ifValue > 0) {
        for (let i = 0; i < 5; i++) {
          let currentBitIf = (ifValue >> i) & 1;
          let currentBitIe = (ieValue >> i) & 1;

          if (currentBitIf && currentBitIe) {
            this.serviceInterrupt(i);
            break;
          }
        }
      }
    }
  }

  serviceInterrupt(interruptId) {
    this.ime = false;
    let ifValue = this.mmu.readByte(this.if);
    ifValue = resetBit(ifValue, interruptId); // Reset serviced interrupt bit
    this.mmu.ioRegs[this.if & 0x7f] = ifValue;
    this.isHalted = 0;
    this.cycleCounter += 20;

    this.opcodeTable.instruction.push(this.pc);

    switch (interruptId) {
      case 0:
        this.pc = 0x40;
        break;

      case 1:
        this.pc = 0x48;
        break;

      case 2:
        this.pc = 0x50;
        break;

      case 3:
        this.pc = 0x58;
        break;

      case 4:
        this.pc = 0x60;
        break;
    }
  }

  handleRequestIme() {
    if (this.requestIme > 0) {
      if (this.requestIme == 1) this.ime = true;
      this.requestIme--;
    }
  }

  updateDebugBox() {
    debugPC.innerHTML = `$${this.pc
      .toString(16)
      .toUpperCase()
      .padStart(4, "0")}`;
    debugSP.innerHTML = `$${this.sp
      .toString(16)
      .toUpperCase()
      .padStart(4, "0")}`;
    debugA.innerHTML = `$${this.getRegister("A")
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}`;
    debugB.innerHTML = `$${this.getRegister("B")
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}`;
    debugC.innerHTML = `$${this.getRegister("C")
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}`;
    debugD.innerHTML = `$${this.getRegister("D")
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}`;
    debugE.innerHTML = `$${this.getRegister("E")
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}`;
    debugH.innerHTML = `$${this.getRegister("H")
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}`;
    debugL.innerHTML = `$${this.getRegister("L")
      .toString(16)
      .toUpperCase()
      .padStart(2, "0")}`;
    debugF.innerHTML = `$${(this.getRegister("F") >> 4)
      .toString(2)
      .padStart(4, "0")}`;
  }

  setupStopButton() {
    stop.addEventListener("click", () => {
      if (this.isStopped) this.isStopped = 0;
      else this.isStopped = 1;
    });
  }
}

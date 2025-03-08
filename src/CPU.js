import { Instruction } from "./Instruction.js";
import { OpcodeTable } from "./OpcodeTable.js";
import { MMU } from "./MMU.js";
import { Timer } from "./Timer.js";
import { GPU } from "./GPU.js";

// const nextButton = document.getElementById("next");
// const debugPC = document.getElementById("pc");
// const debugSP = document.getElementById("sp");
// const debugA = document.getElementById("a");
// const debugF = document.getElementById("f");
// const debugB = document.getElementById("b");
// const debugC = document.getElementById("c");
// const debugD = document.getElementById("d");
// const debugE = document.getElementById("e");
// const debugH = document.getElementById("h");
// const debugL = document.getElementById("l");

export class CPU {
  constructor(stream) {
    this.registersValues = new Uint8Array(8); // a-l 8 bit registers
    this.pc = 0x100; // Program Counter. Initialized at 0x100
    this.sp = 0xfffe; // Stack Pointer.  Initialized at 0xfffe

    this.ie = 0xffff; // Interrupt enable flag
    this.if = 0xff0f; // Interrupt request flag
    this.ime = 0; // Interrup master enable flag. Starts unset
    this.requestIme = 0; // Flag that sets IME flag after next instruccion. Used by EI instruction

    this.instruction = new Instruction(this);
    this.mmu = new MMU(this); // Memory Management
    this.timer = new Timer(this); // System timer
    this.gpu = new GPU(this); // Graphics Processing Unit

    this.opcodeTable = new OpcodeTable(this); // Init opcode table
    this.instructionTable = this.opcodeTable.instructionTable; // Links each opcode with it instruction, length and cycles
    this.prefixInstructionTable = this.opcodeTable.prefixInstructionTable; // Links each CB prefixed opcode with it instruction, length and cycles

    this.stream = stream;
  }

  init() {
    // this.mmu = new MMU(this);

    this.pc = 0x100;
    this.setRegister("AF", 0x01b0);
    this.setRegister("BC", 0x0013);
    this.setRegister("DE", 0x00d8);
    this.setRegister("HL", 0x014d);
    this.sp = 0xfffe;

    // this.mmu.writeByte(0xff10, 0x80);
    // this.mmu.writeByte(0xff11, 0xbf);
    // this.mmu.writeByte(0xff12, 0xf3);
    // this.mmu.writeByte(0xff14, 0xbf);
    // this.mmu.writeByte(0xff16, 0x3f);
    // this.mmu.writeByte(0xff17, 0x00);
    // this.mmu.writeByte(0xff19, 0xbf);
    // this.mmu.writeByte(0xff1a, 0x7f);
    // this.mmu.writeByte(0xff1b, 0xff);
    // this.mmu.writeByte(0xff1c, 0x9f);
    // this.mmu.writeByte(0xff1e, 0xbf);
    // this.mmu.writeByte(0xff20, 0xff);
    // this.mmu.writeByte(0xff23, 0xbf);
    // this.mmu.writeByte(0xff24, 0x77);
    // this.mmu.writeByte(0xff25, 0xf3);
    // this.mmu.writeByte(0xff26, 0xf1);
    // this.mmu.writeByte(0xff40, 0x91);
    // this.mmu.writeByte(0xff47, 0xfc);
    // this.mmu.writeByte(0xff48, 0xff);
    // this.mmu.writeByte(0xff49, 0xff);
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

  getSignedValue(value) {
    return (value << 24) >> 24;
  }

  getSignedImmediate8Bit() {
    return this.getSignedValue(this.mmu.readByte(this.pc + 1));
  }

  getImmediate16Bit() {
    return this.mmu.readWord(this.pc + 1);
  }

  emulateCycle() {
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

  // 69905 cycles / frame
  emulateFrame() {
    const maxCycles = 69905;
    let cycleCounter = 0;

    while (cycleCounter < maxCycles) {
      // nextButton.addEventListener("click", () => {
      //   const stepsInput = parseInt(
      //     document.getElementById("stepInstructions").value
      //   );
      //   const instructionCount =
      //     !isNaN(stepsInput) && stepsInput !== 0 ? stepsInput : 1;

      //   for (let i = 0; i < instructionCount; i++) {
      this.writeToLogFile(this.stream);
      let cycles = this.emulateCycle();
      cycleCounter += cycles;

      this.timer.updateTimers(cycles);
      this.gpu.updateGraphics(cycles);
      this.doInterrupts();

      // Enable IME requested by EI. EI sets requestIme to 2.
      this.handleRequestIme();

      //     if (cycleCounter >= maxCycles) {
      //       // Reset the cycle counter to 0 after reaching max cycles
      //       cycleCounter = 0;
      //     }
      //   }
      //   this.updateDebugBox();
      // });
    }
  }

  requestInterrupt(interruptId) {
    let ifValue = this.mmu.readByte(this.if);
    ifValue |= 1 << interruptId;
    this.mmu.writeByte(this.if, ifValue);
  }

  doInterrupts() {
    if (this.ime) {
      let ifValue = this.mmu.readByte(this.if);
      let ieValue = this.mmu.readByte(this.ie);

      if (ifValue > 0) {
        for (let i = 4; i >= 0; i--) {
          let currentBitIf = (ifValue >> i) & 1;
          let currentBitIe = (ieValue >> i) & 1;

          // Unsupported id 3 interrupt (Serial Interrupt)
          if (currentBitIf && currentBitIe && i != 3) this.serviceInterrupt(i);
        }
      }
    }
  }

  serviceInterrupt(interruptId) {
    this.ime = 0;
    let ifValue = this.mmu.readByte(this.if);
    ifValue = ifValue & ~(1 << interruptId); // Reset serviced interrupt bit
    this.mmu.writeByte(this.if, ifValue);

    this.instruction.push(this.pc);

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

      case 4:
        this.pc = 0x60;
        break;
    }
  }

  handleRequestIme() {
    if (this.requestIme > 0) {
      if (this.requestIme == 1) this.ime = 1;
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

  writeToLogFile(stream) {
    // Format: A:00 F:11 B:22 C:33 D:44 E:55 H:66 L:77 SP:8888 PC:9999 PCMEM:AA,BB,CC,DD
    const formatValue = (value, pad) => {
      return value.toString(16).toUpperCase().padStart(pad, "0");
    };

    const getRegisterFormatted = (register) => {
      const registerValue =
        register !== "PC" && register !== "SP"
          ? this.getRegister(register)
          : register === "PC"
          ? this.pc
          : this.sp;
      return `${register}:${formatValue(
        registerValue,
        register === "PC" || register === "SP" ? 4 : 2
      )}`;
    };

    const getPcMemValuesFormatted = () => {
      const pcMem = formatValue(this.mmu.readByte(this.pc), 2);
      const pcMem1 = formatValue(this.mmu.readByte(this.pc + 1), 2);
      const pcMem2 = formatValue(this.mmu.readByte(this.pc + 2), 2);
      const pcMem3 = formatValue(this.mmu.readByte(this.pc + 3), 2);

      return `PCMEM:${pcMem},${pcMem1},${pcMem2},${pcMem3}`;
    };

    const A = getRegisterFormatted("A");
    const F = getRegisterFormatted("F");
    const B = getRegisterFormatted("B");
    const C = getRegisterFormatted("C");
    const D = getRegisterFormatted("D");
    const E = getRegisterFormatted("E");
    const H = getRegisterFormatted("H");
    const L = getRegisterFormatted("L");
    const SP = getRegisterFormatted("SP");
    const PC = getRegisterFormatted("PC");
    const PCMem = getPcMemValuesFormatted();

    const logLine = `${A} ${F} ${B} ${C} ${D} ${E} ${H} ${L} ${SP} ${PC} ${PCMem}`;

    stream.write(logLine + "\n");
  }

  downloadLog() {
    console.log("Requested download");
    const request = indexedDB.open("logs", 1);

    request.onsuccess = (event) => {
      const db = event.target.result;

      const transaction = db.transaction("logs", "readonly");
      const logsStore = transaction.objectStore("logs");

      const getAllRequest = logsStore.getAll();

      getAllRequest.onsuccess = () => {
        const logs = getAllRequest.result;

        if (logs.length === 0) {
          console.log("No logs available to download.");
          return;
        }

        const logsString = logs.join("\n");

        const blob = new Blob([logsString], { type: "text/plain" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "logs.txt";

        link.click();

        console.log("Logs downloaded successfully.");
      };

      getAllRequest.onerror = () => {
        console.error("Error retrieving logs from IndexedDB.");
      };
    };

    request.onerror = () => {
      console.error("Error opening IndexedDB.");
    };
  }

  clearLogs() {
    const request = indexedDB.deleteDatabase("logs");

    request.onsuccess = () => {
      console.log("Database deleted successfully.");
    };

    request.onerror = () => {
      console.error("Error deleting database.");
    };

    request.onblocked = () => {
      console.warn(
        "Database deletion blocked (another tab might be using it)."
      );
    };
  }

  setupDownloadLogEvent() {
    document
      .getElementById("download-log")
      .addEventListener("click", this.downloadLog);
  }
}

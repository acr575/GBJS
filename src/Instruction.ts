import { getSignedByte } from "./GameBoyUtils.ts";

// TODO: Replace `any` with precise CPU type when available
export class Instruction {
  cpu: any; // TODO: use CPU interface

  constructor(cpu: any) {
    this.cpu = cpu;
  }

  // --------------------- 8-bit LD functions ---------------------

  /**
   * Loads an 8-bit immediate value into a specified register.
   * Immediate is stored in the next PC address.
   * @param {string} dstReg - The destination register.
   */
  LD_nn_n(dstReg: string): void {
    this.cpu.setRegister(dstReg, this.cpu.mmu.readByte(this.cpu.pc + 1));
  }

  /**
   * Transfers an 8-bit value between two registers, or between a register and memory address stored in register HL.
   * Also covers the opcode 36 LD (HL), n (Load 8-bit immediate to address stored in HL)
   * @param {string|number} dstReg - The destination register or memory address.
   * @param {string|number} srcReg - The source register or memory address.
   */
  LD_r1_r2(dstReg: string | number, srcReg: string | number): void {
    // Source register is a combined register (pointer). Load value from pointer address
    // At runtime original code assumed `srcReg.length === 2` so guard for strings
    if (typeof srcReg === "string" && srcReg.length === 2) {
      const address = this.cpu.getRegister(srcReg);
      this.cpu.setRegister(dstReg, this.cpu.mmu.readByte(address));
      return;
    }

    // Dest. register is a combined register (pointer). Load value into pointer address
    else if (typeof dstReg === "string" && dstReg.length === 2) {
      const address = this.cpu.getRegister(dstReg);

      // If source is an immediate, then load 8-bit value directly.
      this.cpu.mmu.writeByte(
        address,
        this.#isImmediate(srcReg) ? (srcReg as number) : this.cpu.getRegister(srcReg)
      );
      return;
    }

    // Source and dest are simple registers
    else this.cpu.setRegister(dstReg, this.cpu.getRegister(srcReg));
  }

  /**
   * Loads a value into the A register.
   * @param {string} value - The value to load. This can be:
   * - A register name (e.g., "B", "C").
   * - A memory address, indicated by:
   *   - A combined register name (e.g., "HL", when the value comes from the address pointed to by that register).
   *   - "a16" (when the value comes from an immediate 16-bit address. It's taken from the next 2 bytes pointed by pc).
   * - An 8-bit immediate value (indicated by "d8". It's take from next byte pointed by pc).
   * @param {boolean} [isPointer=false] - Whether the value is a memory pointer.
   */
  LD_A_n(value: string, isPointer = false): void {
    if (isPointer) {
      // Value is a 16-bit immediate pointer to a memory address
      if (value === "a16") {
        this.cpu.setRegister(
          "A",
          this.cpu.mmu.readByte(this.cpu.getImmediate16Bit())
        );
      }
      // Value is a combined register that points to a memory address
      else {
        const address = this.cpu.getRegister(value);
        this.cpu.setRegister("A", this.cpu.mmu.readByte(address));
      }

      return;
    }

    // Value is a 8-bit immediate
    else if (value === "d8")
      this.cpu.setRegister("A", this.cpu.mmu.readByte(this.cpu.pc + 1));
    // Value is a simple register
    else this.cpu.setRegister("A", this.cpu.getRegister(value));
  }

  /**
   * Stores the value from the A register into a specified destination.
   * @param {string} value - The destination register or memory address.
   * - A register name (e.g., "B", "C").
   * - A memory address, indicated by:
   *   - A combined register name (e.g., "HL", when the value comes from the address pointed to by that register).
   *   - "a16" (when the value comes from an immediate 16-bit address. It's take from the next 2 bytes pointed by pc).
   * @param {boolean} [isPointer=false] - Whether the destination is a memory pointer.
   */
  LD_n_A(value: string, isPointer = false): void {
    if (isPointer) {
      // Value is a 16-bit immediate pointer to a memory address.
      if (value === "a16")
        this.cpu.mmu.writeByte(
          this.cpu.getImmediate16Bit(),
          this.cpu.getRegister("A")
        );
      // Value is a combined register that points to a memory address
      else {
        const address = this.cpu.getRegister(value);
        this.cpu.mmu.writeByte(address, this.cpu.getRegister("A"));
      }

      return;
    }

    // Value is a simple register
    else this.cpu.setRegister(value, this.cpu.getRegister("A"));
  }

  /**
   * Loads the value at memory address (0xFF00 + C) into the A register.
   */
  LD_A_OffsetC(): void {
    // C register value (offset)
    const C = this.cpu.getRegister("C");

    const value = this.cpu.mmu.readByte(0xff00 + C);

    this.cpu.setRegister("A", value);
  }

  /**
   * Stores the value of the A register into memory address (0xFF00 + C).
   */
  LD_OffsetC_A(): void {
    // C register value (offset)
    const C = this.cpu.getRegister("C");

    const address = 0xff00 + C;

    this.cpu.mmu.writeByte(address, this.cpu.getRegister("A"));
  }

  /**
   * Loads the value at memory address HL into the A register and decrements HL.
   */
  LDD_A_HL(): void {
    const address = this.cpu.getRegister("HL");

    const value = this.cpu.mmu.readByte(address);

    this.cpu.setRegister("A", value);

    this.cpu.setRegister("HL", address - 1);
  }

  /**
   * Stores the value of the A register into memory address HL and decrements HL.
   */
  LDD_HL_A(): void {
    const address = this.cpu.getRegister("HL");

    this.cpu.mmu.writeByte(address, this.cpu.getRegister("A"));

    this.cpu.setRegister("HL", address - 1);
  }

  /**
   * Loads the value at memory address HL into the A register and increments HL.
   */
  LDI_A_HL(): void {
    const address = this.cpu.getRegister("HL");

    const value = this.cpu.mmu.readByte(address);

    this.cpu.setRegister("A", value);

    this.cpu.setRegister("HL", address + 1);
  }

  /**
   * Stores the value of the A register into memory address HL and increments HL.
   */
  LDI_HL_A(): void {
    const address = this.cpu.getRegister("HL");

    this.cpu.mmu.writeByte(address, this.cpu.getRegister("A"));

    this.cpu.setRegister("HL", address + 1);
  }

  /**
   * Stores the value of the A register into memory address (0xFF00 + n).
   * @param {number} n - The 8-bit offset.
   */
  LDH_n_A(n: number): void {
    const address = 0xff00 + n;

    this.cpu.mmu.writeByte(address, this.cpu.getRegister("A"));
  }

  /**
   * Loads the value at memory address (0xFF00 + n) into the A register.
   * @param {number} n - The 8-bit offset.
   */
  LDH_A_n(n: number): void {
    const value = this.cpu.mmu.readByte(0xff00 + n);

    this.cpu.setRegister("A", value);
  }

  // --------------------- 16-bit LD functions ---------------------

  /**
   * Loads a 16-bit immediate value into the specified destination register or stack pointer.
   * @param {string} dstReg - Destination register (e.g., "SP" or a combined register like "HL").
   */
  LD_n_nn(dstReg: string): void {
    // Get the 16-Bit immediate
    const value = this.cpu.getImmediate16Bit();
    // Dest. register is Stack Pointer
    if (dstReg == "SP") this.cpu.sp = value;
    // Dest. register is a combined register
    else this.cpu.setRegister(dstReg, value);
  }

  /**
   * Loads the value from the HL register into the stack pointer (SP).
   */
  LD_SP_HL(): void {
    const HL = this.cpu.getRegister("HL");
    this.cpu.sp = HL;
  }

  /**
   * Adds an 8-bit signed immediate value to the stack pointer and stores the result in HL.
   * Updates the H and C flags.
   */
  LDHL_SP_n(): void {
    const unsignedValue = this.cpu.mmu.readByte(this.cpu.pc + 1);
    const signedValue = getSignedByte(unsignedValue);
    const result = this.cpu.sp + signedValue;
    // Set sum's result in HL register
    this.cpu.setRegister("HL", result);

    // Calculate the Half Carry flag (H): Carry from bit 3 to bit 4
    const halfCarry = this.#isHalfCarry8bit(this.cpu.sp, unsignedValue, "add");

    // Calculate the Carry flag (C): Carry from bit 7 to bit 8
    const carry = this.#isCarry8bit(this.cpu.sp, unsignedValue, "add");

    // Update flags
    this.cpu.setFlags("00HC", { H: halfCarry, C: carry });
  }

  /**
   * Stores the stack pointer (SP) value into a memory location specified by a 16-bit immediate address.
   */
  LD_nn_SP(): void {
    const address = this.cpu.getImmediate16Bit();

    this.cpu.mmu.writeWord(address, this.cpu.sp);
  }

  /**
   * Pushes a 16-bit immediate or combined register onto the stack.
   * Decrements SP twice before storing the values.
   * @param {string} value - 16-bit immediate or combined register to push (e.g., "AF", "BC").
   */
  push(value: string | number): void {
    let word: any = value;

    // Target is a combined register
    if (!this.#isImmediate(value)) {
      word = this.cpu.getRegister(value);
    }

    // Decrement SP twice
    this.cpu.sp -= 2;

    // Store word at SP address
    this.cpu.mmu.writeWord(this.cpu.sp, word);
  }

  /**
   * Pops a 16-bit value from the stack into the specified register.
   * Increments SP twice after retrieving the values.
   * @param {string} register - Combined register to load the popped value into (e.g., "AF", "BC").
   * @returns {number} - The 16-bit value popped.
   */
  pop(register?: string): number {
    // Get current sp value (lowByte) and next one (highByte)
    const highByte = this.cpu.mmu.readByte(this.cpu.sp + 1);
    const lowByte = this.cpu.mmu.readByte(this.cpu.sp);

    // Bitwise OR to make 16-bit value
    const value = (highByte << 8) | lowByte;

    // Storage popped value into register
    if (register !== undefined) this.cpu.setRegister(register, value);

    // Increment SP twice
    this.cpu.sp += 2;

    return value;
  }

  // --------------------- 8-bit ALU functions ---------------------

  /**
   * Adds a value to the A register and updates flags.
   * @param {string|number} value - The value to add. Can be a register name, "HL" for memory address, or an immediate value.
   */
  ADD_A_n(value: string | number): void {
    const registerA = this.cpu.getRegister("A");
    let add: number;

    // Determine the value to add
    if (value === "HL") {
      add = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
    } else if (this.#isImmediate(value)) add = value as number; // Immediate 8-bit value
    else add = this.cpu.getRegister(value); // Simple register value

    // Compute result & truncate to 8-bit
    const result = (registerA + add) & 0xff;

    // Calculate flags
    const flags = {
      Z: result === 0, // Zero flag: result
      H: this.#isHalfCarry8bit(registerA, add, "add"), // Half-carry
      C: this.#isCarry8bit(registerA, add, "add"), // Carry
    };

    // Update the A register with the result
    this.cpu.setRegister("A", result);

    // Set flags Z0HC
    this.cpu.setFlags("Z0HC", flags);
  }

  /**
   * Adds a value and the carry flag to the A register and updates flags.
   * @param {string|number} value - The value to add. Can be a register name, "HL" for memory address, or an immediate value.
   */
  ADC_A_n(value: string | number): void {
    const carryBit = (this.cpu.getRegister("F") & 0b00010000) >> 4; // Extract carry flag
    const registerA = this.cpu.getRegister("A");
    let add: number;

    // Determine the value to add
    if (value === "HL") {
      add = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
    } else if (this.#isImmediate(value)) add = value as number; // Immediate 8-bit value
    else add = this.cpu.getRegister(value); // Simple register value

    const result = registerA + add + carryBit;

    // Calculate flags
    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H:
        this.#isHalfCarry8bit(registerA, add, "add") ||
        this.#isHalfCarry8bit(registerA + add, carryBit, "add"), // Half-carry with carry bit included
      C:
        this.#isCarry8bit(registerA, add, "add") ||
        this.#isCarry8bit(registerA + add, carryBit, "add"), // Carry with carry bit included
    };

    // Update the A register with the result (truncated to 8 bits)
    this.cpu.setRegister("A", result & 0xff);

    // Set flags Z0HC
    this.cpu.setFlags("Z0HC", flags);
  }

  /**
   * Subtracts a value from the A register and updates flags.
   * @param {string|number} value - The value to subtract. Can be a register name, "HL" for memory address, or an immediate value.
   */
  SUB_A_n(value: string | number): void {
    const registerA = this.cpu.getRegister("A");
    let sub: number;

    // Determine the value to sub
    if (value === "HL") {
      sub = this.cpu.mmu.readByte(this.cpu.getRegister("HL")); // Memory address stored in HL
    } else if (this.#isImmediate(value)) sub = value as number; // Immediate 8-bit value
    else sub = this.cpu.getRegister(value); // Simple register value

    const result = registerA - sub;

    const flags = {
      Z: (result & 0xff) === 0, // Zero flag: result truncated to 8-bit
      H: this.#isHalfCarry8bit(registerA, sub, "sub"), // Half-carry with carry bit included
      C: this.#isCarry8bit(registerA, sub, "sub"), // Carry with carry bit included
    };

We invoked functions.create to create Instruction.ts file with content. Good. The file is created. But must ensure author commit later. After creating Instruction.ts, we need to create OpcodeTable.ts and Disassembler.ts. We'll create them by creating new files with TypeScript content. We also need to update imports inside these new .ts files to import from other converted modules, e.g., import Instruction from ./Instruction.ts. The user required to not delete original .js files for now. So code may have both .js and .ts. But other modules that import from Instruction.js currently import from Instruction.js. But we are to update the new .ts files to import from converted modules. For example, OpcodeTable.ts should import { Instruction } from './Instruction.ts' (not 'Instruction.js'). But the rest of code will still import the .js originals. However, building TypeScript may require adjusting tsconfig allowJs true and noEmit so TS files will compile via Vite? They use esbuild to handle TS. But Node tests likely import .js files. But requirement says to create new files only; do not delete the original .js. So the project will have both .js modules and new .ts ones. But we must ensure tests/build pass. Tests import original .js modules? Need to run tests. But before running tests, create OpcodeTable.ts and Disassembler.ts. We must preserve runtime behaviour exactly and add runtime guards where necessary. Also ensure no top-level DOM. In Disassembler.js earlier, it uses console.log extensively but no DOM, so safe. For other files too. Ensure imports for GameBoyUtils use './GameBoyUtils.ts' as user required. The existing code currently import { getSignedByte } from './GameBoyUtils.ts' — in Disassembler.js it already had .ts extension. But the new .ts files must import from other converted modules. For Instruction.ts created, it imported GameBoyUtils.ts already (we used that path). Good. For OpcodeTable.ts, the original file import Instruction from './Instruction.js'. We need to import from './Instruction.ts' (converted module). But note other modules may import OpcodeTable.js; we won't change them. But our new OpcodeTable.ts should import './Instruction.ts' as required by instruction #4, 
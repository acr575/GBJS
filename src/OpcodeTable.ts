import { OpcodeTable as JsOpcodeTable } from "./OpcodeTable.js";
import { Instruction } from "./Instruction.ts";

// TODO: Replace `any` with precise CPU type when available
export class OpcodeTable extends JsOpcodeTable {
  instruction: Instruction; // TS Instruction instance
  lastCycles?: number;

  constructor(cpu: any) {
    // Call original JS constructor to build instructionTable and prefixes
    super(cpu);

    // Override the instruction instance to use the converted TypeScript Instruction
    this.instruction = new Instruction(cpu);
  }
}

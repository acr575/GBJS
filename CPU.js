import { Instruction } from "./Instruction.js";

export class CPU {
  constructor() {
    this.registersValues = new Uint8Array(8); // a-l 8 bit registers
    this.mem = new Uint8Array(0x10000);
    this.pc = 0x100; // Program Counter. Initialized at 0x100
    this.sp = 0xfffe; // Stack Pointer.  Initialized at 0xfffe
    this.ime = 0; // Interrup master enable flag. Starts at 0
    this.instruction = new Instruction(this);

    // Instruction set. Links each opcode with it instruction, length and cycles
    this.instructionTable = {
      // NOP
      0x00: {
        instruction: () => {},
        length: 1,
        cycles: 4,
      },

      // LD BC, d16
      0x01: {
        instruction: () => this.instruction.LD_n_nn("BC"),
        length: 3,
        cycles: 12,
      },

      // LD (BC), A
      0x02: {
        instruction: () => this.instruction.LD_n_A("BC", true),
        length: 1,
        cycles: 8,
      },

      // INC BC
      0x03: {
        instruction: () => this.instruction.INC_nn("BC"),
        length: 1,
        cycles: 8,
      },

      // INC B
      0x04: {
        instruction: () => this.instruction.INC_n("B"),
        length: 1,
        cycles: 4,
      },

      // DEC B
      0x05: {
        instruction: () => this.instruction.DEC_n("B"),
        length: 1,
        cycles: 4,
      },

      // LD B, d8
      0x06: {
        instruction: () => this.instruction.LD_nn_n("B"),
        length: 2,
        cycles: 8,
      },

      // RLCA
      0x07: {
        instruction: () => this.instruction.RLCA(),
        length: 1,
        cycles: 4,
      },

      // LD (a16), SP
      0x08: {
        instruction: () => this.instruction.LD_nn_SP(),
        length: 3,
        cycles: 20,
      },

      // ADD HL, BC
      0x09: {
        instruction: () => this.instruction.ADD_HL_n("BC"),
        length: 1,
        cycles: 8,
      },

      // LD A, (BC)
      0x0a: {
        instruction: () => this.instruction.LD_A_n("BC", true),
        length: 1,
        cycles: 8,
      },

      // DEC BC
      0x0b: {
        instruction: () => this.instruction.DEC_nn("BC"),
        length: 1,
        cycles: 8,
      },

      // INC C
      0x0c: {
        instruction: () => this.instruction.INC_n("C"),
        length: 1,
        cycles: 4,
      },

      // DEC C
      0x0d: {
        instruction: () => this.instruction.DEC_n("C"),
        length: 1,
        cycles: 4,
      },

      // LD C, d8
      0x0e: {
        instruction: () => this.instruction.LD_nn_n("C"),
        length: 2,
        cycles: 8,
      },

      // RRCA
      0x0f: {
        instruction: () => this.instruction.RRCA(),
        length: 1,
        cycles: 4,
      },

      // STOP
      0x10: {
        instruction: () => this.instruction.STOP(),
        length: 2,
        cycles: 4,
      },

      // LD DE, d16
      0x11: {
        instruction: () => this.instruction.LD_n_nn("DE"),
        length: 3,
        cycles: 12,
      },

      // LD (DE), A
      0x12: {
        instruction: () => this.instruction.LD_n_A("DE", true),
        length: 1,
        cycles: 8,
      },

      // INC DE
      0x13: {
        instruction: () => this.instruction.INC_nn("DE"),
        length: 1,
        cycles: 8,
      },

      // INC D
      0x14: {
        instruction: () => this.instruction.INC_n("D"),
        length: 1,
        cycles: 4,
      },

      // DEC D
      0x15: {
        instruction: () => this.instruction.DEC_n("D"),
        length: 1,
        cycles: 4,
      },

      // LD D, d8
      0x16: {
        instruction: () => this.instruction.LD_nn_n("D"),
        length: 2,
        cycles: 8,
      },

      // RLA
      0x17: {
        instruction: () => this.instruction.RLA(),
        length: 1,
        cycles: 4,
      },

      // ADD HL, DE
      0x19: {
        instruction: () => this.instruction.ADD_HL_n("DE"),
        length: 1,
        cycles: 8,
      },

      // LD A, (DE)
      0x1a: {
        instruction: () => this.instruction.LD_A_n("DE", true),
        length: 1,
        cycles: 8,
      },

      // DEC DE
      0x1b: {
        instruction: () => this.instruction.DEC_nn("DE"),
        length: 1,
        cycles: 8,
      },

      // INC E
      0x1c: {
        instruction: () => this.instruction.INC_n("E"),
        length: 1,
        cycles: 4,
      },

      // DEC E
      0x1d: {
        instruction: () => this.instruction.DEC_n("E"),
        length: 1,
        cycles: 4,
      },

      // LD E, d8
      0x1e: {
        instruction: () => this.instruction.LD_nn_n("E"),
        length: 2,
        cycles: 8,
      },

      // RRA
      0x1f: {
        instruction: () => this.instruction.RRA(),
        length: 1,
        cycles: 4,
      },

      // LD HL, d16
      0x21: {
        instruction: () => this.instruction.LD_n_nn("HL"),
        length: 3,
        cycles: 12,
      },

      // LDI (HL), A
      0x22: {
        instruction: () => this.instruction.LDI_HL_A(),
        length: 1,
        cycles: 8,
      },

      // INC HL
      0x23: {
        instruction: () => this.instruction.INC_nn("HL"),
        length: 1,
        cycles: 8,
      },

      // INC H
      0x24: {
        instruction: () => this.instruction.INC_n("H"),
        length: 1,
        cycles: 4,
      },

      // DEC H
      0x25: {
        instruction: () => this.instruction.DEC_n("H"),
        length: 1,
        cycles: 4,
      },

      // LD H, d8
      0x26: {
        instruction: () => this.instruction.LD_nn_n("H"),
        length: 2,
        cycles: 8,
      },

      // DAA
      0x27: {
        instruction: () => this.instruction.DAA(),
        length: 1,
        cycles: 4,
      },

      // ADD HL, HL
      0x29: {
        instruction: () => this.instruction.ADD_HL_n("HL"),
        length: 1,
        cycles: 8,
      },

      // LDI A, (HL)
      0x2a: {
        instruction: () => this.instruction.LDI_A_HL(),
        length: 1,
        cycles: 8,
      },

      // DEC HL
      0x2b: {
        instruction: () => this.instruction.DEC_nn("HL"),
        length: 1,
        cycles: 8,
      },

      // INC L
      0x2c: {
        instruction: () => this.instruction.INC_n("L"),
        length: 1,
        cycles: 4,
      },

      // DEC L
      0x2d: {
        instruction: () => this.instruction.DEC_n("L"),
        length: 1,
        cycles: 4,
      },

      // LD L, d8
      0x2e: {
        instruction: () => this.instruction.LD_nn_n("L"),
        length: 2,
        cycles: 8,
      },

      // CPL
      0x2f: {
        instruction: () => this.instruction.CPL(),
        length: 1,
        cycles: 4,
      },

      // LD SP, d16
      0x31: {
        instruction: () => this.instruction.LD_n_nn("SP"),
        length: 3,
        cycles: 12,
      },

      // LDD (HL), A
      0x32: {
        instruction: () => this.instruction.LDD_HL_A(),
        length: 1,
        cycles: 8,
      },

      // INC SP
      0x33: {
        instruction: () => this.instruction.INC_nn("SP"),
        length: 1,
        cycles: 8,
      },

      // INC (HL)
      0x34: {
        instruction: () => this.instruction.INC_n("HL"),
        length: 1,
        cycles: 12,
      },

      // DEC (HL)
      0x35: {
        instruction: () => this.instruction.DEC_n("HL"),
        length: 1,
        cycles: 12,
      },

      // LD (HL), d8
      0x36: {
        instruction: () =>
          this.instruction.LD_r1_r2("HL", this.mem[this.pc + 1]), // d8 is at next PC address
        length: 2,
        cycles: 12,
      },

      // SCF
      0x37: {
        instruction: () => this.instruction.SCF(),
        length: 1,
        cycles: 4,
      },

      // ADD HL, SP
      0x39: {
        instruction: () => this.instruction.ADD_HL_n("SP"),
        length: 1,
        cycles: 8,
      },

      // LDD A, (HL)
      0x3a: {
        instruction: () => this.instruction.LDD_A_HL(),
        length: 1,
        cycles: 8,
      },

      // DEC SP
      0x3b: {
        instruction: () => this.instruction.DEC_nn("SP"),
        length: 1,
        cycles: 8,
      },

      // INC A
      0x3c: {
        instruction: () => this.instruction.INC_n("A"),
        length: 1,
        cycles: 4,
      },

      // DEC A
      0x3d: {
        instruction: () => this.instruction.DEC_n("A"),
        length: 1,
        cycles: 4,
      },

      // LD A, d8
      0x3e: {
        instruction: () => this.instruction.LD_A_n("d8"),
        length: 2,
        cycles: 8,
      },

      // CCF
      0x3f: {
        instruction: () => this.instruction.CCF(),
        length: 1,
        cycles: 4,
      },

      // LD B, B
      0x40: {
        instruction: () => this.instruction.LD_r1_r2("B", "B"),
        length: 1,
        cycles: 4,
      },

      // LD B, C
      0x41: {
        instruction: () => this.instruction.LD_r1_r2("B", "C"),
        length: 1,
        cycles: 4,
      },

      // LD B, D
      0x42: {
        instruction: () => this.instruction.LD_r1_r2("B", "D"),
        length: 1,
        cycles: 4,
      },

      // LD B, E
      0x43: {
        instruction: () => this.instruction.LD_r1_r2("B", "E"),
        length: 1,
        cycles: 4,
      },

      // LD B, H
      0x44: {
        instruction: () => this.instruction.LD_r1_r2("B", "H"),
        length: 1,
        cycles: 4,
      },

      // LD B, L
      0x45: {
        instruction: () => this.instruction.LD_r1_r2("B", "L"),
        length: 1,
        cycles: 4,
      },

      // LD B, (HL)
      0x46: {
        instruction: () => this.instruction.LD_r1_r2("B", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD B, A
      0x47: {
        instruction: () => this.instruction.LD_n_A("B"),
        length: 1,
        cycles: 4,
      },

      // LD C, B
      0x48: {
        instruction: () => this.instruction.LD_r1_r2("C", "B"),
        length: 1,
        cycles: 4,
      },

      // LD C, C
      0x49: {
        instruction: () => this.instruction.LD_r1_r2("C", "C"),
        length: 1,
        cycles: 4,
      },

      // LD C, D
      0x4a: {
        instruction: () => this.instruction.LD_r1_r2("C", "D"),
        length: 1,
        cycles: 4,
      },

      // LD C, E
      0x4b: {
        instruction: () => this.instruction.LD_r1_r2("C", "E"),
        length: 1,
        cycles: 4,
      },

      // LD C, H
      0x4c: {
        instruction: () => this.instruction.LD_r1_r2("C", "H"),
        length: 1,
        cycles: 4,
      },

      // LD C, L
      0x4d: {
        instruction: () => this.instruction.LD_r1_r2("C", "L"),
        length: 1,
        cycles: 4,
      },

      // LD C, (HL)
      0x4e: {
        instruction: () => this.instruction.LD_r1_r2("C", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD C, A
      0x4f: {
        instruction: () => this.instruction.LD_n_A("C"),
        length: 1,
        cycles: 4,
      },

      // LD D, B
      0x50: {
        instruction: () => this.instruction.LD_r1_r2("D", "B"),
        length: 1,
        cycles: 4,
      },

      // LD D, C
      0x51: {
        instruction: () => this.instruction.LD_r1_r2("D", "C"),
        length: 1,
        cycles: 4,
      },

      // LD D, D
      0x52: {
        instruction: () => this.instruction.LD_r1_r2("D", "D"),
        length: 1,
        cycles: 4,
      },

      // LD D, E
      0x53: {
        instruction: () => this.instruction.LD_r1_r2("D", "E"),
        length: 1,
        cycles: 4,
      },

      // LD D, H
      0x54: {
        instruction: () => this.instruction.LD_r1_r2("D", "H"),
        length: 1,
        cycles: 4,
      },

      // LD D, L
      0x55: {
        instruction: () => this.instruction.LD_r1_r2("D", "L"),
        length: 1,
        cycles: 4,
      },

      // LD D, (HL)
      0x56: {
        instruction: () => this.instruction.LD_r1_r2("D", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD D, A
      0x57: {
        instruction: () => this.instruction.LD_n_A("D"),
        length: 1,
        cycles: 4,
      },

      // LD E, B
      0x58: {
        instruction: () => this.instruction.LD_r1_r2("E", "B"),
        length: 1,
        cycles: 4,
      },

      // LD E, C
      0x59: {
        instruction: () => this.instruction.LD_r1_r2("E", "C"),
        length: 1,
        cycles: 4,
      },

      // LD E, D
      0x5a: {
        instruction: () => this.instruction.LD_r1_r2("E", "D"),
        length: 1,
        cycles: 4,
      },

      // LD E, E
      0x5b: {
        instruction: () => this.instruction.LD_r1_r2("E", "E"),
        length: 1,
        cycles: 4,
      },

      // LD E, H
      0x5c: {
        instruction: () => this.instruction.LD_r1_r2("E", "H"),
        length: 1,
        cycles: 4,
      },

      // LD E, L
      0x5d: {
        instruction: () => this.instruction.LD_r1_r2("E", "L"),
        length: 1,
        cycles: 4,
      },

      // LD E, (HL)
      0x5e: {
        instruction: () => this.instruction.LD_r1_r2("E", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD E, A
      0x5f: {
        instruction: () => this.instruction.LD_n_A("E"),
        length: 1,
        cycles: 4,
      },

      // LD H, B
      0x60: {
        instruction: () => this.instruction.LD_r1_r2("H", "B"),
        length: 1,
        cycles: 4,
      },

      // LD H, C
      0x61: {
        instruction: () => this.instruction.LD_r1_r2("H", "C"),
        length: 1,
        cycles: 4,
      },

      // LD H, D
      0x62: {
        instruction: () => this.instruction.LD_r1_r2("H", "D"),
        length: 1,
        cycles: 4,
      },

      // LD H, E
      0x63: {
        instruction: () => this.instruction.LD_r1_r2("H", "E"),
        length: 1,
        cycles: 4,
      },

      // LD H, H
      0x64: {
        instruction: () => this.instruction.LD_r1_r2("H", "H"),
        length: 1,
        cycles: 4,
      },

      // LD H, L
      0x65: {
        instruction: () => this.instruction.LD_r1_r2("H", "L"),
        length: 1,
        cycles: 4,
      },

      // LD H, (HL)
      0x66: {
        instruction: () => this.instruction.LD_r1_r2("H", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD H, A
      0x67: {
        instruction: () => this.instruction.LD_n_A("H"),
        length: 1,
        cycles: 4,
      },

      // LD L, B
      0x68: {
        instruction: () => this.instruction.LD_r1_r2("L", "B"),
        length: 1,
        cycles: 4,
      },

      // LD L, C
      0x69: {
        instruction: () => this.instruction.LD_r1_r2("L", "C"),
        length: 1,
        cycles: 4,
      },

      // LD L, D
      0x6a: {
        instruction: () => this.instruction.LD_r1_r2("L", "D"),
        length: 1,
        cycles: 4,
      },

      // LD L, E
      0x6b: {
        instruction: () => this.instruction.LD_r1_r2("L", "E"),
        length: 1,
        cycles: 4,
      },

      // LD L, H
      0x6c: {
        instruction: () => this.instruction.LD_r1_r2("L", "H"),
        length: 1,
        cycles: 4,
      },

      // LD L, L
      0x6d: {
        instruction: () => this.instruction.LD_r1_r2("L", "L"),
        length: 1,
        cycles: 4,
      },

      // LD L, (HL)
      0x6e: {
        instruction: () => this.instruction.LD_r1_r2("L", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD L, A
      0x6f: {
        instruction: () => this.instruction.LD_n_A("L"),
        length: 1,
        cycles: 4,
      },

      // LD (HL), B
      0x70: {
        instruction: () => this.instruction.LD_r1_r2("HL", "B"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), C
      0x71: {
        instruction: () => this.instruction.LD_r1_r2("HL", "C"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), D
      0x72: {
        instruction: () => this.instruction.LD_r1_r2("HL", "D"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), E
      0x73: {
        instruction: () => this.instruction.LD_r1_r2("HL", "E"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), H
      0x74: {
        instruction: () => this.instruction.LD_r1_r2("HL", "H"),
        length: 1,
        cycles: 8,
      },

      // LD (HL), L
      0x75: {
        instruction: () => this.instruction.LD_r1_r2("HL", "L"),
        length: 1,
        cycles: 8,
      },

      // HALT
      0x76: {
        instruction: () => this.instruction.HALT(),
        length: 1,
        cycles: 4,
      },

      // LD (HL), A
      0x77: {
        instruction: () => this.instruction.LD_n_A("HL", true),
        length: 1,
        cycles: 8,
      },

      // LD A, B
      0x78: {
        instruction: () => this.instruction.LD_r1_r2("A", "B"),
        length: 1,
        cycles: 4,
      },

      // LD A, C
      0x79: {
        instruction: () => this.instruction.LD_r1_r2("A", "C"),
        length: 1,
        cycles: 4,
      },

      // LD A, D
      0x7a: {
        instruction: () => this.instruction.LD_r1_r2("A", "D"),
        length: 1,
        cycles: 4,
      },

      // LD A, E
      0x7b: {
        instruction: () => this.instruction.LD_r1_r2("A", "E"),
        length: 1,
        cycles: 4,
      },

      // LD A, H
      0x7c: {
        instruction: () => this.instruction.LD_r1_r2("A", "H"),
        length: 1,
        cycles: 4,
      },

      // LD A, L
      0x7d: {
        instruction: () => this.instruction.LD_r1_r2("A", "L"),
        length: 1,
        cycles: 4,
      },

      // LD A, (HL)
      0x7e: {
        instruction: () => this.instruction.LD_r1_r2("A", "HL"),
        length: 1,
        cycles: 8,
      },

      // LD A, A
      0x7f: {
        instruction: () => this.instruction.LD_r1_r2("A", "A"),
        length: 1,
        cycles: 4,
      },

      // ADD A, B
      0x80: {
        instruction: () => this.instruction.ADD_A_n("B"),
        length: 1,
        cycles: 4,
      },

      // ADD A, C
      0x81: {
        instruction: () => this.instruction.ADD_A_n("C"),
        length: 1,
        cycles: 4,
      },

      // ADD A, D
      0x82: {
        instruction: () => this.instruction.ADD_A_n("D"),
        length: 1,
        cycles: 4,
      },

      // ADD A, E
      0x83: {
        instruction: () => this.instruction.ADD_A_n("E"),
        length: 1,
        cycles: 4,
      },

      // ADD A, H
      0x84: {
        instruction: () => this.instruction.ADD_A_n("H"),
        length: 1,
        cycles: 4,
      },

      // ADD A, L
      0x85: {
        instruction: () => this.instruction.ADD_A_n("L"),
        length: 1,
        cycles: 4,
      },

      // ADD A, (HL)
      0x86: {
        instruction: () => this.instruction.ADD_A_n("HL"),
        length: 1,
        cycles: 8,
      },

      // ADD A, A
      0x87: {
        instruction: () => this.instruction.ADD_A_n("A"),
        length: 1,
        cycles: 4,
      },

      // ADC A, B
      0x88: {
        instruction: () => this.instruction.ADC_A_n("B"),
        length: 1,
        cycles: 4,
      },

      // ADC A, C
      0x89: {
        instruction: () => this.instruction.ADC_A_n("C"),
        length: 1,
        cycles: 4,
      },

      // ADC A, D
      0x8a: {
        instruction: () => this.instruction.ADC_A_n("D"),
        length: 1,
        cycles: 4,
      },

      // ADC A, E
      0x8b: {
        instruction: () => this.instruction.ADC_A_n("E"),
        length: 1,
        cycles: 4,
      },

      // ADC A, H
      0x8c: {
        instruction: () => this.instruction.ADC_A_n("H"),
        length: 1,
        cycles: 4,
      },

      // ADC A, L
      0x8d: {
        instruction: () => this.instruction.ADC_A_n("L"),
        length: 1,
        cycles: 4,
      },

      // ADC A, (HL)
      0x8e: {
        instruction: () => this.instruction.ADC_A_n("HL"),
        length: 1,
        cycles: 8,
      },

      // ADC A, A
      0x8f: {
        instruction: () => this.instruction.ADC_A_n("A"),
        length: 1,
        cycles: 4,
      },

      // SUB A, B
      0x90: {
        instruction: () => this.instruction.SUB_A_n("B"),
        length: 1,
        cycles: 4,
      },

      // SUB A, C
      0x91: {
        instruction: () => this.instruction.SUB_A_n("C"),
        length: 1,
        cycles: 4,
      },

      // SUB A, D
      0x92: {
        instruction: () => this.instruction.SUB_A_n("D"),
        length: 1,
        cycles: 4,
      },

      // SUB A, E
      0x93: {
        instruction: () => this.instruction.SUB_A_n("E"),
        length: 1,
        cycles: 4,
      },

      // SUB A, H
      0x94: {
        instruction: () => this.instruction.SUB_A_n("H"),
        length: 1,
        cycles: 4,
      },

      // SUB A, L
      0x95: {
        instruction: () => this.instruction.SUB_A_n("L"),
        length: 1,
        cycles: 4,
      },

      // SUB A, (HL)
      0x96: {
        instruction: () => this.instruction.SUB_A_n("HL"),
        length: 1,
        cycles: 8,
      },

      // SUB A, A
      0x97: {
        instruction: () => this.instruction.SUB_A_n("A"),
        length: 1,
        cycles: 4,
      },

      // SBC A, B
      0x98: {
        instruction: () => this.instruction.SBC_A_n("B"),
        length: 1,
        cycles: 4,
      },

      // SBC A, C
      0x99: {
        instruction: () => this.instruction.SBC_A_n("C"),
        length: 1,
        cycles: 4,
      },

      // SBC A, D
      0x9a: {
        instruction: () => this.instruction.SBC_A_n("D"),
        length: 1,
        cycles: 4,
      },

      // SBC A, E
      0x9b: {
        instruction: () => this.instruction.SBC_A_n("E"),
        length: 1,
        cycles: 4,
      },

      // SBC A, H
      0x9c: {
        instruction: () => this.instruction.SBC_A_n("H"),
        length: 1,
        cycles: 4,
      },

      // SBC A, L
      0x9d: {
        instruction: () => this.instruction.SBC_A_n("L"),
        length: 1,
        cycles: 4,
      },

      // SBC A, (HL)
      0x9e: {
        instruction: () => this.instruction.SBC_A_n("HL"),
        length: 1,
        cycles: 8,
      },

      // SBC A, A
      0x9f: {
        instruction: () => this.instruction.SBC_A_n("A"),
        length: 1,
        cycles: 4,
      },

      // AND B
      0xa0: {
        instruction: () => this.instruction.AND_n("B"),
        length: 1,
        cycles: 4,
      },

      // AND C
      0xa1: {
        instruction: () => this.instruction.AND_n("C"),
        length: 1,
        cycles: 4,
      },

      // AND D
      0xa2: {
        instruction: () => this.instruction.AND_n("D"),
        length: 1,
        cycles: 4,
      },

      // AND E
      0xa3: {
        instruction: () => this.instruction.AND_n("E"),
        length: 1,
        cycles: 4,
      },

      // AND H
      0xa4: {
        instruction: () => this.instruction.AND_n("H"),
        length: 1,
        cycles: 4,
      },

      // AND L
      0xa5: {
        instruction: () => this.instruction.AND_n("L"),
        length: 1,
        cycles: 4,
      },

      // AND (HL)
      0xa6: {
        instruction: () => this.instruction.AND_n("HL"),
        length: 1,
        cycles: 8,
      },

      // AND A
      0xa7: {
        instruction: () => this.instruction.AND_n("A"),
        length: 1,
        cycles: 4,
      },

      // XOR B
      0xa8: {
        instruction: () => this.instruction.XOR_n("B"),
        length: 1,
        cycles: 4,
      },

      // XOR C
      0xa9: {
        instruction: () => this.instruction.XOR_n("C"),
        length: 1,
        cycles: 4,
      },

      // XOR D
      0xaa: {
        instruction: () => this.instruction.XOR_n("D"),
        length: 1,
        cycles: 4,
      },

      // XOR E
      0xab: {
        instruction: () => this.instruction.XOR_n("E"),
        length: 1,
        cycles: 4,
      },

      // XOR H
      0xac: {
        instruction: () => this.instruction.XOR_n("H"),
        length: 1,
        cycles: 4,
      },

      // XOR L
      0xad: {
        instruction: () => this.instruction.XOR_n("L"),
        length: 1,
        cycles: 4,
      },

      // XOR (HL)
      0xae: {
        instruction: () => this.instruction.XOR_n("HL"),
        length: 1,
        cycles: 8,
      },

      // XOR A
      0xaf: {
        instruction: () => this.instruction.XOR_n("A"),
        length: 1,
        cycles: 4,
      },

      // OR B
      0xb0: {
        instruction: () => this.instruction.OR_n("B"),
        length: 1,
        cycles: 4,
      },

      // OR C
      0xb1: {
        instruction: () => this.instruction.OR_n("C"),
        length: 1,
        cycles: 4,
      },

      // OR D
      0xb2: {
        instruction: () => this.instruction.OR_n("D"),
        length: 1,
        cycles: 4,
      },

      // OR E
      0xb3: {
        instruction: () => this.instruction.OR_n("E"),
        length: 1,
        cycles: 4,
      },

      // OR H
      0xb4: {
        instruction: () => this.instruction.OR_n("H"),
        length: 1,
        cycles: 4,
      },

      // OR L
      0xb5: {
        instruction: () => this.instruction.OR_n("L"),
        length: 1,
        cycles: 4,
      },

      // OR (HL)
      0xb6: {
        instruction: () => this.instruction.OR_n("HL"),
        length: 1,
        cycles: 8,
      },

      // OR A
      0xb7: {
        instruction: () => this.instruction.OR_n("A"),
        length: 1,
        cycles: 4,
      },

      // CP B
      0xb8: {
        instruction: () => this.instruction.CP_n("B"),
        length: 1,
        cycles: 4,
      },

      // CP C
      0xb9: {
        instruction: () => this.instruction.CP_n("C"),
        length: 1,
        cycles: 4,
      },

      // CP D
      0xba: {
        instruction: () => this.instruction.CP_n("D"),
        length: 1,
        cycles: 4,
      },

      // CP E
      0xbb: {
        instruction: () => this.instruction.CP_n("E"),
        length: 1,
        cycles: 4,
      },

      // CP H
      0xbc: {
        instruction: () => this.instruction.CP_n("H"),
        length: 1,
        cycles: 4,
      },

      // CP L
      0xbd: {
        instruction: () => this.instruction.CP_n("L"),
        length: 1,
        cycles: 4,
      },

      // CP (HL)
      0xbe: {
        instruction: () => this.instruction.CP_n("HL"),
        length: 1,
        cycles: 8,
      },

      // CP A
      0xbf: {
        instruction: () => this.instruction.CP_n("A"),
        length: 1,
        cycles: 4,
      },

      // POP BC
      0xc1: {
        instruction: () => this.instruction.pop("BC"),
        length: 1,
        cycles: 12,
      },

      // PUSH BC
      0xc5: {
        instruction: () => this.instruction.push("BC"),
        length: 1,
        cycles: 16,
      },

      // ADD A, d8
      0xc6: {
        instruction: () => this.instruction.ADD_A_n(this.mem[this.pc + 1]), // d8 is at next pc address
        length: 2,
        cycles: 8,
      },

      // ADC A, d8
      0xce: {
        instruction: () => this.instruction.ADC_A_n(this.mem[this.pc + 1]), // d8 is at next pc address
        length: 2,
        cycles: 8,
      },

      // POP DE
      0xd1: {
        instruction: () => this.instruction.pop("DE"),
        length: 1,
        cycles: 12,
      },

      // PUSH DE
      0xd5: {
        instruction: () => this.instruction.push("DE"),
        length: 1,
        cycles: 16,
      },

      // SUB A, d8
      0xd6: {
        instruction: () => this.instruction.SUB_A_n(this.mem[this.pc + 1]), // d8 is at next pc address
        length: 2,
        cycles: 8,
      },

      // SBC A, d8
      0xdf: {
        instruction: () => this.instruction.SBC_A_n(this.mem[this.pc + 1]), // d8 is at next pc address
        length: 2,
        cycles: 8,
      },

      // LDH (a8), A
      0xe0: {
        instruction: () => this.instruction.LDH_n_A(this.mem[this.pc + 1]), // a8 is at next pc address
        length: 2,
        cycles: 12,
      },

      // POP HL
      0xe1: {
        instruction: () => this.instruction.pop("HL"),
        length: 1,
        cycles: 12,
      },

      // LD (C), A
      0xe2: {
        instruction: () => this.instruction.LD_OffsetC_A(),
        length: 1,
        cycles: 8,
      },

      // PUSH HL
      0xe5: {
        instruction: () => this.instruction.push("HL"),
        length: 1,
        cycles: 16,
      },

      // AND d8
      0xe6: {
        instruction: () => this.instruction.AND_n(this.mem[this.pc + 1]), // d8 is at next pc address
        length: 2,
        cycles: 8,
      },

      // ADD SP, r8
      0xe8: {
        instruction: () => this.instruction.ADD_SP_n(),
        length: 2,
        cycles: 16,
      },

      // LD (a16), A
      0xea: {
        instruction: () => this.instruction.LD_n_A("a16", true),
        length: 3,
        cycles: 16,
      },

      // XOR d8
      0xee: {
        instruction: () => this.instruction.XOR_n(this.mem[this.pc + 1]), // d8 is at next pc address
        length: 2,
        cycles: 8,
      },

      // LDH A, (a8)
      0xf0: {
        instruction: () => this.instruction.LDH_A_n(this.mem[this.pc + 1]), // a8 is at next pc address
        length: 2,
        cycles: 12,
      },

      // POP AF
      0xf1: {
        instruction: () => this.instruction.pop("AF"),
        length: 1,
        cycles: 12,
      },

      // LD A, (C)
      0xf2: {
        instruction: () => this.instruction.LD_A_OffsetC(),
        length: 1,
        cycles: 8,
      },

      // DI
      0xf3: {
        instruction: () => this.instruction.DI(),
        length: 1,
        cycles: 4,
      },

      // PUSH AF
      0xf5: {
        instruction: () => this.instruction.push("AF"),
        length: 1,
        cycles: 16,
      },

      // OR d8
      0xf6: {
        instruction: () => this.instruction.OR_n(this.mem[this.pc + 1]), // d8 is at next pc address
        length: 2,
        cycles: 8,
      },

      // LD A, (a16)
      0xfa: {
        instruction: () => this.instruction.LD_A_n("a16", true),
        length: 3,
        cycles: 16,
      },

      // CP d8
      0xfe: {
        instruction: () => this.instruction.CP_n(this.mem[this.pc + 1]), // d8 is at next pc address
        length: 2,
        cycles: 8,
      },

      // LDHL SP, r8
      0xf8: {
        instruction: () => this.instruction.LDHL_SP_n(),
        length: 2,
        cycles: 12,
      },

      // LD SP, HL
      0xf9: {
        instruction: () => this.instruction.LD_SP_HL(),
        length: 1,
        cycles: 8,
      },

      // EI
      0xfb: {
        instruction: () => this.instruction.EI(),
        length: 1,
        cycles: 4,
      },
    };
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
    } else if (register.length == 2) {
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
      this.registersValues[index] = value;
    }
    // Combined register
    else if (register.length == 2) {
      const left = register.split("")[0];
      const right = register.split("")[1];

      if (left in CPU.Registers && right in CPU.Registers) {
        const leftIndex = Object.keys(CPU.Registers).indexOf(left);
        const rightIndex = Object.keys(CPU.Registers).indexOf(right);

        this.registersValues[leftIndex] = (value & 0xff00) >> 8;
        this.registersValues[rightIndex] = value & 0xff;
      } else console.error("Unknown combined register: " + register);
    } else console.error("Unknown register: " + register);
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
    return (this.mem[this.pc + 1] << 24) >> 24;
  }

  getImmediate16Bit() {
    const lowByte = this.mem[this.pc + 1];
    const highByte = this.mem[this.pc + 2];

    return (highByte << 8) | lowByte;
  }

  executeInstruction(opcode) {
    const fetch = this.instructionTable[opcode];
    if (!fetch) throw new Error(`Unknown opcode: ${opcode}`);
    fetch.instruction();
  }
}

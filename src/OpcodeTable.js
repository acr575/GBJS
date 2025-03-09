export class OpcodeTable {
  constructor(cpu) {
    // Instruction set. Links each opcode with it instruction, length and cycles
    this.instructionTable = {
      // NOP
      0x00: {
        instruction: () => {},
        length: 1,
        cycles: 4,
        mnemonic: ["NOP"],
      },

      // LD BC, d16
      0x01: {
        instruction: () => cpu.instruction.LD_n_nn("BC"),
        length: 3,
        cycles: 12,
        mnemonic: ["LD", "BC", "d16"],
      },

      // LD (BC), A
      0x02: {
        instruction: () => cpu.instruction.LD_n_A("BC", true),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "(BC)", "A"],
      },

      // INC BC
      0x03: {
        instruction: () => cpu.instruction.INC_nn("BC"),
        length: 1,
        cycles: 8,
        mnemonic: ["INC", "BC"],
      },

      // INC B
      0x04: {
        instruction: () => cpu.instruction.INC_n("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["INC", "B"],
      },

      // DEC B
      0x05: {
        instruction: () => cpu.instruction.DEC_n("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["DEC", "B"],
      },

      // LD B, d8
      0x06: {
        instruction: () => cpu.instruction.LD_nn_n("B"),
        length: 2,
        cycles: 8,
        mnemonic: ["LD", "B", "d8"],
      },

      // RLCA
      0x07: {
        instruction: () => cpu.instruction.RLCA(),
        length: 1,
        cycles: 4,
        mnemonic: ["RLCA"],
      },

      // LD (a16), SP
      0x08: {
        instruction: () => cpu.instruction.LD_nn_SP(),
        length: 3,
        cycles: 20,
        mnemonic: ["LD", "a16", "SP"],
      },

      // ADD HL, BC
      0x09: {
        instruction: () => cpu.instruction.ADD_HL_n("BC"),
        length: 1,
        cycles: 8,
        mnemonic: ["ADD", "HL", "BC"],
      },

      // LD A, (BC)
      0x0a: {
        instruction: () => cpu.instruction.LD_A_n("BC", true),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "A", "(BC)"],
      },

      // DEC BC
      0x0b: {
        instruction: () => cpu.instruction.DEC_nn("BC"),
        length: 1,
        cycles: 8,
        mnemonic: ["DEC", "BC"],
      },

      // INC C
      0x0c: {
        instruction: () => cpu.instruction.INC_n("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["INC", "C"],
      },

      // DEC C
      0x0d: {
        instruction: () => cpu.instruction.DEC_n("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["DEC", "C"],
      },

      // LD C, d8
      0x0e: {
        instruction: () => cpu.instruction.LD_nn_n("C"),
        length: 2,
        cycles: 8,
        mnemonic: ["LD", "C", "d8"],
      },

      // RRCA
      0x0f: {
        instruction: () => cpu.instruction.RRCA(),
        length: 1,
        cycles: 4,
        mnemonic: ["RRCA"],
      },

      // STOP
      0x10: {
        instruction: () => cpu.instruction.STOP(),
        length: 2,
        cycles: 4,
        mnemonic: ["STOP"],
      },

      // LD DE, d16
      0x11: {
        instruction: () => cpu.instruction.LD_n_nn("DE"),
        length: 3,
        cycles: 12,
        mnemonic: ["LD", "DE", "d16"],
      },

      // LD (DE), A
      0x12: {
        instruction: () => cpu.instruction.LD_n_A("DE", true),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "(DE)", "A"],
      },

      // INC DE
      0x13: {
        instruction: () => cpu.instruction.INC_nn("DE"),
        length: 1,
        cycles: 8,
        mnemonic: ["INC", "DE"],
      },

      // INC D
      0x14: {
        instruction: () => cpu.instruction.INC_n("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["INC", "D"],
      },

      // DEC D
      0x15: {
        instruction: () => cpu.instruction.DEC_n("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["DEC", "D"],
      },

      // LD D, d8
      0x16: {
        instruction: () => cpu.instruction.LD_nn_n("D"),
        length: 2,
        cycles: 8,
        mnemonic: ["LD", "D", "d8"],
      },

      // RLA
      0x17: {
        instruction: () => cpu.instruction.RLA(),
        length: 1,
        cycles: 4,
        mnemonic: ["RLA"],
      },

      // JR r8
      0x18: {
        instruction: () => cpu.instruction.JR_n(cpu.getSignedImmediate8Bit()), // r8 is at next PC address
        length: 2,
        cycles: 12,
        mnemonic: ["JR", "r8"],
      },

      // ADD HL, DE
      0x19: {
        instruction: () => cpu.instruction.ADD_HL_n("DE"),
        length: 1,
        cycles: 8,
        mnemonic: ["ADD", "HL", "DE"],
      },

      // LD A, (DE)
      0x1a: {
        instruction: () => cpu.instruction.LD_A_n("DE", true),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "A", "(DE)"],
      },

      // DEC DE
      0x1b: {
        instruction: () => cpu.instruction.DEC_nn("DE"),
        length: 1,
        cycles: 8,
        mnemonic: ["DEC", "DE"],
      },

      // INC E
      0x1c: {
        instruction: () => cpu.instruction.INC_n("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["INC", "E"],
      },

      // DEC E
      0x1d: {
        instruction: () => cpu.instruction.DEC_n("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["DEC", "E"],
      },

      // LD E, d8
      0x1e: {
        instruction: () => cpu.instruction.LD_nn_n("E"),
        length: 2,
        cycles: 8,
        mnemonic: ["LD", "E", "d8"],
      },

      // RRA
      0x1f: {
        instruction: () => cpu.instruction.RRA(),
        length: 1,
        cycles: 4,
        mnemonic: ["RRA"],
      },

      // JR NZ r8
      0x20: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.JR_cc_nn(
            "NZ",
            cpu.getSignedImmediate8Bit()
          )), // r8 is at next pc address
        length: 2,
        cycles: () => this.lastCycles,
        mnemonic: ["JR", "NZ", "r8"],
      },

      // LD HL, d16
      0x21: {
        instruction: () => cpu.instruction.LD_n_nn("HL"),
        length: 3,
        cycles: 12,
        mnemonic: ["LD", "HL", "d16"],
      },

      // LDI (HL), A
      0x22: {
        instruction: () => cpu.instruction.LDI_HL_A(),
        length: 1,
        cycles: 8,
        mnemonic: ["LDI", "(HL)", "A"],
      },

      // INC HL
      0x23: {
        instruction: () => cpu.instruction.INC_nn("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["INC", "HL"],
      },

      // INC H
      0x24: {
        instruction: () => cpu.instruction.INC_n("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["INC", "H"],
      },

      // DEC H
      0x25: {
        instruction: () => cpu.instruction.DEC_n("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["DEC", "H"],
      },

      // LD H, d8
      0x26: {
        instruction: () => cpu.instruction.LD_nn_n("H"),
        length: 2,
        cycles: 8,
        mnemonic: ["LD", "H", "d8"],
      },

      // DAA
      0x27: {
        instruction: () => cpu.instruction.DAA(),
        length: 1,
        cycles: 4,
        mnemonic: ["DAA"],
      },

      // JR Z r8
      0x28: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.JR_cc_nn(
            "Z",
            cpu.getSignedImmediate8Bit()
          )), // r8 is at next pc address
        length: 2,
        cycles: () => this.lastCycles,
        mnemonic: ["JR", "Z", "r8"],
      },

      // ADD HL, HL
      0x29: {
        instruction: () => cpu.instruction.ADD_HL_n("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["ADD", "HL", "HL"],
      },

      // LDI A, (HL)
      0x2a: {
        instruction: () => cpu.instruction.LDI_A_HL(),
        length: 1,
        cycles: 8,
        mnemonic: ["LDI", "A", "(HL)"],
      },

      // DEC HL
      0x2b: {
        instruction: () => cpu.instruction.DEC_nn("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["DEC", "HL"],
      },

      // INC L
      0x2c: {
        instruction: () => cpu.instruction.INC_n("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["INC", "L"],
      },

      // DEC L
      0x2d: {
        instruction: () => cpu.instruction.DEC_n("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["DEC", "L"],
      },

      // LD L, d8
      0x2e: {
        instruction: () => cpu.instruction.LD_nn_n("L"),
        length: 2,
        cycles: 8,
        mnemonic: ["LD", "L", "d8"],
      },

      // CPL
      0x2f: {
        instruction: () => cpu.instruction.CPL(),
        length: 1,
        cycles: 4,
        mnemonic: ["CPL"],
      },

      // JR NC r8
      0x30: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.JR_cc_nn(
            "NC",
            cpu.getSignedImmediate8Bit()
          )), // r8 is at next pc address
        length: 2,
        cycles: () => this.lastCycles,
        mnemonic: ["JR", "NC", "r8"],
      },

      // LD SP, d16
      0x31: {
        instruction: () => cpu.instruction.LD_n_nn("SP"),
        length: 3,
        cycles: 12,
        mnemonic: ["LD", "SP", "d16"],
      },

      // LDD (HL), A
      0x32: {
        instruction: () => cpu.instruction.LDD_HL_A(),
        length: 1,
        cycles: 8,
        mnemonic: ["LDD", "(HL)", "A"],
      },

      // INC SP
      0x33: {
        instruction: () => cpu.instruction.INC_nn("SP"),
        length: 1,
        cycles: 8,
        mnemonic: ["INC", "SP"],
      },

      // INC (HL)
      0x34: {
        instruction: () => cpu.instruction.INC_n("HL"),
        length: 1,
        cycles: 12,
        mnemonic: ["INC", "(HL)"],
      },

      // DEC (HL)
      0x35: {
        instruction: () => cpu.instruction.DEC_n("HL"),
        length: 1,
        cycles: 12,
        mnemonic: ["DEC", "(HL)"],
      },

      // LD (HL), d8
      0x36: {
        instruction: () =>
          cpu.instruction.LD_r1_r2("HL", cpu.mmu.readByte(cpu.pc + 1)), // d8 is at next PC address
        length: 2,
        cycles: 12,
        mnemonic: ["LD", "(HL)", "d8"],
      },

      // SCF
      0x37: {
        instruction: () => cpu.instruction.SCF(),
        length: 1,
        cycles: 4,
        mnemonic: ["SCF"],
      },

      // JR C r8
      0x38: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.JR_cc_nn(
            "C",
            cpu.getSignedImmediate8Bit()
          )), // r8 is at next pc address
        length: 2,
        cycles: () => this.lastCycles,
        mnemonic: ["JR", "C", "r8"],
      },

      // ADD HL, SP
      0x39: {
        instruction: () => cpu.instruction.ADD_HL_n("SP"),
        length: 1,
        cycles: 8,
        mnemonic: ["ADD", "HL", "SP"],
      },

      // LDD A, (HL)
      0x3a: {
        instruction: () => cpu.instruction.LDD_A_HL(),
        length: 1,
        cycles: 8,
        mnemonic: ["LDD", "A", "(HL)"],
      },

      // DEC SP
      0x3b: {
        instruction: () => cpu.instruction.DEC_nn("SP"),
        length: 1,
        cycles: 8,
        mnemonic: ["DEC", "SP"],
      },

      // INC A
      0x3c: {
        instruction: () => cpu.instruction.INC_n("A"),
        length: 1,
        cycles: 4,
        mnemonic: ["INC", "A"],
      },

      // DEC A
      0x3d: {
        instruction: () => cpu.instruction.DEC_n("A"),
        length: 1,
        cycles: 4,
        mnemonic: ["DEC", "A"],
      },

      // LD A, d8
      0x3e: {
        instruction: () => cpu.instruction.LD_A_n("d8"),
        length: 2,
        cycles: 8,
        mnemonic: ["LD", "A", "d8"],
      },

      // CCF
      0x3f: {
        instruction: () => cpu.instruction.CCF(),
        length: 1,
        cycles: 4,
        mnemonic: ["CCF"],
      },

      // LD B, B
      0x40: {
        instruction: () => cpu.instruction.LD_r1_r2("B", "B"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "B", "B"],
      },

      // LD B, C
      0x41: {
        instruction: () => cpu.instruction.LD_r1_r2("B", "C"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "B", "C"],
      },

      // LD B, D
      0x42: {
        instruction: () => cpu.instruction.LD_r1_r2("B", "D"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "B", "D"],
      },

      // LD B, E
      0x43: {
        instruction: () => cpu.instruction.LD_r1_r2("B", "E"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "B", "E"],
      },

      // LD B, H
      0x44: {
        instruction: () => cpu.instruction.LD_r1_r2("B", "H"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "B", "H"],
      },

      // LD B, L
      0x45: {
        instruction: () => cpu.instruction.LD_r1_r2("B", "L"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "B", "L"],
      },

      // LD B, (HL)
      0x46: {
        instruction: () => cpu.instruction.LD_r1_r2("B", "HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "B", "(HL)"],
      },

      // LD B, A
      0x47: {
        instruction: () => cpu.instruction.LD_n_A("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "B", "A"],
      },

      // LD C, B
      0x48: {
        instruction: () => cpu.instruction.LD_r1_r2("C", "B"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "C", "B"],
      },

      // LD C, C
      0x49: {
        instruction: () => cpu.instruction.LD_r1_r2("C", "C"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "C", "C"],
      },

      // LD C, D
      0x4a: {
        instruction: () => cpu.instruction.LD_r1_r2("C", "D"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "C", "D"],
      },

      // LD C, E
      0x4b: {
        instruction: () => cpu.instruction.LD_r1_r2("C", "E"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "C", "E"],
      },

      // LD C, H
      0x4c: {
        instruction: () => cpu.instruction.LD_r1_r2("C", "H"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "C", "H"],
      },

      // LD C, L
      0x4d: {
        instruction: () => cpu.instruction.LD_r1_r2("C", "L"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "C", "L"],
      },

      // LD C, (HL)
      0x4e: {
        instruction: () => cpu.instruction.LD_r1_r2("C", "HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "C", "(HL)"],
      },

      // LD C, A
      0x4f: {
        instruction: () => cpu.instruction.LD_n_A("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "C", "A"],
      },

      // LD D, B
      0x50: {
        instruction: () => cpu.instruction.LD_r1_r2("D", "B"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "D", "B"],
      },

      // LD D, C
      0x51: {
        instruction: () => cpu.instruction.LD_r1_r2("D", "C"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "D", "C"],
      },

      // LD D, D
      0x52: {
        instruction: () => cpu.instruction.LD_r1_r2("D", "D"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "D", "D"],
      },

      // LD D, E
      0x53: {
        instruction: () => cpu.instruction.LD_r1_r2("D", "E"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "D", "E"],
      },

      // LD D, H
      0x54: {
        instruction: () => cpu.instruction.LD_r1_r2("D", "H"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "D", "H"],
      },

      // LD D, L
      0x55: {
        instruction: () => cpu.instruction.LD_r1_r2("D", "L"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "D", "L"],
      },

      // LD D, (HL)
      0x56: {
        instruction: () => cpu.instruction.LD_r1_r2("D", "HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "D", "(HL)"],
      },

      // LD D, A
      0x57: {
        instruction: () => cpu.instruction.LD_n_A("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "D", "A"],
      },

      // LD E, B
      0x58: {
        instruction: () => cpu.instruction.LD_r1_r2("E", "B"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "E", "B"],
      },

      // LD E, C
      0x59: {
        instruction: () => cpu.instruction.LD_r1_r2("E", "C"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "E", "C"],
      },

      // LD E, D
      0x5a: {
        instruction: () => cpu.instruction.LD_r1_r2("E", "D"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "E", "D"],
      },

      // LD E, E
      0x5b: {
        instruction: () => cpu.instruction.LD_r1_r2("E", "E"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "E", "E"],
      },

      // LD E, H
      0x5c: {
        instruction: () => cpu.instruction.LD_r1_r2("E", "H"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "E", "H"],
      },

      // LD E, L
      0x5d: {
        instruction: () => cpu.instruction.LD_r1_r2("E", "L"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "E", "L"],
      },

      // LD E, (HL)
      0x5e: {
        instruction: () => cpu.instruction.LD_r1_r2("E", "HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "E", "(HL)"],
      },

      // LD E, A
      0x5f: {
        instruction: () => cpu.instruction.LD_n_A("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "E", "A"],
      },

      // LD H, B
      0x60: {
        instruction: () => cpu.instruction.LD_r1_r2("H", "B"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "H", "B"],
      },

      // LD H, C
      0x61: {
        instruction: () => cpu.instruction.LD_r1_r2("H", "C"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "H", "C"],
      },

      // LD H, D
      0x62: {
        instruction: () => cpu.instruction.LD_r1_r2("H", "D"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "H", "D"],
      },

      // LD H, E
      0x63: {
        instruction: () => cpu.instruction.LD_r1_r2("H", "E"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "H", "E"],
      },

      // LD H, H
      0x64: {
        instruction: () => cpu.instruction.LD_r1_r2("H", "H"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "H", "H"],
      },

      // LD H, L
      0x65: {
        instruction: () => cpu.instruction.LD_r1_r2("H", "L"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "H", "L"],
      },

      // LD H, (HL)
      0x66: {
        instruction: () => cpu.instruction.LD_r1_r2("H", "HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "H", "(HL)"],
      },

      // LD H, A
      0x67: {
        instruction: () => cpu.instruction.LD_n_A("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "H", "A"],
      },

      // LD L, B
      0x68: {
        instruction: () => cpu.instruction.LD_r1_r2("L", "B"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "L", "B"],
      },

      // LD L, C
      0x69: {
        instruction: () => cpu.instruction.LD_r1_r2("L", "C"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "L", "C"],
      },

      // LD L, D
      0x6a: {
        instruction: () => cpu.instruction.LD_r1_r2("L", "D"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "L", "D"],
      },

      // LD L, E
      0x6b: {
        instruction: () => cpu.instruction.LD_r1_r2("L", "E"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "L", "E"],
      },

      // LD L, H
      0x6c: {
        instruction: () => cpu.instruction.LD_r1_r2("L", "H"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "L", "H"],
      },

      // LD L, L
      0x6d: {
        instruction: () => cpu.instruction.LD_r1_r2("L", "L"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "L", "L"],
      },

      // LD L, (HL)
      0x6e: {
        instruction: () => cpu.instruction.LD_r1_r2("L", "HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "L", "(HL)"],
      },

      // LD L, A
      0x6f: {
        instruction: () => cpu.instruction.LD_n_A("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "L", "A"],
      },

      // LD (HL), B
      0x70: {
        instruction: () => cpu.instruction.LD_r1_r2("HL", "B"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "(HL)", "B"],
      },

      // LD (HL), C
      0x71: {
        instruction: () => cpu.instruction.LD_r1_r2("HL", "C"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "(HL)", "C"],
      },

      // LD (HL), D
      0x72: {
        instruction: () => cpu.instruction.LD_r1_r2("HL", "D"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "(HL)", "D"],
      },

      // LD (HL), E
      0x73: {
        instruction: () => cpu.instruction.LD_r1_r2("HL", "E"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "(HL)", "E"],
      },

      // LD (HL), H
      0x74: {
        instruction: () => cpu.instruction.LD_r1_r2("HL", "H"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "(HL)", "H"],
      },

      // LD (HL), L
      0x75: {
        instruction: () => cpu.instruction.LD_r1_r2("HL", "L"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "(HL)", "L"],
      },

      // HALT
      0x76: {
        instruction: () => cpu.instruction.HALT(),
        length: 1,
        cycles: 4,
        mnemonic: ["HALT"],
      },

      // LD (HL), A
      0x77: {
        instruction: () => cpu.instruction.LD_n_A("HL", true),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "(HL)", "A"],
      },

      // LD A, B
      0x78: {
        instruction: () => cpu.instruction.LD_r1_r2("A", "B"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "A", "B"],
      },

      // LD A, C
      0x79: {
        instruction: () => cpu.instruction.LD_r1_r2("A", "C"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "A", "C"],
      },

      // LD A, D
      0x7a: {
        instruction: () => cpu.instruction.LD_r1_r2("A", "D"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "A", "D"],
      },

      // LD A, E
      0x7b: {
        instruction: () => cpu.instruction.LD_r1_r2("A", "E"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "A", "E"],
      },

      // LD A, H
      0x7c: {
        instruction: () => cpu.instruction.LD_r1_r2("A", "H"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "A", "H"],
      },

      // LD A, L
      0x7d: {
        instruction: () => cpu.instruction.LD_r1_r2("A", "L"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "A", "L"],
      },

      // LD A, (HL)
      0x7e: {
        instruction: () => cpu.instruction.LD_r1_r2("A", "HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "A", "(HL)"],
      },

      // LD A, A
      0x7f: {
        instruction: () => cpu.instruction.LD_r1_r2("A", "A"),
        length: 1,
        cycles: 4,
        mnemonic: ["LD", "A", "A"],
      },

      // ADD A, B
      0x80: {
        instruction: () => cpu.instruction.ADD_A_n("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADD", "A", "B"],
      },

      // ADD A, C
      0x81: {
        instruction: () => cpu.instruction.ADD_A_n("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADD", "A", "C"],
      },

      // ADD A, D
      0x82: {
        instruction: () => cpu.instruction.ADD_A_n("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADD", "A", "D"],
      },

      // ADD A, E
      0x83: {
        instruction: () => cpu.instruction.ADD_A_n("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADD", "A", "E"],
      },

      // ADD A, H
      0x84: {
        instruction: () => cpu.instruction.ADD_A_n("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADD", "A", "H"],
      },

      // ADD A, L
      0x85: {
        instruction: () => cpu.instruction.ADD_A_n("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADD", "A", "L"],
      },

      // ADD A, (HL)
      0x86: {
        instruction: () => cpu.instruction.ADD_A_n("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["ADD", "A", "(HL)"],
      },

      // ADD A, A
      0x87: {
        instruction: () => cpu.instruction.ADD_A_n("A"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADD", "A", "A"],
      },

      // ADC A, B
      0x88: {
        instruction: () => cpu.instruction.ADC_A_n("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADC", "A", "B"],
      },

      // ADC A, C
      0x89: {
        instruction: () => cpu.instruction.ADC_A_n("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADC", "A", "C"],
      },

      // ADC A, D
      0x8a: {
        instruction: () => cpu.instruction.ADC_A_n("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADC", "A", "D"],
      },

      // ADC A, E
      0x8b: {
        instruction: () => cpu.instruction.ADC_A_n("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADC", "A", "E"],
      },

      // ADC A, H
      0x8c: {
        instruction: () => cpu.instruction.ADC_A_n("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADC", "A", "H"],
      },

      // ADC A, L
      0x8d: {
        instruction: () => cpu.instruction.ADC_A_n("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADC", "A", "L"],
      },

      // ADC A, (HL)
      0x8e: {
        instruction: () => cpu.instruction.ADC_A_n("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["ADC", "A", "(HL)"],
      },

      // ADC A, A
      0x8f: {
        instruction: () => cpu.instruction.ADC_A_n("A"),
        length: 1,
        cycles: 4,
        mnemonic: ["ADC", "A", "A"],
      },

      // SUB A, B
      0x90: {
        instruction: () => cpu.instruction.SUB_A_n("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["SUB", "A", "B"],
      },

      // SUB A, C
      0x91: {
        instruction: () => cpu.instruction.SUB_A_n("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["SUB", "A", "C"],
      },

      // SUB A, D
      0x92: {
        instruction: () => cpu.instruction.SUB_A_n("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["SUB", "A", "D"],
      },

      // SUB A, E
      0x93: {
        instruction: () => cpu.instruction.SUB_A_n("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["SUB", "A", "E"],
      },

      // SUB A, H
      0x94: {
        instruction: () => cpu.instruction.SUB_A_n("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["SUB", "A", "H"],
      },

      // SUB A, L
      0x95: {
        instruction: () => cpu.instruction.SUB_A_n("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["SUB", "A", "L"],
      },

      // SUB A, (HL)
      0x96: {
        instruction: () => cpu.instruction.SUB_A_n("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["SUB", "A", "(HL)"],
      },

      // SUB A, A
      0x97: {
        instruction: () => cpu.instruction.SUB_A_n("A"),
        length: 1,
        cycles: 4,
        mnemonic: ["SUB", "A", "A"],
      },

      // SBC A, B
      0x98: {
        instruction: () => cpu.instruction.SBC_A_n("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["SBC", "A", "B"],
      },

      // SBC A, C
      0x99: {
        instruction: () => cpu.instruction.SBC_A_n("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["SBC", "A", "C"],
      },

      // SBC A, D
      0x9a: {
        instruction: () => cpu.instruction.SBC_A_n("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["SBC", "A", "D"],
      },

      // SBC A, E
      0x9b: {
        instruction: () => cpu.instruction.SBC_A_n("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["SBC", "A", "E"],
      },

      // SBC A, H
      0x9c: {
        instruction: () => cpu.instruction.SBC_A_n("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["SBC", "A", "H"],
      },

      // SBC A, L
      0x9d: {
        instruction: () => cpu.instruction.SBC_A_n("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["SBC", "A", "L"],
      },

      // SBC A, (HL)
      0x9e: {
        instruction: () => cpu.instruction.SBC_A_n("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["SBC", "A", "(HL)"],
      },

      // SBC A, A
      0x9f: {
        instruction: () => cpu.instruction.SBC_A_n("A"),
        length: 1,
        cycles: 4,
        mnemonic: ["SBC", "A", "A"],
      },

      // AND B
      0xa0: {
        instruction: () => cpu.instruction.AND_n("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["AND", "A", "B"],
      },

      // AND C
      0xa1: {
        instruction: () => cpu.instruction.AND_n("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["AND", "A", "C"],
      },

      // AND D
      0xa2: {
        instruction: () => cpu.instruction.AND_n("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["AND", "A", "D"],
      },

      // AND E
      0xa3: {
        instruction: () => cpu.instruction.AND_n("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["AND", "A", "E"],
      },

      // AND H
      0xa4: {
        instruction: () => cpu.instruction.AND_n("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["AND", "A", "H"],
      },

      // AND L
      0xa5: {
        instruction: () => cpu.instruction.AND_n("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["AND", "A", "L"],
      },

      // AND (HL)
      0xa6: {
        instruction: () => cpu.instruction.AND_n("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["AND", "A", "(HL)"],
      },

      // AND A
      0xa7: {
        instruction: () => cpu.instruction.AND_n("A"),
        length: 1,
        cycles: 4,
        mnemonic: ["AND", "A", "A"],
      },

      // XOR B
      0xa8: {
        instruction: () => cpu.instruction.XOR_n("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["XOR", "A", "B"],
      },

      // XOR C
      0xa9: {
        instruction: () => cpu.instruction.XOR_n("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["XOR", "A", "C"],
      },

      // XOR D
      0xaa: {
        instruction: () => cpu.instruction.XOR_n("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["XOR", "A", "D"],
      },

      // XOR E
      0xab: {
        instruction: () => cpu.instruction.XOR_n("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["XOR", "A", "E"],
      },

      // XOR H
      0xac: {
        instruction: () => cpu.instruction.XOR_n("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["XOR", "A", "H"],
      },

      // XOR L
      0xad: {
        instruction: () => cpu.instruction.XOR_n("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["XOR", "A", "L"],
      },

      // XOR (HL)
      0xae: {
        instruction: () => cpu.instruction.XOR_n("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["XOR", "A", "(HL)"],
      },

      // XOR A
      0xaf: {
        instruction: () => cpu.instruction.XOR_n("A"),
        length: 1,
        cycles: 4,
        mnemonic: ["XOR", "A", "A"],
      },

      // OR B
      0xb0: {
        instruction: () => cpu.instruction.OR_n("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["OR", "A", "B"],
      },

      // OR C
      0xb1: {
        instruction: () => cpu.instruction.OR_n("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["OR", "A", "C"],
      },

      // OR D
      0xb2: {
        instruction: () => cpu.instruction.OR_n("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["OR", "A", "D"],
      },

      // OR E
      0xb3: {
        instruction: () => cpu.instruction.OR_n("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["OR", "A", "E"],
      },

      // OR H
      0xb4: {
        instruction: () => cpu.instruction.OR_n("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["OR", "A", "H"],
      },

      // OR L
      0xb5: {
        instruction: () => cpu.instruction.OR_n("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["OR", "A", "L"],
      },

      // OR (HL)
      0xb6: {
        instruction: () => cpu.instruction.OR_n("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["OR", "A", "(HL)"],
      },

      // OR A
      0xb7: {
        instruction: () => cpu.instruction.OR_n("A"),
        length: 1,
        cycles: 4,
        mnemonic: ["OR", "A", "A"],
      },

      // CP B
      0xb8: {
        instruction: () => cpu.instruction.CP_n("B"),
        length: 1,
        cycles: 4,
        mnemonic: ["CP", "A", "B"],
      },

      // CP C
      0xb9: {
        instruction: () => cpu.instruction.CP_n("C"),
        length: 1,
        cycles: 4,
        mnemonic: ["CP", "A", "C"],
      },

      // CP D
      0xba: {
        instruction: () => cpu.instruction.CP_n("D"),
        length: 1,
        cycles: 4,
        mnemonic: ["CP", "A", "D"],
      },

      // CP E
      0xbb: {
        instruction: () => cpu.instruction.CP_n("E"),
        length: 1,
        cycles: 4,
        mnemonic: ["CP", "A", "E"],
      },

      // CP H
      0xbc: {
        instruction: () => cpu.instruction.CP_n("H"),
        length: 1,
        cycles: 4,
        mnemonic: ["CP", "A", "H"],
      },

      // CP L
      0xbd: {
        instruction: () => cpu.instruction.CP_n("L"),
        length: 1,
        cycles: 4,
        mnemonic: ["CP", "A", "L"],
      },

      // CP (HL)
      0xbe: {
        instruction: () => cpu.instruction.CP_n("HL"),
        length: 1,
        cycles: 8,
        mnemonic: ["CP", "A", "(HL)"],
      },

      // CP A
      0xbf: {
        instruction: () => cpu.instruction.CP_n("A"),
        length: 1,
        cycles: 4,
        mnemonic: ["CP", "A", "A"],
      },

      // RET NZ
      0xc0: {
        instruction: () => (this.lastCycles = cpu.instruction.RET_cc("NZ")),
        length: 1,
        cycles: () => this.lastCycles,
        mnemonic: ["RET", "NZ"],
      },

      // POP BC
      0xc1: {
        instruction: () => cpu.instruction.pop("BC"),
        length: 1,
        cycles: 12,
        mnemonic: ["POP", "BC"],
      },

      // JP NZ a16
      0xc2: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.JP_cc_nn(
            "NZ",
            cpu.getImmediate16Bit()
          )), // a16 is at next 2 bytes from pc address
        length: 3,
        cycles: () => this.lastCycles,
        mnemonic: ["JP", "NZ", "a16"],
      },

      // JP a16
      0xc3: {
        instruction: () => cpu.instruction.JP_nn(cpu.getImmediate16Bit()), // a16 is at next 2 bytes from pc address
        length: 3,
        cycles: 16,
        mnemonic: ["JP", "a16"],
      },

      // CALL NZ, a16
      0xc4: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.CALL_cc_nn(
            "NZ",
            cpu.getImmediate16Bit()
          )), // a16 is at next 2 bytes from pc address
        length: 3,
        cycles: () => this.lastCycles,
        mnemonic: ["CALL", "NZ", "a16"],
      },

      // PUSH BC
      0xc5: {
        instruction: () => cpu.instruction.push("BC"),
        length: 1,
        cycles: 16,
        mnemonic: ["PUSH", "BC"],
      },

      // ADD A, d8
      0xc6: {
        instruction: () =>
          cpu.instruction.ADD_A_n(cpu.mmu.readByte(cpu.pc + 1)), // d8 is at next pc address
        length: 2,
        cycles: 8,
        mnemonic: ["ADD", "A", "d8"],
      },

      // RST 00H
      0xc7: {
        instruction: () => cpu.instruction.RST_n(0x00),
        length: 1,
        cycles: 16,
        mnemonic: ["RST", "00"],
      },

      // RET Z
      0xc8: {
        instruction: () => (this.lastCycles = cpu.instruction.RET_cc("Z")),
        length: 1,
        cycles: () => this.lastCycles,
        mnemonic: ["RET", "Z"],
      },

      // RET
      0xc9: {
        instruction: () => cpu.instruction.RET(),
        length: 1,
        cycles: 16,
        mnemonic: ["RET"],
      },

      // JP Z a16
      0xca: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.JP_cc_nn(
            "Z",
            cpu.getImmediate16Bit()
          )), // a16 is at next 2 bytes from pc address
        length: 3,
        cycles: () => this.lastCycles,
        mnemonic: ["JP", "Z", "a16"],
      },

      // PREFIX CB
      0xcb: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.PREFIX_CB(
            cpu.mmu.readByte(cpu.pc + 1)
          )), // The prefixed opcode is at next pc address
        length: 2,
        cycles: () => this.lastCycles ?? 8,
        mnemonic: ["PREFIX", "CB"],
      },

      // CALL Z, a16
      0xcc: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.CALL_cc_nn(
            "Z",
            cpu.getImmediate16Bit()
          )), // a16 is at next 2 bytes from pc address
        length: 3,
        cycles: () => this.lastCycles,
        mnemonic: ["CALL", "Z", "a16"],
      },

      // CALL a16
      0xcd: {
        instruction: () => cpu.instruction.CALL_nn(cpu.getImmediate16Bit()), // a16 is at next 2 bytes from pc address
        length: 3,
        cycles: 24,
        mnemonic: ["CALL", "a16"],
      },

      // ADC A, d8
      0xce: {
        instruction: () =>
          cpu.instruction.ADC_A_n(cpu.mmu.readByte(cpu.pc + 1)), // d8 is at next pc address
        length: 2,
        cycles: 8,
        mnemonic: ["ADC", "A", "d8"],
      },

      // RST 08H
      0xcf: {
        instruction: () => cpu.instruction.RST_n(0x08),
        length: 1,
        cycles: 16,
        mnemonic: ["RST", "08"],
      },

      // RET NC
      0xd0: {
        instruction: () => (this.lastCycles = cpu.instruction.RET_cc("NC")),
        length: 1,
        cycles: () => this.lastCycles,
        mnemonic: ["RET", "NC"],
      },

      // POP DE
      0xd1: {
        instruction: () => cpu.instruction.pop("DE"),
        length: 1,
        cycles: 12,
        mnemonic: ["POP", "DE"],
      },

      // JP NC a16
      0xd2: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.JP_cc_nn(
            "NC",
            cpu.getImmediate16Bit()
          )), // a16 is at next 2 bytes from pc address
        length: 3,
        cycles: () => this.lastCycles,
        mnemonic: ["JP", "NC", "a16"],
      },

      // CALL NC, a16
      0xd4: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.CALL_cc_nn(
            "NC",
            cpu.getImmediate16Bit()
          )), // a16 is at next 2 bytes from pc address
        length: 3,
        cycles: () => this.lastCycles,
        mnemonic: ["CALL", "NC", "a16"],
      },

      // PUSH DE
      0xd5: {
        instruction: () => cpu.instruction.push("DE"),
        length: 1,
        cycles: 16,
        mnemonic: ["PUSH", "DE"],
      },

      // SUB A, d8
      0xd6: {
        instruction: () =>
          cpu.instruction.SUB_A_n(cpu.mmu.readByte(cpu.pc + 1)), // d8 is at next pc address
        length: 2,
        cycles: 8,
        mnemonic: ["SUB", "A", "d8"],
      },

      // RST 10H
      0xd7: {
        instruction: () => cpu.instruction.RST_n(0x10),
        length: 1,
        cycles: 16,
        mnemonic: ["RST", "10"],
      },

      // RET C
      0xd8: {
        instruction: () => (this.lastCycles = cpu.instruction.RET_cc("C")),
        length: 1,
        cycles: () => this.lastCycles,
        mnemonic: ["RET", "C"],
      },

      // RETI
      0xd9: {
        instruction: () => cpu.instruction.RETI(),
        length: 1,
        cycles: 16,
        mnemonic: ["RETI"],
      },

      // JP C a16
      0xda: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.JP_cc_nn(
            "C",
            cpu.getImmediate16Bit()
          )), // a16 is at next 2 bytes from pc address
        length: 3,
        cycles: () => this.lastCycles,
        mnemonic: ["JP", "C", "a16"],
      },

      // CALL C, a16
      0xdc: {
        instruction: () =>
          (this.lastCycles = cpu.instruction.CALL_cc_nn(
            "C",
            cpu.getImmediate16Bit()
          )), // a16 is at next 2 bytes from pc address
        length: 3,
        cycles: () => this.lastCycles,
        mnemonic: ["CALL", "C", "a16"],
      },

      // SBC A, d8
      0xde: {
        instruction: () =>
          cpu.instruction.SBC_A_n(cpu.mmu.readByte(cpu.pc + 1)), // d8 is at next pc address
        length: 2,
        cycles: 8,
        mnemonic: ["SBC", "A", "d8"],
      },

      // RST 18H
      0xdf: {
        instruction: () => cpu.instruction.RST_n(0x18),
        length: 1,
        cycles: 16,
        mnemonic: ["RST", "18"],
      },

      // LDH (a8), A
      0xe0: {
        instruction: () =>
          cpu.instruction.LDH_n_A(cpu.mmu.readByte(cpu.pc + 1)), // a8 is at next pc address
        length: 2,
        cycles: 12,
        mnemonic: ["LDH", "a8", "A"],
      },

      // POP HL
      0xe1: {
        instruction: () => cpu.instruction.pop("HL"),
        length: 1,
        cycles: 12,
        mnemonic: ["POP", "HL"],
      },

      // LD (C), A
      0xe2: {
        instruction: () => cpu.instruction.LD_OffsetC_A(),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "(C)", "A"],
      },

      // PUSH HL
      0xe5: {
        instruction: () => cpu.instruction.push("HL"),
        length: 1,
        cycles: 16,
        mnemonic: ["PUSH", "HL"],
      },

      // AND d8
      0xe6: {
        instruction: () =>
          cpu.instruction.AND_n(cpu.mmu.readByte(cpu.pc + 1)), // d8 is at next pc address
        length: 2,
        cycles: 8,
        mnemonic: ["AND", "A", "d8"],
      },

      // RST 20H
      0xe7: {
        instruction: () => cpu.instruction.RST_n(0x20),
        length: 1,
        cycles: 16,
        mnemonic: ["RST", "20"],
      },

      // ADD SP, r8
      0xe8: {
        instruction: () => cpu.instruction.ADD_SP_n(),
        length: 2,
        cycles: 16,
        mnemonic: ["ADD", "SP", "r8"],
      },

      // JP (HL)
      0xe9: {
        instruction: () => cpu.instruction.JP_HL(),
        length: 1,
        cycles: 4,
        mnemonic: ["JP", "(HL)"],
      },

      // LD (a16), A
      0xea: {
        instruction: () => cpu.instruction.LD_n_A("a16", true),
        length: 3,
        cycles: 16,
        mnemonic: ["LD", "a16", "A"],
      },

      // XOR d8
      0xee: {
        instruction: () =>
          cpu.instruction.XOR_n(cpu.mmu.readByte(cpu.pc + 1)), // d8 is at next pc address
        length: 2,
        cycles: 8,
        mnemonic: ["XOR", "A", "d8"],
      },

      // RST 28H
      0xef: {
        instruction: () => cpu.instruction.RST_n(0x28),
        length: 1,
        cycles: 16,
        mnemonic: ["RST", "28"],
      },

      // LDH A, (a8)
      0xf0: {
        instruction: () =>
          cpu.instruction.LDH_A_n(cpu.mmu.readByte(cpu.pc + 1)), // a8 is at next pc address
        length: 2,
        cycles: 12,
        mnemonic: ["LDH", "A", "a8"],
      },

      // POP AF
      0xf1: {
        instruction: () => cpu.instruction.pop("AF"),
        length: 1,
        cycles: 12,
        mnemonic: ["POP", "AF"],
      },

      // LD A, (C)
      0xf2: {
        instruction: () => cpu.instruction.LD_A_OffsetC(),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "A", "(C)"],
      },

      // DI
      0xf3: {
        instruction: () => cpu.instruction.DI(),
        length: 1,
        cycles: 4,
        mnemonic: ["DI"],
      },

      // PUSH AF
      0xf5: {
        instruction: () => cpu.instruction.push("AF"),
        length: 1,
        cycles: 16,
        mnemonic: ["PUSH", "AF"],
      },

      // OR d8
      0xf6: {
        instruction: () => cpu.instruction.OR_n(cpu.mmu.readByte(cpu.pc + 1)), // d8 is at next pc address
        length: 2,
        cycles: 8,
        mnemonic: ["OR", "A", "d8"],
      },

      // RST 30H
      0xf7: {
        instruction: () => cpu.instruction.RST_n(0x30),
        length: 1,
        cycles: 16,
        mnemonic: ["RST", "30"],
      },

      // LDHL SP, r8
      0xf8: {
        instruction: () => cpu.instruction.LDHL_SP_n(),
        length: 2,
        cycles: 12,
        mnemonic: ["LDHL", "SP", "r8"],
      },

      // LD SP, HL
      0xf9: {
        instruction: () => cpu.instruction.LD_SP_HL(),
        length: 1,
        cycles: 8,
        mnemonic: ["LD", "SP", "HL"],
      },

      // LD A, (a16)
      0xfa: {
        instruction: () => cpu.instruction.LD_A_n("a16", true),
        length: 3,
        cycles: 16,
        mnemonic: ["LD", "A", "a16"],
      },

      // EI
      0xfb: {
        instruction: () => cpu.instruction.EI(),
        length: 1,
        cycles: 4,
        mnemonic: ["EI"],
      },

      // CP d8
      0xfe: {
        instruction: () => cpu.instruction.CP_n(cpu.mmu.readByte(cpu.pc + 1)), // d8 is at next pc address
        length: 2,
        cycles: 8,
        mnemonic: ["CP", "A", "d8"],
      },

      // RST 38H
      0xff: {
        instruction: () => cpu.instruction.RST_n(0x38),
        length: 1,
        cycles: 16,
        mnemonic: ["RST", "38"],
      },
    };

    /* CB Prefixed instruction set. Links each opcode with it instruction, length and cycles.
     * Default clock cycles are 8. Prefixed instruction's length is always 2 bytes (CB prefix + opcode).
     */
    this.prefixInstructionTable = {
      // RLC B
      0x00: {
        instruction: () => cpu.instruction.RLC_n("B"),
      },

      // RLC C
      0x01: {
        instruction: () => cpu.instruction.RLC_n("C"),
      },

      // RLC D
      0x02: {
        instruction: () => cpu.instruction.RLC_n("D"),
      },

      // RLC E
      0x03: {
        instruction: () => cpu.instruction.RLC_n("E"),
      },

      // RLC H
      0x04: {
        instruction: () => cpu.instruction.RLC_n("H"),
      },

      // RLC L
      0x05: {
        instruction: () => cpu.instruction.RLC_n("L"),
      },

      // RLC (HL)
      0x06: {
        instruction: () => cpu.instruction.RLC_n("HL"),
        cycles: 16,
      },

      // RLC A
      0x07: {
        instruction: () => cpu.instruction.RLC_n("A"),
      },

      // RRC B
      0x08: {
        instruction: () => cpu.instruction.RRC_n("B"),
      },

      // RRC C
      0x09: {
        instruction: () => cpu.instruction.RRC_n("C"),
      },

      // RRC D
      0x0a: {
        instruction: () => cpu.instruction.RRC_n("D"),
      },

      // RRC E
      0x0b: {
        instruction: () => cpu.instruction.RRC_n("E"),
      },

      // RRC H
      0x0c: {
        instruction: () => cpu.instruction.RRC_n("H"),
      },

      // RRC L
      0x0d: {
        instruction: () => cpu.instruction.RRC_n("L"),
      },

      // RRC (HL)
      0x0e: {
        instruction: () => cpu.instruction.RRC_n("HL"),
        cycles: 16,
      },

      // RRC A
      0x0f: {
        instruction: () => cpu.instruction.RRC_n("A"),
      },

      // RL B
      0x10: {
        instruction: () => cpu.instruction.RL_n("B"),
      },

      // RL C
      0x11: {
        instruction: () => cpu.instruction.RL_n("C"),
      },

      // RL D
      0x12: {
        instruction: () => cpu.instruction.RL_n("D"),
      },

      // RL E
      0x13: {
        instruction: () => cpu.instruction.RL_n("E"),
      },

      // RL H
      0x14: {
        instruction: () => cpu.instruction.RL_n("H"),
      },

      // RL L
      0x15: {
        instruction: () => cpu.instruction.RL_n("L"),
      },

      // RL (HL)
      0x16: {
        instruction: () => cpu.instruction.RL_n("HL"),
        cycles: 16,
      },

      // RL A
      0x17: {
        instruction: () => cpu.instruction.RL_n("A"),
      },

      // RR B
      0x18: {
        instruction: () => cpu.instruction.RR_n("B"),
      },

      // RR C
      0x19: {
        instruction: () => cpu.instruction.RR_n("C"),
      },

      // RR D
      0x1a: {
        instruction: () => cpu.instruction.RR_n("D"),
      },

      // RR E
      0x1b: {
        instruction: () => cpu.instruction.RR_n("E"),
      },

      // RR H
      0x1c: {
        instruction: () => cpu.instruction.RR_n("H"),
      },

      // RR L
      0x1d: {
        instruction: () => cpu.instruction.RR_n("L"),
      },

      // RR (HL)
      0x1e: {
        instruction: () => cpu.instruction.RR_n("HL"),
        cycles: 16,
      },

      // RR A
      0x1f: {
        instruction: () => cpu.instruction.RR_n("A"),
      },

      // SLA B
      0x20: {
        instruction: () => cpu.instruction.SLA_n("B"),
      },

      // SLA C
      0x21: {
        instruction: () => cpu.instruction.SLA_n("C"),
      },

      // SLA D
      0x22: {
        instruction: () => cpu.instruction.SLA_n("D"),
      },

      // SLA E
      0x23: {
        instruction: () => cpu.instruction.SLA_n("E"),
      },

      // SLA H
      0x24: {
        instruction: () => cpu.instruction.SLA_n("H"),
      },

      // SLA L
      0x25: {
        instruction: () => cpu.instruction.SLA_n("L"),
      },

      // SLA (HL)
      0x26: {
        instruction: () => cpu.instruction.SLA_n("HL"),
        cycles: 16,
      },

      // SLA A
      0x27: {
        instruction: () => cpu.instruction.SLA_n("A"),
      },

      // SRA B
      0x28: {
        instruction: () => cpu.instruction.SRA_n("B"),
      },

      // SRA C
      0x29: {
        instruction: () => cpu.instruction.SRA_n("C"),
      },

      // SRA D
      0x2a: {
        instruction: () => cpu.instruction.SRA_n("D"),
      },

      // SRA E
      0x2b: {
        instruction: () => cpu.instruction.SRA_n("E"),
      },

      // SRA H
      0x2c: {
        instruction: () => cpu.instruction.SRA_n("H"),
      },

      // SRA L
      0x2d: {
        instruction: () => cpu.instruction.SRA_n("L"),
      },

      // SRA (HL)
      0x2e: {
        instruction: () => cpu.instruction.SRA_n("HL"),
        cycles: 16,
      },

      // SRA A
      0x2f: {
        instruction: () => cpu.instruction.SRA_n("A"),
      },

      // SWAP B
      0x30: {
        instruction: () => cpu.instruction.SWAP_n("B"),
      },

      // SWAP C
      0x31: {
        instruction: () => cpu.instruction.SWAP_n("C"),
      },

      // SWAP D
      0x32: {
        instruction: () => cpu.instruction.SWAP_n("D"),
      },

      // SWAP E
      0x33: {
        instruction: () => cpu.instruction.SWAP_n("E"),
      },

      // SWAP H
      0x34: {
        instruction: () => cpu.instruction.SWAP_n("H"),
      },

      // SWAP L
      0x35: {
        instruction: () => cpu.instruction.SWAP_n("L"),
      },

      // SWAP (HL)
      0x36: {
        instruction: () => cpu.instruction.SWAP_n("HL"),
        cycles: 16,
      },

      // SWAP A
      0x37: {
        instruction: () => cpu.instruction.SWAP_n("A"),
      },

      // SRL B
      0x38: {
        instruction: () => cpu.instruction.SRL_n("B"),
      },

      // SRL C
      0x39: {
        instruction: () => cpu.instruction.SRL_n("C"),
      },

      // SRL D
      0x3a: {
        instruction: () => cpu.instruction.SRL_n("D"),
      },

      // SRL E
      0x3b: {
        instruction: () => cpu.instruction.SRL_n("E"),
      },

      // SRL H
      0x3c: {
        instruction: () => cpu.instruction.SRL_n("H"),
      },

      // SRL L
      0x3d: {
        instruction: () => cpu.instruction.SRL_n("L"),
      },

      // SRL (HL)
      0x3e: {
        instruction: () => cpu.instruction.SRL_n("HL"),
        cycles: 16,
      },

      // SRL A
      0x3f: {
        instruction: () => cpu.instruction.SRL_n("A"),
      },

      // BIT 0, B
      0x40: {
        instruction: () => cpu.instruction.BIT_b_r(0, "B"),
      },

      // BIT 0, C
      0x41: {
        instruction: () => cpu.instruction.BIT_b_r(0, "C"),
      },

      // BIT 0, D
      0x42: {
        instruction: () => cpu.instruction.BIT_b_r(0, "D"),
      },

      // BIT 0, E
      0x43: {
        instruction: () => cpu.instruction.BIT_b_r(0, "E"),
      },

      // BIT 0, H
      0x44: {
        instruction: () => cpu.instruction.BIT_b_r(0, "H"),
      },

      // BIT 0, L
      0x45: {
        instruction: () => cpu.instruction.BIT_b_r(0, "L"),
      },

      // BIT 0, (HL)
      0x46: {
        instruction: () => cpu.instruction.BIT_b_r(0, "HL"),
        cycles: 16,
      },

      // BIT 0, A
      0x47: {
        instruction: () => cpu.instruction.BIT_b_r(0, "A"),
      },

      // BIT 1, B
      0x48: {
        instruction: () => cpu.instruction.BIT_b_r(1, "B"),
      },

      // BIT 1, C
      0x49: {
        instruction: () => cpu.instruction.BIT_b_r(1, "C"),
      },

      // BIT 1, D
      0x4a: {
        instruction: () => cpu.instruction.BIT_b_r(1, "D"),
      },

      // BIT 1, E
      0x4b: {
        instruction: () => cpu.instruction.BIT_b_r(1, "E"),
      },

      // BIT 1, H
      0x4c: {
        instruction: () => cpu.instruction.BIT_b_r(1, "H"),
      },

      // BIT 1, L
      0x4d: {
        instruction: () => cpu.instruction.BIT_b_r(1, "L"),
      },

      // BIT 1, (HL)
      0x4e: {
        instruction: () => cpu.instruction.BIT_b_r(1, "HL"),
        cycles: 16,
      },

      // BIT 1, A
      0x4f: {
        instruction: () => cpu.instruction.BIT_b_r(1, "A"),
      },

      // BIT 2, B
      0x50: {
        instruction: () => cpu.instruction.BIT_b_r(2, "B"),
      },

      // BIT 2, C
      0x51: {
        instruction: () => cpu.instruction.BIT_b_r(2, "C"),
      },

      // BIT 2, D
      0x52: {
        instruction: () => cpu.instruction.BIT_b_r(2, "D"),
      },

      // BIT 2, E
      0x53: {
        instruction: () => cpu.instruction.BIT_b_r(2, "E"),
      },

      // BIT 2, H
      0x54: {
        instruction: () => cpu.instruction.BIT_b_r(2, "H"),
      },

      // BIT 2, L
      0x55: {
        instruction: () => cpu.instruction.BIT_b_r(2, "L"),
      },

      // BIT 2, (HL)
      0x56: {
        instruction: () => cpu.instruction.BIT_b_r(2, "HL"),
        cycles: 16,
      },

      // BIT 2, A
      0x57: {
        instruction: () => cpu.instruction.BIT_b_r(2, "A"),
      },

      // BIT 3, B
      0x58: {
        instruction: () => cpu.instruction.BIT_b_r(3, "B"),
      },

      // BIT 3, C
      0x59: {
        instruction: () => cpu.instruction.BIT_b_r(3, "C"),
      },

      // BIT 3, D
      0x5a: {
        instruction: () => cpu.instruction.BIT_b_r(3, "D"),
      },

      // BIT 3, E
      0x5b: {
        instruction: () => cpu.instruction.BIT_b_r(3, "E"),
      },

      // BIT 3, H
      0x5c: {
        instruction: () => cpu.instruction.BIT_b_r(3, "H"),
      },

      // BIT 3, L
      0x5d: {
        instruction: () => cpu.instruction.BIT_b_r(3, "L"),
      },

      // BIT 3, (HL)
      0x5e: {
        instruction: () => cpu.instruction.BIT_b_r(3, "HL"),
        cycles: 16,
      },

      // BIT 3, A
      0x5f: {
        instruction: () => cpu.instruction.BIT_b_r(3, "A"),
      },

      // BIT 4, B
      0x60: {
        instruction: () => cpu.instruction.BIT_b_r(4, "B"),
      },

      // BIT 4, C
      0x61: {
        instruction: () => cpu.instruction.BIT_b_r(4, "C"),
      },

      // BIT 4, D
      0x62: {
        instruction: () => cpu.instruction.BIT_b_r(4, "D"),
      },

      // BIT 4, E
      0x63: {
        instruction: () => cpu.instruction.BIT_b_r(4, "E"),
      },

      // BIT 4, H
      0x64: {
        instruction: () => cpu.instruction.BIT_b_r(4, "H"),
      },

      // BIT 4, L
      0x65: {
        instruction: () => cpu.instruction.BIT_b_r(4, "L"),
      },

      // BIT 4, (HL)
      0x66: {
        instruction: () => cpu.instruction.BIT_b_r(4, "HL"),
        cycles: 16,
      },

      // BIT 4, A
      0x67: {
        instruction: () => cpu.instruction.BIT_b_r(4, "A"),
      },

      // BIT 5, B
      0x68: {
        instruction: () => cpu.instruction.BIT_b_r(5, "B"),
      },

      // BIT 5, C
      0x69: {
        instruction: () => cpu.instruction.BIT_b_r(5, "C"),
      },

      // BIT 5, D
      0x6a: {
        instruction: () => cpu.instruction.BIT_b_r(5, "D"),
      },

      // BIT 5, E
      0x6b: {
        instruction: () => cpu.instruction.BIT_b_r(5, "E"),
      },

      // BIT 5, H
      0x6c: {
        instruction: () => cpu.instruction.BIT_b_r(5, "H"),
      },

      // BIT 5, L
      0x6d: {
        instruction: () => cpu.instruction.BIT_b_r(5, "L"),
      },

      // BIT 5, (HL)
      0x6e: {
        instruction: () => cpu.instruction.BIT_b_r(5, "HL"),
        cycles: 16,
      },

      // BIT 5, A
      0x6f: {
        instruction: () => cpu.instruction.BIT_b_r(5, "A"),
      },

      // BIT 6, B
      0x70: {
        instruction: () => cpu.instruction.BIT_b_r(6, "B"),
      },

      // BIT 6, C
      0x71: {
        instruction: () => cpu.instruction.BIT_b_r(6, "C"),
      },

      // BIT 6, D
      0x72: {
        instruction: () => cpu.instruction.BIT_b_r(6, "D"),
      },

      // BIT 6, E
      0x73: {
        instruction: () => cpu.instruction.BIT_b_r(6, "E"),
      },

      // BIT 6, H
      0x74: {
        instruction: () => cpu.instruction.BIT_b_r(6, "H"),
      },

      // BIT 6, L
      0x75: {
        instruction: () => cpu.instruction.BIT_b_r(6, "L"),
      },

      // BIT 6, (HL)
      0x76: {
        instruction: () => cpu.instruction.BIT_b_r(6, "HL"),
        cycles: 16,
      },

      // BIT 6, A
      0x77: {
        instruction: () => cpu.instruction.BIT_b_r(6, "A"),
      },

      // BIT 7, B
      0x78: {
        instruction: () => cpu.instruction.BIT_b_r(7, "B"),
      },

      // BIT 7, C
      0x79: {
        instruction: () => cpu.instruction.BIT_b_r(7, "C"),
      },

      // BIT 7, D
      0x7a: {
        instruction: () => cpu.instruction.BIT_b_r(7, "D"),
      },

      // BIT 7, E
      0x7b: {
        instruction: () => cpu.instruction.BIT_b_r(7, "E"),
      },

      // BIT 7, H
      0x7c: {
        instruction: () => cpu.instruction.BIT_b_r(7, "H"),
      },

      // BIT 7, L
      0x7d: {
        instruction: () => cpu.instruction.BIT_b_r(7, "L"),
      },

      // BIT 7, (HL)
      0x7e: {
        instruction: () => cpu.instruction.BIT_b_r(7, "HL"),
        cycles: 16,
      },

      // BIT 7, A
      0x7f: {
        instruction: () => cpu.instruction.BIT_b_r(7, "A"),
      },

      // RES 0, B
      0x80: {
        instruction: () => cpu.instruction.RES_b_r(0, "B"),
      },

      // RES 0, C
      0x81: {
        instruction: () => cpu.instruction.RES_b_r(0, "C"),
      },

      // RES 0, D
      0x82: {
        instruction: () => cpu.instruction.RES_b_r(0, "D"),
      },

      // RES 0, E
      0x83: {
        instruction: () => cpu.instruction.RES_b_r(0, "E"),
      },

      // RES 0, H
      0x84: {
        instruction: () => cpu.instruction.RES_b_r(0, "H"),
      },

      // RES 0, L
      0x85: {
        instruction: () => cpu.instruction.RES_b_r(0, "L"),
      },

      // RES 0, (HL)
      0x86: {
        instruction: () => cpu.instruction.RES_b_r(0, "HL"),
        cycles: 16,
      },

      // RES 0, A
      0x87: {
        instruction: () => cpu.instruction.RES_b_r(0, "A"),
      },

      // RES 1, B
      0x88: {
        instruction: () => cpu.instruction.RES_b_r(1, "B"),
      },

      // RES 1, C
      0x89: {
        instruction: () => cpu.instruction.RES_b_r(1, "C"),
      },

      // RES 1, D
      0x8a: {
        instruction: () => cpu.instruction.RES_b_r(1, "D"),
      },

      // RES 1, E
      0x8b: {
        instruction: () => cpu.instruction.RES_b_r(1, "E"),
      },

      // RES 1, H
      0x8c: {
        instruction: () => cpu.instruction.RES_b_r(1, "H"),
      },

      // RES 1, L
      0x8d: {
        instruction: () => cpu.instruction.RES_b_r(1, "L"),
      },

      // RES 1, (HL)
      0x8e: {
        instruction: () => cpu.instruction.RES_b_r(1, "HL"),
        cycles: 16,
      },

      // RES 1, A
      0x8f: {
        instruction: () => cpu.instruction.RES_b_r(1, "A"),
      },

      // RES 2, B
      0x90: {
        instruction: () => cpu.instruction.RES_b_r(2, "B"),
      },

      // RES 2, C
      0x91: {
        instruction: () => cpu.instruction.RES_b_r(2, "C"),
      },

      // RES 2, D
      0x92: {
        instruction: () => cpu.instruction.RES_b_r(2, "D"),
      },

      // RES 2, E
      0x93: {
        instruction: () => cpu.instruction.RES_b_r(2, "E"),
      },

      // RES 2, H
      0x94: {
        instruction: () => cpu.instruction.RES_b_r(2, "H"),
      },

      // RES 2, L
      0x95: {
        instruction: () => cpu.instruction.RES_b_r(2, "L"),
      },

      // RES 2, (HL)
      0x96: {
        instruction: () => cpu.instruction.RES_b_r(2, "HL"),
        cycles: 16,
      },

      // RES 2, A
      0x97: {
        instruction: () => cpu.instruction.RES_b_r(2, "A"),
      },

      // RES 3, B
      0x98: {
        instruction: () => cpu.instruction.RES_b_r(3, "B"),
      },

      // RES 3, C
      0x99: {
        instruction: () => cpu.instruction.RES_b_r(3, "C"),
      },

      // RES 3, D
      0x9a: {
        instruction: () => cpu.instruction.RES_b_r(3, "D"),
      },

      // RES 3, E
      0x9b: {
        instruction: () => cpu.instruction.RES_b_r(3, "E"),
      },

      // RES 3, H
      0x9c: {
        instruction: () => cpu.instruction.RES_b_r(3, "H"),
      },

      // RES 3, L
      0x9d: {
        instruction: () => cpu.instruction.RES_b_r(3, "L"),
      },

      // RES 3, (HL)
      0x9e: {
        instruction: () => cpu.instruction.RES_b_r(3, "HL"),
        cycles: 16,
      },

      // RES 3, A
      0x9f: {
        instruction: () => cpu.instruction.RES_b_r(3, "A"),
      },

      // RES 4, B
      0xa0: {
        instruction: () => cpu.instruction.RES_b_r(4, "B"),
      },

      // RES 4, C
      0xa1: {
        instruction: () => cpu.instruction.RES_b_r(4, "C"),
      },

      // RES 4, D
      0xa2: {
        instruction: () => cpu.instruction.RES_b_r(4, "D"),
      },

      // RES 4, E
      0xa3: {
        instruction: () => cpu.instruction.RES_b_r(4, "E"),
      },

      // RES 4, H
      0xa4: {
        instruction: () => cpu.instruction.RES_b_r(4, "H"),
      },

      // RES 4, L
      0xa5: {
        instruction: () => cpu.instruction.RES_b_r(4, "L"),
      },

      // RES 4, (HL)
      0xa6: {
        instruction: () => cpu.instruction.RES_b_r(4, "HL"),
        cycles: 16,
      },

      // RES 4, A
      0xa7: {
        instruction: () => cpu.instruction.RES_b_r(4, "A"),
      },

      // RES 5, B
      0xa8: {
        instruction: () => cpu.instruction.RES_b_r(5, "B"),
      },

      // RES 5, C
      0xa9: {
        instruction: () => cpu.instruction.RES_b_r(5, "C"),
      },

      // RES 5, D
      0xaa: {
        instruction: () => cpu.instruction.RES_b_r(5, "D"),
      },

      // RES 5, E
      0xab: {
        instruction: () => cpu.instruction.RES_b_r(5, "E"),
      },

      // RES 5, H
      0xac: {
        instruction: () => cpu.instruction.RES_b_r(5, "H"),
      },

      // RES 5, L
      0xad: {
        instruction: () => cpu.instruction.RES_b_r(5, "L"),
      },

      // RES 5, (HL)
      0xae: {
        instruction: () => cpu.instruction.RES_b_r(5, "HL"),
        cycles: 16,
      },

      // RES 5, A
      0xaf: {
        instruction: () => cpu.instruction.RES_b_r(5, "A"),
      },

      // RES 6, B
      0xb0: {
        instruction: () => cpu.instruction.RES_b_r(6, "B"),
      },

      // RES 6, C
      0xb1: {
        instruction: () => cpu.instruction.RES_b_r(6, "C"),
      },

      // RES 6, D
      0xb2: {
        instruction: () => cpu.instruction.RES_b_r(6, "D"),
      },

      // RES 6, E
      0xb3: {
        instruction: () => cpu.instruction.RES_b_r(6, "E"),
      },

      // RES 6, H
      0xb4: {
        instruction: () => cpu.instruction.RES_b_r(6, "H"),
      },

      // RES 6, L
      0xb5: {
        instruction: () => cpu.instruction.RES_b_r(6, "L"),
      },

      // RES 6, (HL)
      0xb6: {
        instruction: () => cpu.instruction.RES_b_r(6, "HL"),
        cycles: 16,
      },

      // RES 6, A
      0xb7: {
        instruction: () => cpu.instruction.RES_b_r(6, "A"),
      },

      // RES 7, B
      0xb8: {
        instruction: () => cpu.instruction.RES_b_r(7, "B"),
      },

      // RES 7, C
      0xb9: {
        instruction: () => cpu.instruction.RES_b_r(7, "C"),
      },

      // RES 7, D
      0xba: {
        instruction: () => cpu.instruction.RES_b_r(7, "D"),
      },

      // RES 7, E
      0xbb: {
        instruction: () => cpu.instruction.RES_b_r(7, "E"),
      },

      // RES 7, H
      0xbc: {
        instruction: () => cpu.instruction.RES_b_r(7, "H"),
      },

      // RES 7, L
      0xbd: {
        instruction: () => cpu.instruction.RES_b_r(7, "L"),
      },

      // RES 7, (HL)
      0xbe: {
        instruction: () => cpu.instruction.RES_b_r(7, "HL"),
        cycles: 16,
      },

      // RES 7, A
      0xbf: {
        instruction: () => cpu.instruction.RES_b_r(7, "A"),
      },

      // SET 0, B
      0xc0: {
        instruction: () => cpu.instruction.SET_b_r(0, "B"),
      },

      // SET 0, C
      0xc1: {
        instruction: () => cpu.instruction.SET_b_r(0, "C"),
      },

      // SET 0, D
      0xc2: {
        instruction: () => cpu.instruction.SET_b_r(0, "D"),
      },

      // SET 0, E
      0xc3: {
        instruction: () => cpu.instruction.SET_b_r(0, "E"),
      },

      // SET 0, H
      0xc4: {
        instruction: () => cpu.instruction.SET_b_r(0, "H"),
      },

      // SET 0, L
      0xc5: {
        instruction: () => cpu.instruction.SET_b_r(0, "L"),
      },

      // SET 0, (HL)
      0xc6: {
        instruction: () => cpu.instruction.SET_b_r(0, "HL"),
        cycles: 16,
      },

      // SET 0, A
      0xc7: {
        instruction: () => cpu.instruction.SET_b_r(0, "A"),
      },

      // SET 1, B
      0xc8: {
        instruction: () => cpu.instruction.SET_b_r(1, "B"),
      },

      // SET 1, C
      0xc9: {
        instruction: () => cpu.instruction.SET_b_r(1, "C"),
      },

      // SET 1, D
      0xca: {
        instruction: () => cpu.instruction.SET_b_r(1, "D"),
      },

      // SET 1, E
      0xcb: {
        instruction: () => cpu.instruction.SET_b_r(1, "E"),
      },

      // SET 1, H
      0xcc: {
        instruction: () => cpu.instruction.SET_b_r(1, "H"),
      },

      // SET 1, L
      0xcd: {
        instruction: () => cpu.instruction.SET_b_r(1, "L"),
      },

      // SET 1, (HL)
      0xce: {
        instruction: () => cpu.instruction.SET_b_r(1, "HL"),
        cycles: 16,
      },

      // SET 1, A
      0xcf: {
        instruction: () => cpu.instruction.SET_b_r(1, "A"),
      },

      // SET 2, B
      0xd0: {
        instruction: () => cpu.instruction.SET_b_r(2, "B"),
      },

      // SET 2, C
      0xd1: {
        instruction: () => cpu.instruction.SET_b_r(2, "C"),
      },

      // SET 2, D
      0xd2: {
        instruction: () => cpu.instruction.SET_b_r(2, "D"),
      },

      // SET 2, E
      0xd3: {
        instruction: () => cpu.instruction.SET_b_r(2, "E"),
      },

      // SET 2, H
      0xd4: {
        instruction: () => cpu.instruction.SET_b_r(2, "H"),
      },

      // SET 2, L
      0xd5: {
        instruction: () => cpu.instruction.SET_b_r(2, "L"),
      },

      // SET 2, (HL)
      0xd6: {
        instruction: () => cpu.instruction.SET_b_r(2, "HL"),
        cycles: 16,
      },

      // SET 2, A
      0xd7: {
        instruction: () => cpu.instruction.SET_b_r(2, "A"),
      },

      // SET 3, B
      0xd8: {
        instruction: () => cpu.instruction.SET_b_r(3, "B"),
      },

      // SET 3, C
      0xd9: {
        instruction: () => cpu.instruction.SET_b_r(3, "C"),
      },

      // SET 3, D
      0xda: {
        instruction: () => cpu.instruction.SET_b_r(3, "D"),
      },

      // SET 3, E
      0xdb: {
        instruction: () => cpu.instruction.SET_b_r(3, "E"),
      },

      // SET 3, H
      0xdc: {
        instruction: () => cpu.instruction.SET_b_r(3, "H"),
      },

      // SET 3, L
      0xdd: {
        instruction: () => cpu.instruction.SET_b_r(3, "L"),
      },

      // SET 3, (HL)
      0xde: {
        instruction: () => cpu.instruction.SET_b_r(3, "HL"),
        cycles: 16,
      },

      // SET 3, A
      0xdf: {
        instruction: () => cpu.instruction.SET_b_r(3, "A"),
      },

      // SET 4, B
      0xe0: {
        instruction: () => cpu.instruction.SET_b_r(4, "B"),
      },

      // SET 4, C
      0xe1: {
        instruction: () => cpu.instruction.SET_b_r(4, "C"),
      },

      // SET 4, D
      0xe2: {
        instruction: () => cpu.instruction.SET_b_r(4, "D"),
      },

      // SET 4, E
      0xe3: {
        instruction: () => cpu.instruction.SET_b_r(4, "E"),
      },

      // SET 4, H
      0xe4: {
        instruction: () => cpu.instruction.SET_b_r(4, "H"),
      },

      // SET 4, L
      0xe5: {
        instruction: () => cpu.instruction.SET_b_r(4, "L"),
      },

      // SET 4, (HL)
      0xe6: {
        instruction: () => cpu.instruction.SET_b_r(4, "HL"),
        cycles: 16,
      },

      // SET 4, A
      0xe7: {
        instruction: () => cpu.instruction.SET_b_r(4, "A"),
      },

      // SET 5, B
      0xe8: {
        instruction: () => cpu.instruction.SET_b_r(5, "B"),
      },

      // SET 5, C
      0xe9: {
        instruction: () => cpu.instruction.SET_b_r(5, "C"),
      },

      // SET 5, D
      0xea: {
        instruction: () => cpu.instruction.SET_b_r(5, "D"),
      },

      // SET 5, E
      0xeb: {
        instruction: () => cpu.instruction.SET_b_r(5, "E"),
      },

      // SET 5, H
      0xec: {
        instruction: () => cpu.instruction.SET_b_r(5, "H"),
      },

      // SET 5, L
      0xed: {
        instruction: () => cpu.instruction.SET_b_r(5, "L"),
      },

      // SET 5, (HL)
      0xee: {
        instruction: () => cpu.instruction.SET_b_r(5, "HL"),
        cycles: 16,
      },

      // SET 5, A
      0xef: {
        instruction: () => cpu.instruction.SET_b_r(5, "A"),
      },

      // SET 6, B
      0xf0: {
        instruction: () => cpu.instruction.SET_b_r(6, "B"),
      },

      // SET 6, C
      0xf1: {
        instruction: () => cpu.instruction.SET_b_r(6, "C"),
      },

      // SET 6, D
      0xf2: {
        instruction: () => cpu.instruction.SET_b_r(6, "D"),
      },

      // SET 6, E
      0xf3: {
        instruction: () => cpu.instruction.SET_b_r(6, "E"),
      },

      // SET 6, H
      0xf4: {
        instruction: () => cpu.instruction.SET_b_r(6, "H"),
      },

      // SET 6, L
      0xf5: {
        instruction: () => cpu.instruction.SET_b_r(6, "L"),
      },

      // SET 6, (HL)
      0xf6: {
        instruction: () => cpu.instruction.SET_b_r(6, "HL"),
        cycles: 16,
      },

      // SET 6, A
      0xf7: {
        instruction: () => cpu.instruction.SET_b_r(6, "A"),
      },

      // SET 7, B
      0xf8: {
        instruction: () => cpu.instruction.SET_b_r(7, "B"),
      },

      // SET 7, C
      0xf9: {
        instruction: () => cpu.instruction.SET_b_r(7, "C"),
      },

      // SET 7, D
      0xfa: {
        instruction: () => cpu.instruction.SET_b_r(7, "D"),
      },

      // SET 7, E
      0xfb: {
        instruction: () => cpu.instruction.SET_b_r(7, "E"),
      },

      // SET 7, H
      0xfc: {
        instruction: () => cpu.instruction.SET_b_r(7, "H"),
      },

      // SET 7, L
      0xfd: {
        instruction: () => cpu.instruction.SET_b_r(7, "L"),
      },

      // SET 7, (HL)
      0xfe: {
        instruction: () => cpu.instruction.SET_b_r(7, "HL"),
        cycles: 16,
      },

      // SET 7, A
      0xff: {
        instruction: () => cpu.instruction.SET_b_r(7, "A"),
      },
    };
  }
}

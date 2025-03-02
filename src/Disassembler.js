export class Disassembler {
  constructor(cpu) {
    this.cpu = cpu;
  }

  disassemble(romSize) {
    let opcode, fetch, instruction, hexAddr;

    for (let i = 0; i < romSize; i++) {
      opcode = this.cpu.mmu.rom[i];
      fetch = this.cpu.instructionTable[opcode];
      hexAddr = i.toString(16).toUpperCase().padStart(4, "0");

      if (!fetch) {
        console.log(
          `${hexAddr} : UNKNOWN OPCODE ${opcode
            .toString(16)
            .toUpperCase()
            .padStart(2, "0")}`
        );

        continue;
      }

      instruction = fetch.mnemonic;

      if (instruction.length > 1 && opcode !== 0xcb) {
        // Get immediate operands
        instruction = instruction.map((operand) => {
          let immediate;

          if (operand === "d8" || operand === "a8") {
            // 1 byte immediate operand
            immediate = this.cpu.mmu.rom[i + 1].toString(16);
          }

          if (operand === "d16" || operand === "a16") {
            // 2 byte immediate operand
            const low = this.cpu.mmu.rom[i + 1].toString(16).padStart(2, "0");
            const high = this.cpu.mmu.rom[i + 2].toString(16).padStart(2, "0");

            immediate = `${high}${low}`;
          }

          if (operand === "r8") {
            // 1 signed byte operand
            immediate = this.cpu
              .getSignedValue(this.cpu.mmu.rom[i + 1])
              .toString(16);
          }

          return immediate ? `$${immediate.toUpperCase().padStart(2, "0")}` : operand;
        });
      }

      console.log(`${hexAddr} : ${instruction.join(" ")}`);
      if (opcode === 0xcb)
        console.log(
          `${(i + 1)
            .toString(16)
            .toUpperCase()
            .padStart(4, "0")} : ${this.cpu.mmu.rom[i + 1]
            .toString(16)
            .padStart(2, "0")
            .toUpperCase()}`
        );

      if (fetch) i += fetch.length - 1;
    }
  }
}

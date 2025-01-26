import { MMU } from "../MMU.js";
import { CPU } from "../CPU.js";

let cpu = new CPU();
let mmu = new MMU(cpu, null);

/* ---------- TEST WRITE & READ BYTE ---------- */
console.log("TEST WRITE & READ BYTE");

// Read from BIOS (0000-00FF)
console.log("\tRead from BIOS (0000-00FF). inbios flag enabled");
mmu.bios[0x20] = 0xaa;
mmu.rom[0x20] = 0xbb;
console.log(
  `\tbios[0x20]=${mmu.bios[0x20].toString(16)}; inbios_flag=${mmu.inbios}`
);
console.log(`\treadByte(0x20)=${mmu.readByte(0x20).toString(16)}`);

console.log("\n");

// Read an address >= 0x0100 when PC=0x100
console.log("\tRead an address >= 0x0100 when PC=0x100. inbios flag enabled");
mmu.rom[0x125] = 0xac;
console.log(
  `\trom[0x125]=${mmu.rom[0x125].toString(16)}; inbios_flag=${
    mmu.inbios
  }; PC=0x${cpu.pc.toString(16)}`
);
console.log(`\treadByte(0x125)=${mmu.readByte(0x125).toString(16)}`);
console.log(
  `\trom[0x20]=${mmu.rom[0x20].toString(16)}; inbios_flag=${mmu.inbios}`
);
console.log(`\treadByte(0x20)=${mmu.readByte(0x20).toString(16)}`);

console.log("\n");

// Read from external RAM (A000-BFFF)
console.log("\tWrite & Read from external RAM (A000-BFFF)");
mmu.writeByte(0xa500, 0xea);
console.log(`\twriteByte(0xa500, 0xea)`);
console.log(
  `\treadByte(0x${(0xa500).toString(16)})=${mmu.readByte(0xa500).toString(16)}`
);

console.log("\n");

// Read from working RAM (C000-DFFF)
console.log("\tWrite & Read from working RAM (C000-DFFF)");
mmu.writeByte(0xc500, 0xc5);
console.log(`\twriteByte(0xc500, 0xc5)`);
console.log(
  `\treadByte(0x${(0xc500).toString(16)})=${mmu.readByte(0xc500).toString(16)}`
);

console.log("\n");

// Read from echo RAM (E000-FDFF)
console.log("\tWrite & Read from echo RAM (E000-FDFF)");
mmu.writeByte(0xf555, 0xbe);
console.log(`\twriteByte(0xf555, 0xbe)`);
console.log(
  `\treadByte(0x${(0xf555).toString(16)})=${mmu.readByte(0xf555).toString(16)}`
);

console.log("\n");

// Read from high RAM (FF80-FFFE)
console.log("\tWrite & Read from high RAM (FF80-FFFE)");
mmu.writeByte(0xffa9, 0xbf);
console.log(`\twriteByte(0xffa9, 0xbe)`);
console.log(
  `\treadByte(0x${(0xffa9).toString(16)})=${mmu.readByte(0xffa9).toString(16)}`
);

console.log("\n");

/* ---------- TEST WRITE & READ WORD ---------- */
console.log("TEST WRITE & READ WORD");
mmu.writeWord(0xc500, 0xabcd);
console.log(`\twriteWord(0xc500, 0xabcd)`);
console.log(
    `\treadWord(0x${(0xc500).toString(16)})=${mmu.readWord(0xc500).toString(16)}`
  );

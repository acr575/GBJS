import { MMU } from "../MMU.js";
import { CPU } from "../CPU.js";

let cpu = new CPU();
let mmu = new MMU(cpu, null);

/* ---------- TEST READ BYTE ---------- */
console.log("TEST READ BYTE");

// Read from BIOS (0000-00FF)
console.log("\tRead from BIOS (0000-00FF). inbios flag enabled");
mmu.bios[0x20] = 0xaa;
mmu.rom[0x20] = 0xbb;
console.log(`\tbios[0x20]=${mmu.bios[0x20].toString(16)}; inbios_flag=${mmu.inbios}`);
console.log(`\treadByte(0x20)=${mmu.readByte(0x20).toString(16)}`);

console.log("\n");

// Read an address >= 0x0100 when PC=0x100
console.log("\tRead an address >= 0x0100 when PC=0x100. inbios flag enabled");
mmu.rom[0x125] = 0xac;
console.log(`\trom[0x125]=${mmu.rom[0x125].toString(16)}; inbios_flag=${mmu.inbios}; PC=0x${cpu.pc.toString(16)}`);
console.log(`\treadByte(0x125)=${mmu.readByte(0x125).toString(16)}`);
console.log(`\trom[0x20]=${mmu.rom[0x20].toString(16)}; inbios_flag=${mmu.inbios}`);
console.log(`\treadByte(0x20)=${mmu.readByte(0x20).toString(16)}`);



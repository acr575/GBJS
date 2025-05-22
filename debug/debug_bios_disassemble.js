import { CPU } from "../src/CPU.js";
import { Disassembler } from "../src/Disassembler.js";

const cpu = new CPU();
const disassembler = new Disassembler(cpu);

cpu.pc = 0;
cpu.updateDebugBox();
cpu.mmu.setupAddressInput();

// BIOS expect nintendo logo to be in memory
const nintendoLogo = [
  0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d, 0x00, 0x0b, 0x03, 0x73, 0x00, 0x83, 0x00,
  0x0c, 0x00, 0x0d, 0x00, 0x08, 0x11, 0x1f, 0x88, 0x89, 0x00, 0x0e, 0xdc, 0xcc,
  0x6e, 0xe6, 0xdd, 0xdd, 0xd9, 0x99, 0xbb, 0xbb, 0x67, 0x63, 0x6e, 0x0e, 0xec,
  0xcc, 0xdd, 0xdc, 0x99, 0x9f, 0xbb, 0xb9, 0x33, 0x3e,
];

// Check MD5 BIOS hash
function calcularMD5(uint8Array) {
  let hexString = Array.from(uint8Array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  let md5 = CryptoJS.MD5(CryptoJS.enc.Hex.parse(hexString)).toString();

  console.log("MD5: ", md5);

  if (md5 === "32fbbd84168d3482956eb3c5051637f5") {
    console.log("✅ BIOS correct hash");
  } else {
    throw new Error("❌ BIOS incorrect hash");
  }
}

document
  .getElementById("fileInput")
  .addEventListener("change", async (event) => {
    const file = event.target.files[0];

    try {
      const romSize = await cpu.mmu.load(file);
      const biggerRom = new Uint8Array(romSize + 1000);
      biggerRom.set(cpu.mmu.cartridge);
      cpu.mmu.cartridge = biggerRom;

      // Check if BIOS is legit
      // const extractedBios = cpu.mmu.rom.slice(0, 0x100);
      // calcularMD5(extractedBios);

      // Load Nintendo logo
      let memAddr = 0x104;
      for (let i = 0; i < nintendoLogo.length; i++) {
        cpu.mmu.cartridge[memAddr++] = nintendoLogo[i];
      }

      // Value to bypass checksum
      cpu.mmu.cartridge[0x14d] = 0xe7;

      // Disassemble
      // disassembler.disassemble(romSize);

      // Start emulation
      // cpu.emulateFrame();

      const frameRate = 1000 / 59.7; // ms

      // Emulate frames at 59.7 Hz
      setInterval(() => {
        cpu.emulateFrame();
      }, frameRate);

    } catch (error) {
      console.error(error);
    }
  });

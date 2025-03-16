import { CPU } from "../src/CPU.js";
import { readFileSync, createWriteStream } from "fs";

const stream = createWriteStream(
  "C:/Users/David/Desktop/TFG/herramientas_auxiliares/gameboy-doctor/my_logs/log.txt",
  { flags: "w" }
);
const cpu = new CPU(stream);
cpu.init();

const tests = [
  "",
  "01-special.gb",
  "02-interrupts.gb",
  "03-op sp,hl.gb",
  "04-op r,imm.gb",
  "05-op rp.gb",
  "06-ld r,r.gb",
  "07-jr,jp,call,ret,rst.gb",
  "08-misc instrs.gb",
  "09-op r,r.gb",
  "10-bit ops.gb",
  "11-op a,(hl).gb",
];

try {
  const file = readFileSync(`./debug/individual/${tests[11]}`);
  cpu.mmu.load(file);
} catch (error) {
  console.log("Error al leer el archivo: " + error);
}

const frameRate = 1000 / 59.7;

setInterval(() => {
  cpu.emulateFrame();
}, frameRate);

import { CPU } from "../src/CPU.js";
import { readFileSync, createWriteStream } from "fs";

const stream = createWriteStream("log.txt", { flags: "w" });
const cpu = new CPU(stream);
cpu.init();

try {
  const file = readFileSync("./debug/individual/01-special.gb");
  cpu.mmu.load(file);
} catch (error) {
  console.log("Error al leer el archivo: " + error);
}

const frameRate = 1000 / 59.7;

setInterval(() => {
  cpu.emulateFrame();
}, frameRate);

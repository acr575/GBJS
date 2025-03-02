import { CPU } from "../../src/CPU.js";

const cpu = new CPU();
const gpu = cpu.gpu;

const scy = (val) => {
  return !val ? cpu.mmu.readByte(gpu.scy) : cpu.mmu.writeByte(gpu.scy, val);
};

const scx = (val) => {
  return !val ? cpu.mmu.readByte(gpu.scx) : cpu.mmu.writeByte(gpu.scx, val);
};

const wx = (val) => {
  return !val ? cpu.mmu.readByte(gpu.wy) : cpu.mmu.writeByte(gpu.wy, val);
};

const wy = (val) => {
  return !val ? cpu.mmu.readByte(gpu.wx) : cpu.mmu.writeByte(gpu.wx, val);
};

const ly = (val) => {
  return !val ? cpu.mmu.readByte(gpu.ly) : gpu.setLY(val);
};

const lcdc = (bit, set) => {
  if (bit == undefined) return cpu.mmu.readByte(gpu.lcdc);

  let lcdc = cpu.mmu.readByte(gpu.lcdc);
  lcdc |= set << bit;
  cpu.mmu.writeByte(gpu.lcdc, lcdc);
};

const lcdcToString = () => {
  const currentLcdc = lcdc();
  const lcdcString = currentLcdc.toString(2).padStart(8, "0");
  const lcdcBits = [
    "BG & Window enable",
    "OBJ enable",
    "OBJ size",
    "BG tile map",
    "BG & Window tiles",
    "Window enable",
    "Window tile map",
    "LCD & PPU enable",
  ];
  let lcdcSringIndex = 7;

  console.log("LCDC: ");
  for (let i = 0; i < 8; i++) {
    console.log(`\t${i} ${lcdcBits[i]} = ${lcdcString[lcdcSringIndex]}`);
    lcdcSringIndex--;
  }
};

const yPos = () => {
  const currentLcdc = lcdc();

  if ((currentLcdc >> 5) & 1 && wy() <= ly()) return ly() - wy();
  else return scy() + ly();
};

const tileRow = () => {
  return (yPos() / 8) * 32;
};

// wy(24);
// wx(40);
scy(0);
scx(159);
// lcdc(5, 1); // Window enable
lcdc(4, 1); // Select addr. 0x8000 tile data
lcdc(3, 1); // Select addrc 0x9c000 background memory
// ly(42);

console.log(`SCY: ${scy()}; SCX: ${scx()}`);
console.log(`WY: ${wx()}; WX: ${wy()}`);
console.log(`LY: ${ly()}`);
console.log(`yPos: ${yPos()}`);
console.log(`tileRow: ${tileRow()}`);

console.log("\n");

lcdcToString();

let tileSet1 = [
  // Character tile
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00,

  0x38, 0x38, 0x44, 0x44, 0x44, 0x44, 0x3b, 0x3b, 0x12, 0x12, 0xff, 0xff, 0x2a,
  0x2a, 0x44, 0x44,
];

let tileIndex = 0;
let tileAddress = 0x8000; // VRAM base address
let tileMapAddress = 0x9c00;
let bytesToTile = 0;

cpu.mmu.writeByte(0xff47, 0b11100100); // BG palette
cpu.mmu.writeByte(0xff48, 0b11100100); // OBP0 palette

for (let i = 0; i < tileSet1.length; i++) {
  cpu.mmu.writeByte(tileAddress + bytesToTile, tileSet1[i]);
  bytesToTile++;

  if (bytesToTile === 16) {
    cpu.mmu.writeByte(tileMapAddress + tileIndex, tileIndex);
    tileIndex++;
    tileAddress = 0x8000 + tileIndex * 16;
    bytesToTile = 0;
  }
}

// Character sprite
cpu.mmu.writeByte(0xfe00, 80);
cpu.mmu.writeByte(0xfe00 + 1, 80);
cpu.mmu.writeByte(0xfe00 + 2, 1);
cpu.mmu.writeByte(0xfe00 + 3, 0b00000000);

for (let i = 0; i < 144; i++) {
  gpu.setLY(i);
  gpu.renderTiles();
  gpu.renderSprites();
}

gpu.setLY(0);

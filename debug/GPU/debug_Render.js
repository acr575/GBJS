import { CPU } from "../../src/CPU.js";
import { resetBit, setBit, testBit } from "../../src/GameBoyUtils.js";

const cpu = new CPU();
const gpu = cpu.gpu;

const scy = (val) => {
  return !val ? cpu.mmu.readByte(gpu.scy) : cpu.mmu.writeByte(gpu.scy, val);
};

const scx = (val) => {
  return !val ? cpu.mmu.readByte(gpu.scx) : cpu.mmu.writeByte(gpu.scx, val);
};

const wy = (val) => {
  return !val ? cpu.mmu.readByte(gpu.wy) : cpu.mmu.writeByte(gpu.wy, val);
};

const wx = (val) => {
  return !val ? cpu.mmu.readByte(gpu.wx) : cpu.mmu.writeByte(gpu.wx, val);
};

const ly = (val) => {
  return !val ? cpu.mmu.readByte(gpu.ly) : gpu.setLY(val);
};

const lcdc = (bit, set) => {
  if (bit == undefined) return cpu.mmu.readByte(gpu.lcdc);

  let lcdc = cpu.mmu.readByte(gpu.lcdc);
  lcdc = set ? setBit(lcdc, bit) : resetBit(lcdc, bit);
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

wy(136);
wx(7);
scy(0);
scx(0);
lcdc(7, 1); // PPU enable
lcdc(6, 1); // Select addrs 0x9c000 window memory
lcdc(5, 1); // Window enable
lcdc(4, 1); // Select addr. 0x8000 tile data
lcdc(3, 1); // Select addrs 0x9c000 background memory
lcdc(1, 1); // Obj enable
lcdc(0, 1); // BG/Win enable

console.log(`SCY: ${scy()}; SCX: ${scx()}`);
console.log(`WY: ${wx()}; WX: ${wy()}`);
console.log(`LY: ${ly()}`);
console.log(`yPos: ${yPos()}`);
console.log(`tileRow: ${tileRow()}`);

console.log("\n");

lcdcToString();

let tiles = {
  // grass
  1: [
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x76, 0xff, 0x22,
    0xff, 0x00, 0xff, 0x00,
  ],
  // black
  2: [
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff,
  ],
  // 8x8 character
  3: [
    0x66, 0x66, 0x7e, 0x7e, 0x7e, 0x5a, 0xe7, 0xe7, 0xff, 0xff, 0xff, 0xff,
    0x7e, 0x7e, 0x24, 0x24,
  ],
  // 16x16 character 1 head
  4: [
    0x1c, 0x1c, 0x7e, 0x7e, 0xff, 0xfb, 0xff, 0xf5, 0xff, 0xa5, 0x7e, 0x00,
    0x66, 0x18, 0x7e, 0x7e,
  ],
  // 16x16 charater 1 body
  5: [
    0xff, 0xff, 0xff, 0xff, 0xff, 0x3c, 0xff, 0x3c, 0x7e, 0x7e, 0x66, 0x66,
    0x66, 0x66, 0xe7, 0xe7,
  ],
  // 16x16 character 2 head
  6: [
    0x03, 0x03, 0x07, 0x07, 0x1e, 0x1e, 0x3e, 0x3e, 0x7e, 0x7e, 0x7e, 0x7e,
    0x7e, 0x24, 0x7e, 0x00,
  ],
  // 16x16 charater 2 body
  7: [
    0x00, 0x7e, 0x18, 0x66, 0xc3, 0xff, 0xe7, 0xff, 0xef, 0xff, 0xff, 0xbd,
    0x7e, 0x7e, 0x7e, 0x7e,
  ],
  // ground 1
  8: [
    0xff, 0x00, 0xf5, 0x0a, 0xfb, 0x04, 0xbf, 0x40, 0x1f, 0xe0, 0x9f, 0x60,
    0xfd, 0x02, 0xf6, 0x09,
  ],
  // ground 2
  9: [
    0xff, 0x00, 0xdf, 0x20, 0xfb, 0x04, 0x7d, 0x82, 0xf7, 0x08, 0xff, 0x00,
    0xdc, 0x23, 0xfb, 0x04,
  ],
  // gray
  10: [
    0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00,
    0xff, 0x00, 0xff, 0x00,
  ],
  // U
  11: [
    0xff, 0xff, 0xbd, 0xbd, 0xbd, 0xbd, 0xbd, 0xbd, 0xbd, 0xbd, 0xbd, 0xbd,
    0xc3, 0xc3, 0xff, 0xff,
  ],
  // A
  12: [
    0xff, 0xff, 0xc3, 0xc3, 0xbd, 0xbd, 0xbd, 0xbd, 0x81, 0x81, 0xbd, 0xbd,
    0xbd, 0xbd, 0xff, 0xff,
  ],
  // L
  13: [
    0xff, 0xff, 0xbf, 0xbf, 0xbf, 0xbf, 0xbf, 0xbf, 0xbf, 0xbf, 0xbf, 0xbf,
    0x83, 0x83, 0xff, 0xff,
  ],
};

const x = 4;
const y = 4;
const charactersCoords = [
  // A
  [x + 3, y],
  [x + 2, y],
  [x + 1, y],
  [x, y + 1],
  [x + 2, y + 1],
  [x + 3, y],
  [x + 2, y],
  [x + 1, y],
  [x + 3, y + 2],
  [x + 2, y + 2],
  [x + 1, y + 2],

  // C
  [x + 2, y + 4],
  [x + 1, y + 4],
  [x, y + 5],
  [x, y + 6],
  [x + 3, y + 5],
  [x + 3, y + 6],

  // R
  [x + 3, y + 8],
  [x + 2, y + 8],
  [x + 1, y + 8],
  [x, y + 9],
  [x + 1, y + 10],
  [x + 2, y + 9],
  [x + 3, y + 10],
];

let tileAddress = 0x8000 + 16; // VRAM base address
let tileMapAddress = 0x9c00;

cpu.mmu.writeByte(0xff47, 0b11100100); // BG palette

// Fill VRAM
Object.entries(tiles).forEach(([id, tile]) => {
  tile.forEach((byte) => {
    cpu.mmu.writeByte(tileAddress++, byte);
  });
});

// Fill tilemap
const tileMapEnd = tileMapAddress + 1024;
for (let i = tileMapAddress; i < tileMapEnd; i++) {
  const offset = i - tileMapAddress;
  const row = Math.floor(offset / 32);
  const col = offset % 32;

  // U
  if (row == 0 && col == 17) cpu.mmu.writeByte(i, 11);
  // A
  if (row == 0 && col == 18) cpu.mmu.writeByte(i, 12);
  // L
  if (row == 0 && col == 19) cpu.mmu.writeByte(i, 13);

  // ACR
  if (charactersCoords.some((coord) => coord[0] == row && coord[1] == col))
    cpu.mmu.writeByte(i, 2);

  // Grass
  if (row == 13) cpu.mmu.writeByte(i, 1);

  // Ground
  if (row >= 14)
    cpu.mmu.writeByte(i, Math.floor(Math.random() * (9 - 8 + 1)) + 8);
}

// Sprites
cpu.mmu.writeByte(0xff48, 0b11100100); // OBP0 palette

// 8x8 character
cpu.mmu.writeByte(0xfe00, 112); // Y
cpu.mmu.writeByte(0xfe00 + 1, 120); // X
cpu.mmu.writeByte(0xfe00 + 2, 3); // Tile index
cpu.mmu.writeByte(0xfe00 + 3, 0b00000000); // Attributes

// 8x16 character 1
cpu.mmu.writeByte(0xfe04, 105); // Y
cpu.mmu.writeByte(0xfe04 + 1, 50); // X
cpu.mmu.writeByte(0xfe04 + 2, 4); // Tile index
cpu.mmu.writeByte(0xfe04 + 3, 0b00000000); // Attributes

// 8x16 character 1
cpu.mmu.writeByte(0xfe08, 105); // Y
cpu.mmu.writeByte(0xfe08 + 1, 130); // X
cpu.mmu.writeByte(0xfe08 + 2, 6); // Tile index
cpu.mmu.writeByte(0xfe08 + 3, 0b00000000); // Attributes

for (let i = 0; i < 144; i++) {
  gpu.setLY(i);
  if (i > 96 && i < 104) lcdc(2, 1); // 8x16
  else lcdc(2, 0);
  gpu.drawScanLine();
}

gpu.setLY(0);

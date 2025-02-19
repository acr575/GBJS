import { CPU } from "../src/CPU.js";

const cpu = new CPU();
const gpu = cpu.gpu;
cpu.mmu.writeByte(gpu.lyc, 0x20);
cpu.mmu.writeByte(gpu.lcdc, 0x80);

/* TEST setLCDStatus */
console.log("TEST setLCDStatus");

// scanLineCounter in mode 2 (>= 376 clock cycles to complete a line)
cpu.mmu.writeByte(gpu.stat, 0b01111110);
console.log(
  "  scanLineCounter in mode 2 (>= 376 clock cycles remaining to complete a line)"
);
console.log(
  `\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}; scanLineCounter: ${
    gpu.scanlineCounter
  }`
);
gpu.setLCDStatus();
console.log("\tsetLCDStatus()");
console.log(`\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}`);
console.log(`\tIF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`);

console.log("\n");

// scanLineCounter changes to mode 3 (>= 204 clock cycles remaining to complete a line)
gpu.scanlineCounter -= 80 + 172;
console.log(
  "  scanLineCounter changes to mode 3 (>= 204 clock cycles remaining to complete a line)"
);
console.log(
  `\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}; scanLineCounter: ${
    gpu.scanlineCounter
  }`
);
gpu.setLCDStatus();
console.log("\tsetLCDStatus()");
console.log(`\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}`);
console.log(`\tIF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`);

console.log("\n");

// scanLineCounter changes to mode 0 (< 204 clock cycles remaining to complete a line)
gpu.scanlineCounter -= 5;
console.log(
  "  scanLineCounter changes to mode 0 (< 204 clock cycles remaining to complete a line)"
);
console.log(
  `\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}; scanLineCounter: ${
    gpu.scanlineCounter
  }`
);
gpu.setLCDStatus();
console.log("\tsetLCDStatus()");
console.log(`\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}`);
console.log(`\tIF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`);

console.log("\n");

// LY == LYC: Request id 1 interrupt
gpu.setLY(0x20);
cpu.mmu.writeByte(cpu.if, 0);
console.log("  LY == LYC: Request id 1 interrupt");
console.log(`\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}`);
console.log(
  `\tLY: 0x${cpu.mmu.readByte(gpu.ly).toString(16)}; LYC: 0x${cpu.mmu
    .readByte(gpu.lyc)
    .toString(16)}; IF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`
);
gpu.setLCDStatus();
console.log("\tsetLCDStatus()");
console.log(`\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}`);
console.log(`\tIF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`);

console.log("\n");

// LCD is disabled
cpu.mmu.writeByte(gpu.stat, 0b01111110);
cpu.mmu.writeByte(gpu.lcdc, 0);
console.log("  LCD is disabled");
console.log(
  `\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}; scanLineCounter: ${
    gpu.scanlineCounter
  }; LY: 0x${cpu.mmu.readByte(gpu.ly).toString(16)}`
);
gpu.setLCDStatus();
console.log("\tsetLCDStatus()");
console.log(
  `\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}; scanLineCounter: ${
    gpu.scanlineCounter
  }; LY: 0x${cpu.mmu.readByte(gpu.ly).toString(16)}`
);

console.log("\n");

// In V-Blank: set mode to 1
console.log("  In V-Blank: set mode to 1");
cpu.mmu.writeByte(gpu.lcdc, 0x80);
gpu.setLY(144);
cpu.mmu.writeByte(gpu.stat, 0b01111110);
cpu.mmu.writeByte(cpu.if, 0);
console.log(
  `\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}; LY: ${cpu.mmu.readByte(
    gpu.ly
  )}; IF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`
);
gpu.setLCDStatus();
console.log("\tsetLCDStatus()");
console.log(
  `\tSTAT: 0b${cpu.mmu.readByte(gpu.stat).toString(2)}; LY: ${cpu.mmu.readByte(
    gpu.ly
  )}; IF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`
);

console.log("\n\n");

/* TEST updateGraphics */
console.log("TEST updateGraphics()");

// scanlineCounter > 0 after sub: No action
console.log("  scalineCounter > 0 after sub: No action");
console.log(`\tscanLineCounter: ${gpu.scanlineCounter}`);
console.log("\tupdateGraphics(16)");
gpu.updateGraphics(16);
console.log(`\tscanLineCounter: ${gpu.scanlineCounter}`);

console.log("\n");

// LY increments & LY == 144: Request interrupt
gpu.setLY(143);
console.log("  LY increments & LY == 144: Request interrupt");
console.log(`\tscanLineCounter: ${gpu.scanlineCounter}; LY: ${cpu.mmu.readByte(gpu.ly)}; IF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`);
console.log("\tupdateGraphics(445)");
gpu.updateGraphics(445);
console.log(`\tscanLineCounter: ${gpu.scanlineCounter}; LY: ${cpu.mmu.readByte(gpu.ly)}; IF: 0b${cpu.mmu.readByte(cpu.if).toString(2)}`);

console.log("\n");

// LY increments & LY > 153: Reset LY
gpu.setLY(153);
console.log("  LY increments & LY > 153: Draw scanline");
console.log(`\tscanLineCounter: ${gpu.scanlineCounter}; LY: ${cpu.mmu.readByte(gpu.ly)}`);
console.log("\tupdateGraphics(460)");
gpu.updateGraphics(460);
console.log(`\tscanLineCounter: ${gpu.scanlineCounter}; LY: ${cpu.mmu.readByte(gpu.ly)}`);

console.log("\n");

// LY increments & LY < 144: Draw scanline
console.log("  LY increments & LY < 144: Draw scanline");
console.log(`\tscanLineCounter: ${gpu.scanlineCounter}; LY: ${cpu.mmu.readByte(gpu.ly)}`);
console.log("\tupdateGraphics(460)");
gpu.updateGraphics(460);
console.log(`\tscanLineCounter: ${gpu.scanlineCounter}; LY: ${cpu.mmu.readByte(gpu.ly)}`);



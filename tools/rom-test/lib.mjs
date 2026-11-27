// Arnés headless para el núcleo de GBJS. No modifica el emulador:
// sustituye document/canvas/AudioContext y completa el puerto serie
// (los tests de Blargg y Mooneye esperan a que SC bit 7 baje).

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const capture = {
  frame: null,
  putCalls: 0,
  bytes: 0,
};

let shimInstalled = false;

export function installDomShim() {
  if (shimInstalled) return;
  shimInstalled = true;

  const canvas = {
    width: 160,
    height: 144,
    style: {},
    getContext() {
      return {
        canvas,
        imageSmoothingEnabled: false,
        fillStyle: "",
        font: "",
        textAlign: "",
        textBaseline: "",
        createImageData(w, h) {
          return {
            width: w,
            height: h,
            data: new Uint8ClampedArray(w * h * 4),
          };
        },
        putImageData(imageData) {
          capture.frame = imageData?.data ?? null;
          capture.putCalls++;
          if (imageData?.data) capture.bytes += imageData.data.length;
        },
        clearRect() {},
        fillRect() {},
        fillText() {},
        measureText() {
          return { width: 0 };
        },
      };
    },
  };

  const document = {
    getElementById(id) {
      return id === "screen" ? canvas : null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
    documentElement: { classList: { add() {}, toggle() {} } },
  };

  class FakeAudioParam {
    constructor() {
      this.value = 0;
    }
  }

  class FakeNode {
    connect() {
      return this;
    }
    start() {}
    stop() {}
  }

  class FakeAudioContext {
    constructor() {
      this.sampleRate = 48000;
      this.destination = new FakeNode();
      this.state = "running";
    }
    suspend() {
      return Promise.resolve();
    }
    resume() {
      return Promise.resolve();
    }
    createGain() {
      const node = new FakeNode();
      node.gain = new FakeAudioParam();
      return node;
    }
    createBuffer(_ch, length) {
      const data = new Float32Array(length);
      return {
        length,
        getChannelData() {
          return data;
        },
      };
    }
    createBufferSource() {
      const node = new FakeNode();
      node.buffer = null;
      node.loop = false;
      node.playbackRate = new FakeAudioParam();
      return node;
    }
    createChannelMerger() {
      return new FakeNode();
    }
  }

  class FakeFileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(
        (buf) => {
          this.result = buf;
          this.onload?.();
        },
        (err) => {
          this.error = err;
          this.onerror?.();
        }
      );
    }
  }

  globalThis.document = document;
  globalThis.window = globalThis;
  globalThis.AudioContext = FakeAudioContext;
  globalThis.webkitAudioContext = FakeAudioContext;
  globalThis.FileReader = FakeFileReader;
}

let cpuModule = null;

async function loadCPU() {
  installDomShim();
  if (!cpuModule) {
    cpuModule = await import("../../src/CPU.js");
  }
  return cpuModule.CPU;
}

function hookSerial(cpu, bytes) {
  const orig = cpu.mmu.writeByte.bind(cpu.mmu);
  cpu.mmu.writeByte = (addr, val) => {
    orig(addr, val);
    // Reloj interno (bit 0) y arranque (bit 7). Mooneye escribe 0x83; Blargg, 0x81.
    if (addr === 0xff02 && (val & 0x81) === 0x81) {
      bytes.push(cpu.mmu.ioRegs[0x01] & 0xff);
      cpu.mmu.ioRegs[0x02] = val & 0x7f;
    }
  };
}

function hookFramePacing(cpu, counter) {
  if (cpu.gpu.updateGraphics.__paced) return;
  const orig = cpu.gpu.updateGraphics.bind(cpu.gpu);
  const paced = (c) => {
    const step = Number.isFinite(c) && c > 0 ? c : 4;
    counter.cycles += step;
    counter.chunk += step;
    const vblank = orig(step);
    if (vblank) {
      counter.chunk = 0;
      counter.frames++;
      return true;
    }
    // LCD apagado: updateGraphics no señala vblank y emulateFrame no vuelve.
    if (counter.chunk >= 70224) {
      counter.chunk = 0;
      counter.frames++;
      return true;
    }
    return false;
  };
  paced.__paced = true;
  cpu.gpu.updateGraphics = paced;
}

export async function createMachine() {
  const CPU = await loadCPU();
  const cpu = new CPU();
  cpu.init();
  const serial = [];
  hookSerial(cpu, serial);
  const counter = { cycles: 0, chunk: 0, frames: 0 };
  hookFramePacing(cpu, counter);
  return { cpu, serial, counter };
}

export async function loadRomFile(cpu, filePath) {
  const buf = fs.readFileSync(filePath);
  const file = new File([buf], path.basename(filePath));
  await cpu.mmu.load(file);
}

export async function loadRomBytes(cpu, bytes, name) {
  const file = new File([bytes], name);
  await cpu.mmu.load(file);
}

export function serialText(bytes) {
  let out = "";
  for (const b of bytes) {
    if (b === 10 || b === 13 || (b >= 32 && b < 127)) out += String.fromCharCode(b);
  }
  return out;
}

export function mooneyeVerdict(cpu) {
  const regs = ["B", "C", "D", "E", "H", "L"].map((r) => cpu.getRegister(r));
  const fib = [3, 5, 8, 13, 21, 34];
  if (regs.every((v, i) => v === fib[i])) return "pass";
  if (regs.every((v) => v === 0x42)) return "fail";
  return null;
}

export function mapText(cpu) {
  let out = "";
  for (const base of [0x9800, 0x9c00]) {
    for (let row = 0; row < 32; row++) {
      let line = "";
      for (let col = 0; col < 32; col++) {
        const b = cpu.mmu.readByte(base + row * 32 + col);
        line += b >= 32 && b < 127 ? String.fromCharCode(b) : " ";
      }
      out += line.trimEnd() + "\n";
    }
  }
  return out;
}

export function blarggVerdict(bytes, cpu) {
  const text = `${serialText(bytes)}\n${cpu ? mapText(cpu) : ""}`;
  if (/Failed/i.test(text)) return { status: "fail", text };
  if (/Passed/i.test(text)) return { status: "pass", text };
  return null;
}

export function machineSnapshot(cpu, serial) {
  const hex = (n, w = 4) =>
    (Number(n) >>> 0).toString(16).toUpperCase().padStart(w, "0");
  let op = 0;
  try {
    op = cpu.mmu.readByte(cpu.pc);
  } catch {
    op = 0;
  }
  return {
    pc: hex(cpu.pc),
    op: hex(op, 2),
    af: hex(cpu.getRegister("AF")),
    bc: hex(cpu.getRegister("BC")),
    de: hex(cpu.getRegister("DE")),
    hl: hex(cpu.getRegister("HL")),
    sp: hex(cpu.sp),
    ly: cpu.mmu.readByte(0xff44),
    lcdc: hex(cpu.mmu.readByte(0xff40), 2),
    serial: serialText(serial).slice(-240),
  };
}

export function runUntil(machine, { maxCycles, wallMs, probe }) {
  const { cpu, serial, counter } = machine;
  const start = Date.now();
  const startCycles = counter.cycles;
  while (counter.cycles - startCycles < maxCycles && Date.now() - start < wallMs) {
    cpu.emulateFrame();
    const verdict = probe?.(cpu, serial, counter);
    if (verdict) {
      return {
        status: verdict.status,
        detail: verdict.detail ?? "",
        cycles: counter.cycles - startCycles,
        frames: counter.frames,
        ms: Date.now() - start,
      };
    }
  }
  return {
    status: "timeout",
    detail: "",
    cycles: counter.cycles - startCycles,
    frames: counter.frames,
    ms: Date.now() - start,
  };
}

function readU32(u, o) {
  return ((u[o] << 24) | (u[o + 1] << 16) | (u[o + 2] << 8) | u[o + 3]) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// PNG sin entrelazar: gris (incluye 2 bits de dmg-acid2) e indexado (cgb-acid2).
export function decodePng(buffer) {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (u8[0] !== 0x89 || u8[1] !== 0x50) throw new Error("PNG no reconocido");
  let p = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idats = [];
  let plte = null;
  while (p + 8 <= u8.length) {
    const len = readU32(u8, p);
    p += 4;
    const type = String.fromCharCode(u8[p], u8[p + 1], u8[p + 2], u8[p + 3]);
    p += 4;
    const data = u8.subarray(p, p + len);
    p += len + 4;
    if (type === "IHDR") {
      width = readU32(data, 0);
      height = readU32(data, 4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") plte = data;
    else if (type === "IDAT") idats.push(Buffer.from(data));
    else if (type === "IEND") break;
  }
  if (interlace) throw new Error("PNG entrelazado no soportado");
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`tipo de color PNG ${colorType} no soportado`);
  const bpp = Math.max(1, Math.ceil((channels * bitDepth) / 8));
  const stride = Math.ceil((width * channels * bitDepth) / 8);
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const rows = [];
  let src = 0;
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const x = raw[src++];
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let val = x;
      if (filter === 1) val = x + a;
      else if (filter === 2) val = x + b;
      else if (filter === 3) val = x + ((a + b) >> 1);
      else if (filter === 4) val = x + paeth(a, b, c);
      else if (filter !== 0) throw new Error(`filtro PNG ${filter}`);
      cur[i] = val & 0xff;
    }
    rows.push(cur);
    cur.copy(prev);
  }

  const indices = new Uint8Array(width * height);
  const rgba = new Uint8ClampedArray(width * height * 4);
  const samplesPerByte = 8 / bitDepth;
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      let sample;
      if (bitDepth === 8 && colorType !== 3) {
        const base = x * channels;
        if (colorType === 0) {
          sample = row[base];
          rgba[(y * width + x) * 4] = sample;
          rgba[(y * width + x) * 4 + 1] = sample;
          rgba[(y * width + x) * 4 + 2] = sample;
          rgba[(y * width + x) * 4 + 3] = 255;
          indices[y * width + x] = sample;
        } else {
          const o = (y * width + x) * 4;
          rgba[o] = row[base];
          rgba[o + 1] = row[base + 1];
          rgba[o + 2] = row[base + 2];
          rgba[o + 3] = 255;
        }
        continue;
      }
      if (bitDepth >= 8) {
        sample = row[x];
      } else {
        const byte = row[Math.floor(x / samplesPerByte)];
        const shift = 8 - bitDepth * ((x % samplesPerByte) + 1);
        sample = (byte >> shift) & ((1 << bitDepth) - 1);
      }
      const o = (y * width + x) * 4;
      if (colorType === 3) {
        if (!plte) throw new Error("PNG indexado sin PLTE");
        indices[y * width + x] = sample;
        rgba[o] = plte[sample * 3];
        rgba[o + 1] = plte[sample * 3 + 1];
        rgba[o + 2] = plte[sample * 3 + 2];
        rgba[o + 3] = 255;
      } else {
        indices[y * width + x] = sample;
        const shade = bitDepth === 2 ? sample * 85 : sample === 0 ? 0 : 255;
        rgba[o] = rgba[o + 1] = rgba[o + 2] = shade;
        rgba[o + 3] = 255;
      }
    }
  }
  return { width, height, bitDepth, colorType, indices, rgba };
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type);
  const body = Buffer.concat([typeBuf, data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

export function encodePngRGBA(width, height, rgba) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = row + 1 + x * 3;
      raw[d] = rgba[s];
      raw[d + 1] = rgba[s + 1];
      raw[d + 2] = rgba[s + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Paleta gris del emulador (0, 0x77, 0xCC, 0xFF) → índice 0..3.
export function frameToIndices(rgba) {
  const levels = [0, 0x77, 0xcc, 0xff];
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    const r = rgba[i * 4];
    let best = 0;
    let bestDist = 1e9;
    for (let l = 0; l < levels.length; l++) {
      const dist = Math.abs(r - levels[l]);
      if (dist < bestDist) {
        bestDist = dist;
        best = l;
      }
    }
    out[i] = best;
  }
  return out;
}

export function matchRatio(a, b) {
  const n = Math.min(a.length, b.length);
  let same = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) same++;
  return n === 0 ? 0 : same / n;
}

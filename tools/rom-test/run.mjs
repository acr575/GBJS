#!/usr/bin/env node
// Ejecuta ROMs de test contra GBJS sin navegador.
// Uso: node tools/rom-test/run.mjs --search tools/rom-test/cache
// Las ROMs no se versionan; descárgalas con download.mjs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  blarggVerdict,
  capture,
  createMachine,
  decodePng,
  encodePngRGBA,
  frameToIndices,
  loadRomBytes,
  loadRomFile,
  machineSnapshot,
  matchRatio,
  mooneyeVerdict,
  runUntil,
} from "./lib.mjs";

const CLOCK = 4194304;
const here = path.dirname(fileURLToPath(import.meta.url));

function argValue(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function printHelp() {
  console.log(`Uso: node tools/rom-test/run.mjs [opciones]

  --search DIR     Directorio raíz de ROMs (repetible). Por defecto: cache/
  --only REGEX     Filtra por nombre de archivo
  --json FILE      Escribe el informe JSON
  --shots DIR      Guarda PNG de acid2
  --bench          Mide ms/frame (bucle NOP y dmg-acid2)
  --no-extra       Omite dmg_sound, mem_timing-2 e interrupt_time
  --help
`);
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === ".git" || ent.name === "node_modules") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function modelOf(name) {
  const n = name.toLowerCase();
  if (/cgb|agb|ags/.test(n)) return "cgb";
  if (/sgb/.test(n)) return "sgb";
  if (/mgb/.test(n) && !/dmg/.test(n)) return "mgb";
  if (/dmg/.test(n)) return "dmg";
  return "general";
}

function isSmallMbc(file) {
  const n = file.replaceAll("\\", "/");
  if (!n.includes("/emulator-only/")) return false;
  if (/\/rom_(1|2|4|8|16|32|64)Mb/i.test(n)) return false;
  return /\/mbc[125]\//i.test(n) && n.endsWith(".gb");
}

function classify(files) {
  const tests = [];
  const images = {
    dmgRef: null,
    cgbRef: null,
    dmgFailures: [],
  };
  for (const file of files) {
    const base = path.basename(file);
    const norm = file.replaceAll("\\", "/");
    if (base === "reference-dmg.png") images.dmgRef = file;
    else if (base === "reference.png" && norm.includes("cgb-acid2")) images.cgbRef = file;
    else if (norm.includes("/failures/") && base.endsWith(".png") && norm.includes("dmg-acid2")) {
      images.dmgFailures.push(file);
    }
    if (!base.endsWith(".gb") && !base.endsWith(".gbc")) continue;
    if (base === "dmg-acid2.gb") {
      tests.push({ suite: "acid2", kind: "dmg-acid", file, budget: 8, wall: 40 });
      continue;
    }
    if (base === "cgb-acid2.gbc" || base === "cgb-acid2.gb") {
      tests.push({ suite: "acid2", kind: "cgb-acid", file, budget: 8, wall: 40 });
      continue;
    }
    if (norm.includes("/acceptance/") && base.endsWith(".gb")) {
      tests.push({
        suite: "mooneye",
        kind: "mooneye",
        model: modelOf(base),
        file,
        budget: 8,
        wall: 25,
      });
      continue;
    }
    if (isSmallMbc(norm)) {
      tests.push({ suite: "mooneye-mbc", kind: "mooneye", model: "general", file, budget: 10, wall: 30 });
      continue;
    }
    if (norm.includes("/cpu_instrs/")) {
      const individual = norm.includes("/individual/");
      tests.push({
        suite: "blargg",
        kind: "blargg",
        file,
        budget: individual ? 40 : 120,
        wall: individual ? 90 : 240,
      });
      continue;
    }
    if (norm.includes("/instr_timing/")) {
      tests.push({ suite: "blargg", kind: "blargg", file, budget: 40, wall: 90 });
      continue;
    }
    if (norm.includes("/mem_timing/")) {
      tests.push({ suite: "blargg", kind: "blargg", file, budget: 30, wall: 70 });
      continue;
    }
    if (base === "halt_bug.gb") {
      tests.push({ suite: "blargg", kind: "blargg", file, budget: 15, wall: 40 });
      continue;
    }
    if (norm.includes("/mem_timing-2/")) {
      tests.push({ suite: "blargg-extra", kind: "blargg", file, budget: 20, wall: 50, extra: true });
      continue;
    }
    if (base === "interrupt_time.gb") {
      tests.push({ suite: "blargg-extra", kind: "blargg", file, budget: 20, wall: 50, extra: true });
      continue;
    }
    if (norm.includes("/dmg_sound/")) {
      tests.push({ suite: "blargg-audio", kind: "blargg", file, budget: 12, wall: 30, extra: true });
    }
  }
  tests.sort((a, b) => a.suite.localeCompare(b.suite) || a.file.localeCompare(b.file));
  return { tests, images };
}

function relName(file) {
  const norm = file.replaceAll("\\", "/");
  const marks = [
    "/acceptance/",
    "/emulator-only/",
    "/cpu_instrs/",
    "/instr_timing/",
    "/mem_timing/",
    "/mem_timing-2/",
    "/dmg_sound/",
    "/interrupt_time/",
  ];
  for (const mark of marks) {
    const i = norm.indexOf(mark);
    if (i !== -1) return norm.slice(i + 1);
  }
  return path.basename(file);
}

async function runCpuTest(test) {
  const machine = await createMachine();
  await loadRomFile(machine.cpu, test.file);
  const probe =
    test.kind === "mooneye"
      ? (cpu) => {
          const v = mooneyeVerdict(cpu);
          if (!v) return null;
          const snap = machineSnapshot(cpu, machine.serial);
          return {
            status: v,
            detail:
              v === "pass"
                ? "Fibonacci B=3 C=5 D=8 E=13 H=21 L=34"
                : `fallo Mooneye (B..L = 42) AF=${snap.af} PC=${snap.pc}`,
          };
        }
      : (cpu, serial) => {
          const v = blarggVerdict(serial, cpu);
          if (!v) return null;
          const lines = v.text
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l && /Passed|Failed|#|ok/i.test(l));
          const detail = (lines.length ? lines.slice(-4).join(" | ") : v.text.trim()).replace(/\s+/g, " ");
          return { status: v.status, detail: detail.slice(-200) };
        };
  const result = runUntil(machine, {
    maxCycles: test.budget * CLOCK,
    wallMs: test.wall * 1000,
    probe,
  });
  if (!result.detail) {
    const snap = machineSnapshot(machine.cpu, machine.serial);
    result.detail = `PC=${snap.pc} OP=${snap.op} LY=${snap.ly} LCDC=${snap.lcdc} AF=${snap.af} BC=${snap.bc} DE=${snap.de} HL=${snap.hl} serie="${snap.serial}"`;
  }
  return { ...result, header: headerInfo(machine.cpu) };
}

function headerInfo(cpu) {
  const cart = cpu.mmu.cartridge;
  return {
    title: Buffer.from(cart.subarray(0x134, 0x143))
      .toString("ascii")
      .replace(/\0/g, "")
      .trim(),
    cgb: cart[0x143],
    type: cart[0x147],
  };
}

function hashFrame(data) {
  if (!data) return 0;
  let h = 2166136261;
  for (let i = 0; i < data.length; i += 32) {
    h ^= data[i];
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function runAcid(test, images, shotsDir) {
  const machine = await createMachine();
  const puts0 = capture.putCalls;
  capture.frame = null;
  await loadRomFile(machine.cpu, test.file);
  const header = headerInfo(machine.cpu);
  let stable = 0;
  let lastHash = null;
  const result = runUntil(machine, {
    maxCycles: test.budget * CLOCK,
    wallMs: test.wall * 1000,
    probe: (_cpu, _serial, counter) => {
      const h = hashFrame(capture.frame);
      if (h === lastHash && h !== 0) stable++;
      else stable = 0;
      lastHash = h;
      if (counter.frames >= 90 && stable >= 20) {
        return { status: "ready", detail: "imagen estable" };
      }
      return null;
    },
  });
  const frame = capture.frame ? new Uint8ClampedArray(capture.frame) : null;
  const puts = capture.putCalls - puts0;
  let comparison = null;
  if (frame && test.kind === "dmg-acid" && images.dmgRef) {
    const ref = decodePng(fs.readFileSync(images.dmgRef));
    const got = frameToIndices(frame);
    const ratio = matchRatio(got, ref.indices);
    const failures = images.dmgFailures.map((file) => {
      const img = decodePng(fs.readFileSync(file));
      return { name: path.basename(file, ".png"), ratio: matchRatio(got, img.indices) };
    });
    failures.sort((a, b) => b.ratio - a.ratio);
    comparison = {
      metric: "índices de color 0..3 (la referencia PNG es gris de 2 bits; la paleta del emulador es 00/77/CC/FF)",
      match: ratio,
      pixels: got.length,
      closestFailures: failures.slice(0, 5),
      reference: path.basename(images.dmgRef),
    };
    result.status = ratio === 1 ? "pass" : "fail";
    result.detail = `${(ratio * 100).toFixed(2)}% de píxeles coinciden con ${comparison.reference}`;
  } else if (frame && test.kind === "cgb-acid" && images.cgbRef) {
    const ref = decodePng(fs.readFileSync(images.cgbRef));
    let same = 0;
    const n = Math.min(frame.length, ref.rgba.length) / 4;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      if (frame[o] === ref.rgba[o] && frame[o + 1] === ref.rgba[o + 1] && frame[o + 2] === ref.rgba[o + 2]) {
        same++;
      }
    }
    const ratio = n === 0 ? 0 : same / n;
    comparison = {
      metric: "RGB exacto frente a la referencia CGB (el emulador pinta en gris DMG)",
      match: ratio,
      pixels: n,
      reference: path.basename(images.cgbRef),
    };
    result.status = ratio === 1 ? "pass" : "fail";
    result.detail = `${(ratio * 100).toFixed(2)}% de píxeles RGB coinciden; flag CGB del cartucho=0x${header.cgb.toString(16)}`;
  } else {
    result.status = "error";
    result.detail = frame ? "no hay imagen de referencia" : "el PPU no produjo framebuffer";
  }
  if (shotsDir && frame) {
    fs.mkdirSync(shotsDir, { recursive: true });
    const out = path.join(shotsDir, `${path.basename(test.file, path.extname(test.file))}.png`);
    fs.writeFileSync(out, encodePngRGBA(160, 144, frame));
    comparison = { ...comparison, screenshot: out };
  }
  return {
    ...result,
    header,
    comparison,
    putImageDataPerFrame: result.frames ? puts / result.frames : 0,
  };
}

async function benchmark(acidFile) {
  const frames = 180;
  const cases = [];

  async function measure(label, prepare) {
    const machine = await createMachine();
    await prepare(machine.cpu);
    for (let i = 0; i < 20; i++) machine.cpu.emulateFrame();
    const puts0 = capture.putCalls;
    const frames0 = machine.counter.frames;
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < frames; i++) machine.cpu.emulateFrame();
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const produced = machine.counter.frames - frames0;
    cases.push({
      label,
      frames: produced,
      ms: Number(ms.toFixed(2)),
      msPerFrame: Number((ms / produced).toFixed(3)),
      hostFps: Number((1000 / (ms / produced)).toFixed(2)),
      holds597: ms / produced <= 1000 / (CLOCK / 70224),
      putImageDataPerFrame: Number(((capture.putCalls - puts0) / produced).toFixed(2)),
    });
  }

  const nop = new Uint8Array(0x8000);
  nop[0x100] = 0x18;
  nop[0x101] = 0xfe;

  await measure("JR infinito, LCD encendido (raster vacío)", async (cpu) => {
    await loadRomBytes(cpu, nop, "nop.gb");
  });
  await measure("JR infinito, LCD apagado (solo CPU/timer)", async (cpu) => {
    await loadRomBytes(cpu, nop, "nop.gb");
    cpu.mmu.writeByte(0xff40, 0x00);
  });
  if (acidFile) {
    await measure("dmg-acid2 (fondo, ventana y sprites)", async (cpu) => {
      await loadRomFile(cpu, acidFile);
    });
  }
  return {
    note: "Node headless: putImageData no sube nada a GPU. En el navegador cada llamada copia 160×144×4. El objetivo de un frame es 70224 T-cycles / 4.194304 MHz ≈ 16.74 ms (59.73 fps).",
    frameBudgetMs: Number((1000 / (CLOCK / 70224)).toFixed(3)),
    cases,
  };
}

function summarize(results) {
  const lines = [];
  const groups = new Map();
  for (const r of results) {
    const key = r.suite;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const [suite, rows] of groups) {
    const counts = {};
    for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1;
    const bits = Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ");
    lines.push(`${suite}: ${rows.length} ROMs (${bits})`);
  }
  return lines;
}

async function main() {
  if (hasFlag("--help")) {
    printHelp();
    return;
  }
  const searches = [];
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--search" && process.argv[i + 1]) searches.push(process.argv[++i]);
  }
  if (searches.length === 0) searches.push(path.join(here, "cache"));
  const only = argValue("--only");
  const jsonPath = argValue("--json");
  const shotsDir = argValue("--shots");
  const extras = !hasFlag("--no-extra");
  const files = searches.flatMap((dir) => walk(path.resolve(dir)));
  const { tests, images } = classify(files);
  let selected = tests.filter((t) => (extras ? true : !t.extra));
  if (only) {
    const re = new RegExp(only, "i");
    selected = selected.filter((t) => re.test(t.file));
  }
  if (selected.length === 0 && !hasFlag("--bench")) {
    console.error("No hay ROMs. Descárgalas con: node tools/rom-test/download.mjs");
    process.exitCode = 1;
    return;
  }

  const results = [];
  for (const test of selected) {
    const name = relName(test.file);
    process.stdout.write(`· ${test.suite} ${name} ... `);
    try {
      const ran = test.suite === "acid2" ? await runAcid(test, images, shotsDir) : await runCpuTest(test);
      const row = {
        suite: test.suite,
        name,
        file: test.file,
        model: test.model ?? null,
        status: ran.status,
        detail: ran.detail,
        ms: ran.ms,
        frames: ran.frames,
        cycles: ran.cycles,
        header: ran.header,
        comparison: ran.comparison ?? null,
        putImageDataPerFrame: ran.putImageDataPerFrame ?? null,
      };
      results.push(row);
      console.log(`${row.status} (${row.ms} ms) ${row.detail}`.slice(0, 220));
    } catch (error) {
      const message = error?.message ?? String(error);
      results.push({
        suite: test.suite,
        name,
        file: test.file,
        model: test.model ?? null,
        status: /Unsupported MBC/i.test(message) ? "unsupported" : "error",
        detail: message,
      });
      console.log(`${results.at(-1).status}: ${message}`.slice(0, 220));
    }
  }

  let bench = null;
  if (hasFlag("--bench")) {
    const acid = tests.find((t) => t.kind === "dmg-acid");
    bench = await benchmark(acid?.file ?? null);
    for (const row of bench.cases) {
      console.log(
        `bench ${row.label}: ${row.msPerFrame} ms/frame (${row.hostFps} fps) putImageData×${row.putImageDataPerFrame} ${row.holds597 ? "cabe en 59.7" : "no cabe en 59.7"}`
      );
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    searches,
    summary: summarize(results),
    bench,
    results,
  };
  if (jsonPath) {
    fs.mkdirSync(path.dirname(path.resolve(jsonPath)), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  }
  console.log("\n" + report.summary.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

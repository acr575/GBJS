#!/usr/bin/env node
// Descarga ROMs de test libres a tools/rom-test/cache/. No las añade al repo.
// Fuentes: retrio/gb-test-roms, mattcurrie/dmg-acid2, mattcurrie/cgb-acid2,
// gekkio.fi/files/mooneye-test-suite (build público del mooneye-test-suite).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

const cache = path.resolve(argValue("--cache", path.join(here, "cache")));

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return dest;
}

function unzip(zip, dest, members = null) {
  fs.mkdirSync(dest, { recursive: true });
  const args = ["-o", "-q", "-d", dest, zip];
  if (members?.length) args.push(...members);
  execFileSync("unzip", args, { stdio: "inherit" });
}

async function fetchRetrio() {
  const marker = path.join(cache, "retrio", "cpu_instrs", "cpu_instrs.gb");
  if (fs.existsSync(marker)) {
    console.log("retrio ya está en caché");
    return;
  }
  console.log("Descargando retrio/gb-test-roms…");
  const zip = await download(
    "https://github.com/retrio/gb-test-roms/archive/refs/heads/master.zip",
    path.join(cache, "src", "retrio.zip")
  );
  unzip(zip, path.join(cache, "src"));
  const inner = fs.readdirSync(path.join(cache, "src")).find((n) => n.startsWith("gb-test-roms-"));
  if (!inner) throw new Error("el zip de retrio no trae el directorio esperado");
  fs.renameSync(path.join(cache, "src", inner), path.join(cache, "retrio"));
}

async function fetchAcid() {
  const dmgRom = path.join(cache, "acid", "dmg-acid2.gb");
  const cgbRom = path.join(cache, "acid", "cgb-acid2.gbc");
  if (!fs.existsSync(dmgRom)) {
    console.log("Descargando dmg-acid2.gb…");
    await download("https://github.com/mattcurrie/dmg-acid2/releases/download/v1.0/dmg-acid2.gb", dmgRom);
  }
  if (!fs.existsSync(cgbRom)) {
    console.log("Descargando cgb-acid2.gbc…");
    await download("https://github.com/mattcurrie/cgb-acid2/releases/download/v1.1/cgb-acid2.gbc", cgbRom);
  }
  if (!fs.existsSync(path.join(cache, "acid", "dmg-acid2", "img", "reference-dmg.png"))) {
    console.log("Descargando referencias PNG de acid2…");
    const dmgZip = await download(
      "https://github.com/mattcurrie/dmg-acid2/archive/refs/heads/master.zip",
      path.join(cache, "src", "dmg-acid2.zip")
    );
    const cgbZip = await download(
      "https://github.com/mattcurrie/cgb-acid2/archive/refs/heads/master.zip",
      path.join(cache, "src", "cgb-acid2.zip")
    );
    unzip(dmgZip, path.join(cache, "src"));
    unzip(cgbZip, path.join(cache, "src"));
    const dmgDir = fs.readdirSync(path.join(cache, "src")).find((n) => n.startsWith("dmg-acid2-"));
    const cgbDir = fs.readdirSync(path.join(cache, "src")).find((n) => n.startsWith("cgb-acid2-"));
    fs.renameSync(path.join(cache, "src", dmgDir), path.join(cache, "acid", "dmg-acid2"));
    fs.renameSync(path.join(cache, "src", cgbDir), path.join(cache, "acid", "cgb-acid2"));
  }
}

async function latestMooneyeZip() {
  const index = await fetch("https://gekkio.fi/files/mooneye-test-suite/");
  if (!index.ok) throw new Error(`HTTP ${index.status} en el índice de Mooneye`);
  const html = await index.text();
  const dirs = [...html.matchAll(/href="(mts-[^"]+\/)"/g)].map((m) => m[1]).sort();
  const latest = dirs.at(-1);
  if (!latest) throw new Error("no hay builds en gekkio.fi/files/mooneye-test-suite");
  const page = await fetch(`https://gekkio.fi/files/mooneye-test-suite/${latest}`);
  const listing = await page.text();
  const zipName = [...listing.matchAll(/href="([^"]+\.zip)"/g)].map((m) => m[1]).at(-1);
  if (!zipName) throw new Error(`el build ${latest} no publica un zip`);
  return `https://gekkio.fi/files/mooneye-test-suite/${latest}${zipName}`;
}

function wantedMooneyeMember(name, bytes) {
  if (!name.endsWith(".gb")) return false;
  if (bytes > 256 * 1024) return false;
  if (name.includes("/acceptance/")) return true;
  if (!name.includes("/emulator-only/mbc")) return false;
  if (/rom_\d+Mb|multicart/i.test(name)) return false;
  return true;
}

async function fetchMooneye() {
  const marker = path.join(cache, "mooneye");
  if (fs.existsSync(marker) && fs.readdirSync(marker).length > 0) {
    console.log("mooneye ya está en caché");
    return;
  }
  console.log("Descargando Mooneye Test Suite…");
  const url = await latestMooneyeZip();
  const zip = await download(url, path.join(cache, "src", "mooneye.zip"));
  const list = execFileSync("unzip", ["-l", zip], { encoding: "utf8" })
    .split("\n")
    .map((line) => {
      const match = line.match(/^\s*(\d+)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+\.gb)$/);
      if (!match) return null;
      return wantedMooneyeMember(match[2].trim(), Number(match[1])) ? match[2].trim() : null;
    })
    .filter(Boolean);
  if (list.length === 0) throw new Error("el zip de Mooneye no contiene acceptance/*.gb");
  console.log(`Extrayendo ${list.length} ROMs de Mooneye (sin los ROM de varios MiB)…`);
  unzip(zip, path.join(cache, "src"), list);
  const inner = fs
    .readdirSync(path.join(cache, "src"))
    .find((n) => n.startsWith("mts-"));
  fs.renameSync(path.join(cache, "src", inner), marker);
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Uso: node tools/rom-test/download.mjs [--cache DIR]");
    console.log("Requiere unzip en el PATH. Las ROMs quedan fuera de git.");
    return;
  }
  fs.mkdirSync(cache, { recursive: true });
  await fetchRetrio();
  await fetchAcid();
  await fetchMooneye();
  console.log(`Listo: ${cache}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * fetch-test-roms.js
 *
 * Script to assist maintainers in downloading known test ROMs into tests/roms.
 * This script will not run automatically in CI; it's a helper for local setup.
 *
 * Usage: node tests/fetch-test-roms.js --out tests/roms
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const TARGET_DIR = process.argv[2] || 'tests/roms';
const ROMS = [
  // Add URLs for permissively redistributable test ROMs here.
  // Example (replace or remove if license doesn't allow distribution):
  // { name: 'blargg-instrs', url: 'https://example.com/blargg-instrs.gb' }
];

if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

if (ROMS.length === 0) {
  console.log('No ROMs configured. Edit tests/fetch-test-roms.js to add URLs for allowed test ROMs.');
  process.exit(0);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('Failed to download ' + url));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

(async () => {
  for (const r of ROMS) {
    const dest = path.join(TARGET_DIR, r.name + path.extname(r.url));
    console.log('Downloading', r.url, '->', dest);
    try {
      await download(r.url, dest);
      console.log('Saved', dest);
    } catch (e) {
      console.error('Failed', e.message);
    }
  }
})();

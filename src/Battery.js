// Cartridge types whose Pan Docs name includes a battery. The header has no
// battery bit; 0x0147 is the whole signal. HuC3, TAMA5 and the Pocket Camera
// also ship with a cell, but their type bytes do not say so — add those when
// a mapper for them exists. MBC3 is recognized here and still rejected at load.
const BATTERY_TYPES = new Set([
  0x03, // MBC1+RAM+BATTERY
  0x06, // MBC2+BATTERY
  0x09, // ROM+RAM+BATTERY
  0x0d, // MMM01+RAM+BATTERY
  0x0f, // MBC3+TIMER+BATTERY
  0x10, // MBC3+TIMER+RAM+BATTERY
  0x13, // MBC3+RAM+BATTERY
  0x1b, // MBC5+RAM+BATTERY
  0x1e, // MBC5+RUMBLE+RAM+BATTERY
  0x22, // MBC7+SENSOR+RUMBLE+RAM+BATTERY
  0xff, // HuC1+RAM+BATTERY
]);

const TITLE = 0x134;
const CGB_FLAG = 0x143;
const GLOBAL_CHECKSUM = 0x14e;

export const BATTERY_DB_NAME = "gbjs-battery";
export const BATTERY_STORE = "images";

// IndexedDB transactions started from pagehide are aborted when Chrome
// discards the document, so the same snapshot is also written here. The
// next open copies it back into IndexedDB and drops the copy. The prefix
// stays away from the UI settings, which use short localStorage keys.
const STASH_PREFIX = "gbjs-battery:";

// Quiet period after the last external-RAM (or RTC) write before IndexedDB
// is touched. A save routine writes many bytes; one transaction is enough.
const SAVE_DELAY_MS = 500;

/**
 * Image stored for one cartridge.
 * `sram` is the external RAM (a copy). `rtc` is reserved for MBC3: this
 * module round-trips whatever structured-cloneable value the mapper stores
 * and does not tick a clock. Null until that mapper exists.
 * @typedef {{ sram: Uint8Array, rtc: * }} BatteryImage
 */

/**
 * @param {number} cartridgeType Header byte 0x0147.
 * @returns {boolean}
 */
export function cartridgeHasBattery(cartridgeType) {
  return BATTERY_TYPES.has(cartridgeType & 0xff);
}

/**
 * Title at 0x0134. DMG uses 16 bytes; a CGB flag (0x80 or 0xC0) uses 15 so
 * the flag byte is not part of the title. Stop at the first 0x00. A maker
 * code with no separator stays in the string: guessing the cut would change
 * the key between builds. The result is stable for a given ROM image.
 * @param {Uint8Array} rom
 * @returns {string}
 */
export function cartridgeTitle(rom) {
  if (!rom || rom.length < 0x150) return "";
  const end = TITLE + titleLength(rom);
  let out = "";
  for (let i = TITLE; i < end; i++) {
    const b = rom[i];
    if (b == 0) break;
    if (b >= 0x20 && b < 0x7f) out += String.fromCharCode(b);
  }
  return out.trim();
}

/**
 * Stable id for one game: title plus the global checksum stored at
 * 0x014E–0x014F (big-endian). The bytes in the header are used as-is, so a
 * reload of the same file hits the same key.
 * @param {Uint8Array} rom
 * @returns {string|null}
 */
export function cartridgeGameKey(rom) {
  if (!rom || rom.length < 0x150) return null;
  const title = cartridgeTitle(rom) || "untitled";
  const sum =
    ((rom[GLOBAL_CHECKSUM] << 8) | rom[GLOBAL_CHECKSUM + 1]) & 0xffff;
  const hex = sum.toString(16).toUpperCase().padStart(4, "0");
  return title + ":" + hex;
}

function titleLength(rom) {
  const cgb = rom[CGB_FLAG];
  if (cgb == 0x80 || cgb == 0xc0) return 15;
  return 16;
}

function idbAvailable() {
  return typeof indexedDB != "undefined" && indexedDB != null;
}

function stashAvailable() {
  return typeof localStorage != "undefined" && localStorage != null;
}

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 4096) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 4096));
  }
  return btoa(bin);
}

function base64ToBytes(text) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Synchronous copy used when the page is going away. RTC is JSON because
// that is what an MBC3 clock snapshot is: numbers and flags. A value that
// cannot travel as JSON is left null here; IndexedDB still stores it when
// the transaction is allowed to finish.
function writeStash(key, sram, rtc) {
  if (!stashAvailable() || !key || !sram) return;
  let storedRtc = null;
  if (rtc != null) {
    try {
      storedRtc = JSON.parse(JSON.stringify(rtc));
    } catch {
      storedRtc = null;
    }
  }
  try {
    localStorage.setItem(
      STASH_PREFIX + key,
      JSON.stringify({ version: 1, sram: bytesToBase64(sram), rtc: storedRtc })
    );
  } catch (err) {
    console.error("Could not stash the battery RAM.", err);
  }
}

function readStash(key) {
  if (!stashAvailable() || !key) return null;
  const raw = localStorage.getItem(STASH_PREFIX + key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const sram = base64ToBytes(parsed.sram);
    return { sram, rtc: parsed.rtc ?? null };
  } catch (err) {
    console.error("Could not read the stashed battery RAM.", err);
    return null;
  }
}

function clearStash(key) {
  if (!stashAvailable() || !key) return;
  try {
    localStorage.removeItem(STASH_PREFIX + key);
  } catch {
    // The IndexedDB copy is the one that has to stick.
  }
}

function toBytes(value) {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

function imageFromRecord(record) {
  if (!record) return null;
  const sram = toBytes(record.sram);
  if (!sram) return null;
  return { sram, rtc: record.rtc ?? null };
}

/**
 * IndexedDB store for battery images. The connection stays open after the
 * first load so a pagehide handler can start the write synchronously.
 */
export class BatteryStore {
  #db = null;
  #opening = null;
  #timer = 0;
  #due = 0;
  #dirty = false;
  #key = null;
  #readImage = null;

  /**
   * @param {string} key
   * @returns {Promise<BatteryImage|null>}
   */
  async load(key) {
    if (!key) return null;
    // Prefer the pagehide copy. It is the last snapshot, and the IndexedDB
    // transaction that should have stored it may have been aborted.
    const stashed = readStash(key);
    if (!idbAvailable()) return stashed;
    try {
      const db = await this.#open();
      if (stashed) {
        const stored = await this.#put(db, key, {
          version: 1,
          sram: stashed.sram,
          rtc: stashed.rtc,
        });
        if (stored) clearStash(key);
        return stashed;
      }
      return await this.#get(db, key);
    } catch (err) {
      console.error("Could not read the battery save.", err);
      return stashed;
    }
  }

  /**
   * Remember that `readImage` should be stored under `key` once writes go
   * quiet. `readImage` runs at flush time, so the snapshot includes the
   * latest SRAM and, when MBC3 sets it, the latest RTC value.
   * @param {string} key
   * @param {() => BatteryImage} readImage
   */
  markDirty(key, readImage) {
    if (!key || !readImage || !idbAvailable()) return;
    this.#key = key;
    this.#readImage = readImage;
    this.#dirty = true;
    this.#due = Date.now() + SAVE_DELAY_MS;
    if (this.#timer) return;
    this.#schedule();
  }

  /**
   * Write the pending image now. Safe to call when nothing is pending.
   * When the database is already open the transaction starts before this
   * returns, which is what pagehide needs.
   * @returns {Promise<void>}
   */
  flush() {
    clearTimeout(this.#timer);
    this.#timer = 0;
    if (!this.#dirty || !idbAvailable()) return Promise.resolve();
    if (!this.#db) return this.#flushAfterOpen();
    return this.#commit();
  }

  /**
   * Drop a pending write without storing it. The caller flushes first when
   * the bytes should be kept.
   */
  detach() {
    clearTimeout(this.#timer);
    this.#timer = 0;
    this.#dirty = false;
    this.#key = null;
    this.#readImage = null;
  }

  #schedule() {
    const wait = Math.max(0, this.#due - Date.now());
    this.#timer = setTimeout(() => {
      this.#timer = 0;
      if (!this.#dirty) return;
      if (Date.now() + 5 < this.#due) {
        this.#schedule();
        return;
      }
      this.flush();
    }, wait);
  }

  async #flushAfterOpen() {
    try {
      await this.#open();
    } catch (err) {
      console.error("Could not open the battery database.", err);
      return;
    }
    if (!this.#dirty || !this.#db) return;
    await this.#commit();
  }

  #commit() {
    const key = this.#key;
    const readImage = this.#readImage;
    if (!key || !readImage) {
      this.#dirty = false;
      return Promise.resolve();
    }

    let image;
    try {
      image = readImage();
    } catch (err) {
      console.error("Could not snapshot the battery RAM.", err);
      return Promise.resolve();
    }

    const sram = image && toBytes(image.sram);
    let rtc = null;
    if (image && image.rtc != null) {
      try {
        rtc = structuredClone(image.rtc);
      } catch (err) {
        console.error("RTC snapshot is not stored.", err);
        this.#dirty = true;
        return Promise.resolve();
      }
    }
    if (!sram || (sram.length == 0 && rtc == null)) {
      this.#dirty = false;
      return Promise.resolve();
    }

    // Cleared before yielding so a write during the transaction stays dirty.
    // The stash is synchronous: a discarded document still leaves this snapshot
    // for the next open even when the transaction below is aborted.
    this.#dirty = false;
    const record = { version: 1, sram, rtc };
    writeStash(key, sram, rtc);

    try {
      return this.#put(this.#db, key, record);
    } catch (err) {
      this.#dirty = true;
      console.error("Could not store the cartridge RAM.", err);
      return;
    }
  }

  #get(db, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BATTERY_STORE, "readonly");
      const req = tx.objectStore(BATTERY_STORE).get(key);
      req.onsuccess = () => resolve(imageFromRecord(req.result));
      req.onerror = () => reject(req.error);
    });
  }

  #put(db, key, record) {
    return new Promise((resolve) => {
      let tx;
      try {
        tx = db.transaction(BATTERY_STORE, "readwrite");
      } catch (err) {
        this.#dirty = true;
        if (!readStash(key))
          console.error("Could not store the cartridge RAM.", err);
        resolve(false);
        return;
      }
      tx.objectStore(BATTERY_STORE).put(record, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        this.#dirty = true;
        // pagehide aborts the transaction; the stash is what survives that.
        if (!readStash(key))
          console.error("Could not store the cartridge RAM.", tx.error);
        resolve(false);
      };
      tx.onabort = () => {
        this.#dirty = true;
        if (!readStash(key))
          console.error("Cartridge RAM transaction aborted.", tx.error);
        resolve(false);
      };
    });
  }

  #open() {
    if (this.#db) return Promise.resolve(this.#db);
    if (this.#opening) return this.#opening;
    this.#opening = new Promise((resolve, reject) => {
      const req = indexedDB.open(BATTERY_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(BATTERY_STORE))
          db.createObjectStore(BATTERY_STORE);
      };
      req.onsuccess = () => {
        this.#db = req.result;
        this.#db.onversionchange = () => {
          this.#db.close();
          this.#db = null;
        };
        this.#opening = null;
        resolve(this.#db);
      };
      req.onerror = () => {
        this.#opening = null;
        reject(req.error);
      };
      req.onblocked = () => {
        this.#opening = null;
        reject(new Error("IndexedDB open blocked"));
      };
    });
    return this.#opening;
  }
}

import { writeFile, readFile, unlink, access } from 'fs/promises';
import { constants } from 'fs';

// Try to use better-sqlite3 if available; otherwise fall back to file-based
// JSON storage that was previously used. This ensures tests can run in
// environments where native modules can't be built.
let sqliteAvailable = false;
let Database = null;
let DB_PATH = process.env.PIN_DB_PATH || ':memory:';

try {
  // dynamic import so module load doesn't fail if dependency missing
  // eslint-disable-next-line no-undef
  const mod = await import('better-sqlite3').catch(() => null);
  if (mod && mod.default) {
    Database = mod.default;
    sqliteAvailable = true;
  }
} catch (e) {
  sqliteAvailable = false;
}

let pinArtifact, listPins, clearPins;

if (sqliteAvailable) {
  // SQLITE-backed impl
  let db = null;
  function initDb() {
    if (db) return db;
    db = new Database(DB_PATH);
    db.prepare(
      `CREATE TABLE IF NOT EXISTS pins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cid TEXT NOT NULL,
        uploaderId TEXT,
        metadata TEXT,
        status TEXT,
        pinnedAt INTEGER,
        createdAt INTEGER
      )`
    ).run();
    return db;
  }

  pinArtifact = async function (cid, uploaderId, metadata = {}) {
    const db = initDb();
    const now = Date.now();
    const status = 'pinned';
    const metaJson = JSON.stringify(metadata || {});
    const insert = db.prepare('INSERT INTO pins (cid, uploaderId, metadata, status, pinnedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
    const info = insert.run(cid, uploaderId, metaJson, status, now, now);
    return {
      id: info.lastInsertRowid,
      cid,
      uploaderId,
      metadata,
      pinata_status: status,
      pinnedAt: now,
      timestamp: now
    };
  }

  listPins = async function () {
    const db = initDb();
    const rows = db.prepare('SELECT * FROM pins ORDER BY id ASC').all();
    return rows.map((r) => ({
      id: r.id,
      cid: r.cid,
      uploaderId: r.uploaderId,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
      pinata_status: r.status,
      pinnedAt: r.pinnedAt,
      timestamp: r.createdAt
    }));
  }

  clearPins = async function () {
    const db = initDb();
    db.prepare('DELETE FROM pins').run();
    if (DB_PATH !== ':memory:') {
      try { db.prepare('VACUUM').run(); } catch (e) { /* ignore */ }
    }
  }

  // end sqlite-backed impl

} else {
  // Fallback file-based impl (previous behavior) so tests run without native builds
  // fs/promises and fs.constants are imported at the top of the module instead of here

  const MOCK_DB_FILE = 'mock_router_pins.json';

  async function loadDb() {
    try {
      await access(MOCK_DB_FILE, constants.F_OK);
      const data = await readFile(MOCK_DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      if (e.code === 'ENOENT') return [];
      console.error('Error loading mock pinning DB:', e);
      throw e;
    }
  }

  async function saveDb(pins) {
    const data = JSON.stringify(pins, null, 2);
    await writeFile(MOCK_DB_FILE, data, 'utf-8');
  }

  pinArtifact = async function (cid, uploaderId, metadata) {
    const pins = await loadDb();
    // Simulate a small processing delay to mimic a real pinning queue
    await new Promise((r) => setTimeout(r, 10));
    const newPin = {
      cid,
      uploaderId: uploaderId,
      metadata,
      pinata_status: 'pending',
      timestamp: Date.now()
    };
    pins.push(newPin);
    await saveDb(pins);
    return newPin;
  }

  listPins = async function () { return await loadDb(); };

  clearPins = async function () {
    try {
      await unlink(MOCK_DB_FILE);
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error('Error clearing mock pinning DB:', e);
        throw e;
      }
    }
  }

  // end fallback impl
}

// Export a boolean to allow tests and CI to assert which path is active.
// This is a live binding; it reflects whether the sqlite path was available at module load.
export const SQLITE_AVAILABLE = sqliteAvailable;

export { pinArtifact, listPins, clearPins };

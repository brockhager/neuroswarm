// vp-node/compliance-db-service.ts
// CN-07-D: Persistence for Consensus Compliance Records
// Attempts to use sqlite (better-sqlite3 or sqlite3) if available, otherwise falls back to an in-memory store

import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'neuroswarm_compliance.db');

type EventType = 'MISSED_SLOT' | 'LATE_BLOCK' | 'REVERTED_BLOCK' | 'PRODUCED_SLOT';

export interface ComplianceEvent {
  validatorId: string;
  eventType: EventType;
  blockHeight: number;
  eraId: number;
  timestamp?: string;
  consecutiveCount?: number;
}

// --- In-memory fallback implementation ---
class InMemoryStore {
  private rows: Array<any> = [];
  private autoId = 1;

  async init() {
    // noop
  }

  async insert(event: ComplianceEvent) {
    // dedupe unique (validatorId, blockHeight)
    const exists = this.rows.find(r => r.validatorId === event.validatorId && r.blockHeight === event.blockHeight);
    if (exists) return;
    const row = {
      id: this.autoId++,
      validator_id: event.validatorId,
      event_type: event.eventType,
      block_height: event.blockHeight,
      era_id: event.eraId,
      timestamp: event.timestamp ?? new Date().toISOString(),
      consecutive_count: event.consecutiveCount ?? 1,
    };
    this.rows.push(row);
  }

  async countMissesByEra(validatorId: string, startEra: number, endEra: number) {
    return this.rows.filter(r => r.validator_id === validatorId && r.event_type === 'MISSED_SLOT' && r.era_id >= startEra && r.era_id <= endEra).length;
  }

  async maxConsecutive(validatorId: string) {
    const found = this.rows.filter(r => r.validator_id === validatorId && r.event_type === 'MISSED_SLOT');
    if (!found || found.length === 0) return 0;
    return Math.max(...found.map(r => r.consecutive_count || 1));
  }
}

let impl: any = null;

async function trySqliteInit() {
  // Try better-sqlite3 first for ease of use (sync API), then sqlite3
  try {
    const Better = await import('better-sqlite3').catch(() => null);
    if (Better) {
      const db = new Better.default(DB_PATH);
      // create table if not exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS compliance_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          validator_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          block_height INTEGER NOT NULL,
          era_id INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          consecutive_count INTEGER DEFAULT 1,
          UNIQUE(validator_id, block_height)
        );
      `);

      impl = {
        async insert(event: ComplianceEvent) {
          try {
            const stmt = db.prepare(`INSERT OR IGNORE INTO compliance_events (validator_id,event_type,block_height,era_id,timestamp,consecutive_count) VALUES (?, ?, ?, ?, ?, ?)`);
            stmt.run(event.validatorId, event.eventType, event.blockHeight, event.eraId, event.timestamp ?? new Date().toISOString(), event.consecutiveCount ?? 1);
          } catch (e) {
            // ignore inserts that fail due to unique constraint
          }
        },
        async countMissesByEra(validatorId: string, startEra: number, endEra: number) {
          const row = db.prepare(`SELECT COUNT(*) as count FROM compliance_events WHERE validator_id = ? AND event_type = 'MISSED_SLOT' AND era_id BETWEEN ? AND ?`).get(validatorId, startEra, endEra);
          return row ? row.count : 0;
        },
        async maxConsecutive(validatorId: string) {
          const row = db.prepare(`SELECT MAX(consecutive_count) as max_count FROM compliance_events WHERE validator_id = ? AND event_type = 'MISSED_SLOT'`).get(validatorId);
          return row && row.max_count ? row.max_count : 0;
        }
      };

      return true;
    }
  } catch (e) {
    // fallthrough
  }

  // Try sqlite3 (callback API)
  try {
    const sqlite3 = await import('sqlite3').catch(() => null);
    if (sqlite3) {
      const sqlite = sqlite3.default || sqlite3;
      // open DB in serialized mode
      const db = new sqlite.Database(DB_PATH);
      await new Promise<void>((resolve, reject) => db.run(`
        CREATE TABLE IF NOT EXISTS compliance_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          validator_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          block_height INTEGER NOT NULL,
          era_id INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          consecutive_count INTEGER DEFAULT 1,
          UNIQUE(validator_id, block_height)
        );
      `, (err) => err ? reject(err) : resolve()));

      impl = {
        async insert(event: ComplianceEvent) {
          const sql = `INSERT INTO compliance_events (validator_id, event_type, block_height, era_id, timestamp, consecutive_count) VALUES (?, ?, ?, ?, ?, ?)`;
          await new Promise<void>((resolve, reject) => db.run(sql, [event.validatorId, event.eventType, event.blockHeight, event.eraId, event.timestamp ?? new Date().toISOString(), event.consecutiveCount ?? 1], function (err) {
            if (err) {
              if (String(err.message).includes('UNIQUE constraint failed')) return resolve();
              return reject(err);
            }
            resolve();
          }));
        },
        async countMissesByEra(validatorId: string, startEra: number, endEra: number) {
          const sql = `SELECT COUNT(*) as count FROM compliance_events WHERE validator_id = ? AND event_type = 'MISSED_SLOT' AND era_id BETWEEN ? AND ?`;
          return await new Promise<number>((resolve, reject) => db.get(sql, [validatorId, startEra, endEra], (err, row) => err ? reject(err) : resolve(row ? row.count : 0)));
        },
        async maxConsecutive(validatorId: string) {
          const sql = `SELECT MAX(consecutive_count) as max_count FROM compliance_events WHERE validator_id = ? AND event_type = 'MISSED_SLOT'`;
          return await new Promise<number>((resolve, reject) => db.get(sql, [validatorId], (err, row) => err ? reject(err) : resolve(row && row.max_count ? row.max_count : 0)));
        }
      };

      return true;
    }
  } catch (e) {
    // fallthrough
  }

  // Fallback to in-memory
  impl = new InMemoryStore();
  return false;
}

export async function initializeComplianceDB(): Promise<void> {
  if (!impl) await trySqliteInit();
  if (impl && impl.init) await impl.init();
}

export async function recordComplianceEvent(event: ComplianceEvent): Promise<void> {
  if (!impl) await trySqliteInit();
  return impl.insert(event);
}

export async function getMissedSlotCountByEra(validatorId: string, startEra: number, endEra: number): Promise<number> {
  if (!impl) await trySqliteInit();
  return impl.countMissesByEra(validatorId, startEra, endEra);
}

export async function getHighestConsecutiveMisses(validatorId: string): Promise<number> {
  if (!impl) await trySqliteInit();
  return impl.maxConsecutive(validatorId);
}

// Export the in-memory impl for tests/debug
export const _impl = () => impl;

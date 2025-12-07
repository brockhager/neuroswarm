import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'neuroswarm_reward_claims.db');

export interface RewardClaimRecord {
  id?: number;
  claimId: string;
  producerId: string;
  allocation: any;
  status: 'PENDING' | 'SUBMITTED' | 'SETTLED' | 'FAILED';
  attempts?: number;
  lastAttemptTimestamp?: string | null;
  txHash?: string | null;
  lastError?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// In-memory fallback
class InMemoryStore {
  private rows: Array<RewardClaimRecord> = [];
  constructor() {}

  async init() {}

  async insert(record: RewardClaimRecord) {
    const exists = this.rows.find(r => r.claimId === record.claimId);
    if (exists) return;
    const now = new Date().toISOString();
    this.rows.push({ ...record, attempts: record.attempts ?? 0, lastAttemptTimestamp: record.lastAttemptTimestamp ?? null, createdAt: now, updatedAt: now });
  }

  async listPending() {
    return this.rows.filter(r => r.status === 'PENDING' || r.status === 'FAILED');
  }

  async markSubmitted(claimId: string, txHash?: string) {
    const r = this.rows.find(x => x.claimId === claimId);
    if (!r) return;
    r.status = 'SUBMITTED';
    r.txHash = txHash ?? null;
    r.updatedAt = new Date().toISOString();
    r.lastAttemptTimestamp = new Date().toISOString();
  }

  async markFailed(claimId: string, err?: string) {
    const r = this.rows.find(x => x.claimId === claimId);
    if (!r) return;
    r.status = 'FAILED';
    r.lastError = err ?? null;
    r.attempts = (r.attempts || 0) + 1;
    r.lastAttemptTimestamp = new Date().toISOString();
    r.updatedAt = new Date().toISOString();
  }

  async markSettled(claimId: string, txHash?: string) {
    const r = this.rows.find(x => x.claimId === claimId);
    if (!r) return;
    r.status = 'SETTLED';
    r.txHash = txHash ?? r.txHash ?? null;
    r.updatedAt = new Date().toISOString();
    r.lastAttemptTimestamp = new Date().toISOString();
  }
}

let impl: any = null;

async function trySqliteInit() {
  try {
    const Better = await import('better-sqlite3').catch(() => null);
    if (Better) {
      const db = new Better.default(DB_PATH);
      db.exec(`
        CREATE TABLE IF NOT EXISTS reward_claims (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          claim_id TEXT NOT NULL UNIQUE,
          producer_id TEXT NOT NULL,
          allocation TEXT NOT NULL,
          status TEXT NOT NULL,
          attempts INTEGER DEFAULT 0,
          last_attempt_timestamp TEXT,
          tx_hash TEXT,
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      impl = {
        async init() {},
        async insert(r: RewardClaimRecord) {
          try {
            const stmt = db.prepare(`INSERT OR IGNORE INTO reward_claims (claim_id,producer_id,allocation,status,tx_hash,last_error,created_at,updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            stmt.run(r.claimId, r.producerId, JSON.stringify(r.allocation || {}), r.status, r.attempts ?? 0, r.lastAttemptTimestamp ?? null, r.txHash ?? null, r.lastError ?? null, r.createdAt ?? new Date().toISOString(), r.updatedAt ?? new Date().toISOString());
          } catch (e) {}
        },
        async listPending() {
          const rows = db.prepare(`SELECT * FROM reward_claims WHERE status IN ('PENDING','FAILED') ORDER BY created_at ASC`).all();
          return rows.map((row: any) => ({ ...row, allocation: JSON.parse(row.allocation) }));
        },
        async markSubmitted(claimId: string, txHash?: string) {
          db.prepare(`UPDATE reward_claims SET status = 'SUBMITTED', tx_hash = ?, last_attempt_timestamp = ?, updated_at = ? WHERE claim_id = ?`).run(txHash ?? null, new Date().toISOString(), new Date().toISOString(), claimId);
        },
        async markFailed(claimId: string, err?: string) {
          // increment attempts and set last_attempt_timestamp
          db.prepare(`UPDATE reward_claims SET status = 'FAILED', last_error = ?, attempts = COALESCE(attempts,0) + 1, last_attempt_timestamp = ?, updated_at = ? WHERE claim_id = ?`).run(err ?? null, new Date().toISOString(), new Date().toISOString(), claimId);
        },
        async markSettled(claimId: string, txHash?: string) {
          db.prepare(`UPDATE reward_claims SET status = 'SETTLED', tx_hash = ?, last_attempt_timestamp = ?, updated_at = ? WHERE claim_id = ?`).run(txHash ?? null, new Date().toISOString(), new Date().toISOString(), claimId);
        }
      };

      return true;
    }
  } catch (e) {}

  // Try sqlite3
  try {
    const sqlite3 = await import('sqlite3').catch(() => null);
    if (sqlite3) {
      const sqlite = sqlite3.default || sqlite3;
      const db = new sqlite.Database(DB_PATH);
      await new Promise((resolve, reject) => db.run(`
        CREATE TABLE IF NOT EXISTS reward_claims (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          claim_id TEXT NOT NULL UNIQUE,
          producer_id TEXT NOT NULL,
          allocation TEXT NOT NULL,
          status TEXT NOT NULL,
          attempts INTEGER DEFAULT 0,
          last_attempt_timestamp TEXT,
          tx_hash TEXT,
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `, (err) => err ? reject(err) : resolve()));

      impl = {
        async init() {},
        async insert(r: RewardClaimRecord) {
          const sql = `INSERT INTO reward_claims (claim_id, producer_id, allocation, status, attempts, last_attempt_timestamp, tx_hash, last_error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          await new Promise<void>((resolve, reject) => db.run(sql, [r.claimId, r.producerId, JSON.stringify(r.allocation || {}), r.status, r.txHash ?? null, r.lastError ?? null, r.createdAt ?? new Date().toISOString(), r.updatedAt ?? new Date().toISOString()], function (err) {
            if (err) {
              if (String(err.message).includes('UNIQUE constraint failed')) return resolve();
              return reject(err);
            }
            resolve();
          }));
        },
        async listPending() {
          return await new Promise<any[]>((resolve, reject) => db.all(`SELECT * FROM reward_claims WHERE status IN ('PENDING','FAILED') ORDER BY created_at ASC`, (err, rows) => err ? reject(err) : resolve(rows.map((r: any) => ({ ...r, allocation: JSON.parse(r.allocation) })))));
        },
        async markSubmitted(claimId: string, txHash?: string) {
          return await new Promise<void>((resolve, reject) => db.run(`UPDATE reward_claims SET status = 'SUBMITTED', tx_hash = ?, last_attempt_timestamp = ?, updated_at = ? WHERE claim_id = ?`, [txHash ?? null, new Date().toISOString(), new Date().toISOString(), claimId], (err) => err ? reject(err) : resolve()));
        },
        async markFailed(claimId: string, err?: string) {
          return await new Promise<void>((resolve, reject) => db.run(`UPDATE reward_claims SET status = 'FAILED', last_error = ?, attempts = COALESCE(attempts,0) + 1, last_attempt_timestamp = ?, updated_at = ? WHERE claim_id = ?`, [err ?? null, new Date().toISOString(), new Date().toISOString(), claimId], (e) => e ? reject(e) : resolve()));
        },
        async markSettled(claimId: string, txHash?: string) {
          return await new Promise<void>((resolve, reject) => db.run(`UPDATE reward_claims SET status = 'SETTLED', tx_hash = ?, last_attempt_timestamp = ?, updated_at = ? WHERE claim_id = ?`, [txHash ?? null, new Date().toISOString(), new Date().toISOString(), claimId], (e) => e ? reject(e) : resolve()));
        }
      };

      return true;
    }
  } catch (e) {}

  impl = new InMemoryStore();
  return false;
}

export async function initializeRewardClaimsDB(): Promise<void> {
  if (!impl) await trySqliteInit();
  if (impl && impl.init) await impl.init();
}

export async function persistRewardClaim(record: RewardClaimRecord): Promise<void> {
  if (!impl) await trySqliteInit();
  record.status = record.status ?? 'PENDING';
  record.createdAt = record.createdAt ?? new Date().toISOString();
  record.updatedAt = record.updatedAt ?? new Date().toISOString();
  return impl.insert(record);
}

export async function listPendingRewardClaims(): Promise<RewardClaimRecord[]> {
  if (!impl) await trySqliteInit();
  return impl.listPending();
}

export async function markRewardClaimSubmitted(claimId: string, txHash?: string): Promise<void> {
  if (!impl) await trySqliteInit();
  return impl.markSubmitted(claimId, txHash);
}

export async function markRewardClaimFailed(claimId: string, err?: string): Promise<void> {
  if (!impl) await trySqliteInit();
  return impl.markFailed(claimId, err);
}

export async function markRewardClaimSettled(claimId: string, txHash?: string): Promise<void> {
  if (!impl) await trySqliteInit();
  return impl.markSettled(claimId, txHash);
}

export const _impl = () => impl;

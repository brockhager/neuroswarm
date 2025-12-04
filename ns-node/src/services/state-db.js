import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * StateDatabase - SQLite persistence layer for NS-Node chain state
 * 
 * Provides persistent storage for:
 * - Blocks (header, txs, cumWeight, snapshots)
 * - Transaction index (txId -> block location)
 * - Validators (stake, publicKey, slashed status)
 * - Chain state (canonical tip, total stake)
 * - Governance proposals
 */
export class StateDatabase {
    constructor(dbPath = null) {
        // Default to data directory in ns-node
        if (!dbPath) {
            const dataDir = path.join(__dirname, '..', '..', 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            dbPath = path.join(dataDir, 'neuroswarm_chain.db');
        }

        this.dbPath = dbPath;
        this.db = new Database(dbPath);

        // Enable WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');

        this.initSchema();
        // Ensure accounts table has the is_validator_candidate column (migrate if needed)
        try {
            const info = this.db.prepare("PRAGMA table_info(accounts)").all();
            const hasCol = info.some(r => r.name === 'is_validator_candidate');
            if (!hasCol) {
                this.db.prepare("ALTER TABLE accounts ADD COLUMN is_validator_candidate INTEGER NOT NULL DEFAULT 0").run();
            }
        } catch (e) {
            // ignore migration errors
        }
    }

    initSchema() {
        this.db.exec(`
      -- Blocks table: stores complete block data
      CREATE TABLE IF NOT EXISTS blocks (
        blockHash TEXT PRIMARY KEY,
        parentHash TEXT NOT NULL,
        header TEXT NOT NULL,
        txs TEXT NOT NULL,
        cumWeight INTEGER NOT NULL,
        snapshot TEXT,
        createdAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_parent ON blocks(parentHash);
      CREATE INDEX IF NOT EXISTS idx_cumWeight ON blocks(cumWeight DESC);

      -- Transaction index: fast lookup of tx location
      CREATE TABLE IF NOT EXISTS tx_index (
        txId TEXT PRIMARY KEY,
        blockHash TEXT NOT NULL,
        txIndex INTEGER NOT NULL,
        FOREIGN KEY(blockHash) REFERENCES blocks(blockHash)
      );

      CREATE INDEX IF NOT EXISTS idx_tx_block ON tx_index(blockHash);

      -- Validators: stake, public keys, slashing status
      CREATE TABLE IF NOT EXISTS validators (
        validatorId TEXT PRIMARY KEY,
        stake INTEGER NOT NULL,
        publicKey TEXT NOT NULL,
        slashed INTEGER DEFAULT 0,
        slashedAt INTEGER,
        updatedAt INTEGER NOT NULL
      );

      -- Accounts: dual-token balances (NST/NSD)
      CREATE TABLE IF NOT EXISTS accounts (
        address TEXT PRIMARY KEY,
        nst_balance TEXT NOT NULL DEFAULT '0',
        nsd_balance TEXT NOT NULL DEFAULT '0',
                staked_nst TEXT NOT NULL DEFAULT '0',
                is_validator_candidate INTEGER NOT NULL DEFAULT 0,
        updatedAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nst_balance ON accounts(nst_balance);

      -- Chain state: canonical tip, total stake, config
      CREATE TABLE IF NOT EXISTS chain_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      -- Governance proposals
      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        yes INTEGER DEFAULT 0,
        no INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL
      );

      -- Heads tracking (blocks without children)
      CREATE TABLE IF NOT EXISTS heads (
        blockHash TEXT PRIMARY KEY,
        FOREIGN KEY(blockHash) REFERENCES blocks(blockHash)
      );

            -- Pending unstakes: amount locked with unlockAt timestamp (millis)
            CREATE TABLE IF NOT EXISTS pending_unstakes (
                id TEXT PRIMARY KEY,
                address TEXT NOT NULL,
                amount TEXT NOT NULL,
                unlockAt INTEGER NOT NULL,
                createdAt INTEGER NOT NULL
            );

            -- Released unstakes: records of releases so they can be reverted on reorg
            CREATE TABLE IF NOT EXISTS released_unstakes (
                id TEXT PRIMARY KEY,
                address TEXT NOT NULL,
                amount TEXT NOT NULL,
                releasedAt INTEGER NOT NULL
            );
    `);
    }

    // ==================== Block Operations ====================

    saveBlock(blockHash, block) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO blocks (blockHash, parentHash, header, txs, cumWeight, snapshot, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            blockHash,
            block.parentHash || '0'.repeat(64),
            JSON.stringify(block.header),
            JSON.stringify(block.txs || []),
            block.cumWeight || 0,
            block.snapshot ? JSON.stringify(block.snapshot) : null,
            Date.now()
        );
    }

    getBlock(blockHash) {
        const row = this.db.prepare('SELECT * FROM blocks WHERE blockHash = ?').get(blockHash);
        if (!row) return null;

        return {
            blockHash: row.blockHash,
            parentHash: row.parentHash,
            header: JSON.parse(row.header),
            txs: JSON.parse(row.txs),
            cumWeight: row.cumWeight,
            snapshot: row.snapshot ? JSON.parse(row.snapshot) : null
        };
    }

    getAllBlocks() {
        const rows = this.db.prepare('SELECT * FROM blocks ORDER BY createdAt ASC').all();
        const blocks = new Map();

        for (const row of rows) {
            blocks.set(row.blockHash, {
                blockHash: row.blockHash,
                parentHash: row.parentHash,
                header: JSON.parse(row.header),
                txs: JSON.parse(row.txs),
                cumWeight: row.cumWeight,
                snapshot: row.snapshot ? JSON.parse(row.snapshot) : null
            });
        }

        return blocks;
    }

    deleteBlock(blockHash) {
        // Note: Only use during reorg/cleanup
        this.db.prepare('DELETE FROM blocks WHERE blockHash = ?').run(blockHash);
    }

    // ==================== Transaction Index ====================

    saveTxIndex(txId, blockHash, txIndex) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tx_index(txId, blockHash, txIndex)
        VALUES(?, ?, ?)
            `);
        stmt.run(txId, blockHash, txIndex);
    }

    getTxLocation(txId) {
        const row = this.db.prepare('SELECT blockHash, txIndex FROM tx_index WHERE txId = ?').get(txId);
        return row ? { blockHash: row.blockHash, txIndex: row.txIndex } : null;
    }

    getAllTxIndex() {
        const rows = this.db.prepare('SELECT * FROM tx_index').all();
        const index = new Map();

        for (const row of rows) {
            index.set(row.txId, {
                blockHash: row.blockHash,
                txIndex: row.txIndex
            });
        }

        return index;
    }

    clearTxIndex() {
        this.db.prepare('DELETE FROM tx_index').run();
    }

    // ==================== Validator Operations ====================

    saveValidator(validatorId, validator) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO validators(validatorId, stake, publicKey, slashed, slashedAt, updatedAt)
        VALUES(?, ?, ?, ?, ?, ?)
            `);

        stmt.run(
            validatorId,
            validator.stake || 0,
            validator.publicKey,
            validator.slashed ? 1 : 0,
            validator.slashedAt || null,
            Date.now()
        );
    }

    getValidator(validatorId) {
        const row = this.db.prepare('SELECT * FROM validators WHERE validatorId = ?').get(validatorId);
        if (!row) return null;

        return {
            stake: row.stake,
            publicKey: row.publicKey,
            slashed: row.slashed === 1,
            slashedAt: row.slashedAt
        };
    }

    getAllValidators() {
        const rows = this.db.prepare('SELECT * FROM validators').all();
        const validators = new Map();

        for (const row of rows) {
            validators.set(row.validatorId, {
                stake: row.stake,
                publicKey: row.publicKey,
                slashed: row.slashed === 1,
                slashedAt: row.slashedAt
            });
        }

        return validators;
    }

    deleteValidator(validatorId) {
        this.db.prepare('DELETE FROM validators WHERE validatorId = ?').run(validatorId);
    }

    clearValidators() {
        this.db.prepare('DELETE FROM validators').run();
    }

    // ==================== Chain State ====================

    setChainState(key, value) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chain_state(key, value, updatedAt)
        VALUES(?, ?, ?)
            `);
        stmt.run(key, JSON.stringify(value), Date.now());
    }

    getChainState(key, defaultValue = null) {
        const row = this.db.prepare('SELECT value FROM chain_state WHERE key = ?').get(key);
        return row ? JSON.parse(row.value) : defaultValue;
    }

    getAllChainState() {
        const rows = this.db.prepare('SELECT * FROM chain_state').all();
        const state = {};

        for (const row of rows) {
            state[row.key] = JSON.parse(row.value);
        }

        return state;
    }

    // ==================== Heads Management ====================

    saveHead(blockHash) {
        const stmt = this.db.prepare('INSERT OR IGNORE INTO heads (blockHash) VALUES (?)');
        stmt.run(blockHash);
    }

    removeHead(blockHash) {
        this.db.prepare('DELETE FROM heads WHERE blockHash = ?').run(blockHash);
    }

    getAllHeads() {
        const rows = this.db.prepare('SELECT blockHash FROM heads').all();
        const heads = new Set();
        for (const row of rows) {
            heads.add(row.blockHash);
        }
        return heads;
    }

    clearHeads() {
        this.db.prepare('DELETE FROM heads').run();
    }

    // ==================== Proposals ====================

    saveProposal(id, proposal) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO proposals(id, title, yes, no, createdAt)
        VALUES(?, ?, ?, ?, ?)
            `);
        stmt.run(
            id,
            proposal.title,
            proposal.yes || 0,
            proposal.no || 0,
            proposal.createdAt || Date.now()
        );
    }

    getProposal(id) {
        const row = this.db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
        if (!row) return null;

        return {
            title: row.title,
            yes: row.yes,
            no: row.no,
            createdAt: row.createdAt
        };
    }

    getAllProposals() {
        const rows = this.db.prepare('SELECT * FROM proposals').all();
        const proposals = new Map();

        for (const row of rows) {
            proposals.set(row.id, {
                title: row.title,
                yes: row.yes,
                no: row.no,
                createdAt: row.createdAt
            });
        }

        return proposals;
    }

    // ==================== Pending Unstakes ====================

    savePendingUnstake(id, record) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pending_unstakes (id, address, amount, unlockAt, createdAt)
        VALUES(?, ?, ?, ?, ?)
        `);
        stmt.run(id, record.address, record.amount, record.unlockAt, record.createdAt || Date.now());
    }

    getPendingUnstake(id) {
        const row = this.db.prepare('SELECT * FROM pending_unstakes WHERE id = ?').get(id);
        if (!row) return null;
        return { id: row.id, address: row.address, amount: row.amount, unlockAt: row.unlockAt, createdAt: row.createdAt };
    }

    deletePendingUnstake(id) {
        this.db.prepare('DELETE FROM pending_unstakes WHERE id = ?').run(id);
    }

    saveReleasedUnstake(id, record) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO released_unstakes (id, address, amount, releasedAt)
        VALUES(?, ?, ?, ?)
        `);
        stmt.run(id, record.address, record.amount, record.releasedAt || Date.now());
    }

    getReleasedUnstake(id) {
        const row = this.db.prepare('SELECT * FROM released_unstakes WHERE id = ?').get(id);
        if (!row) return null;
        return { id: row.id, address: row.address, amount: row.amount, releasedAt: row.releasedAt };
    }

    deleteReleasedUnstake(id) {
        this.db.prepare('DELETE FROM released_unstakes WHERE id = ?').run(id);
    }

    getAllPendingUnstakes() {
        const rows = this.db.prepare('SELECT * FROM pending_unstakes ORDER BY createdAt ASC').all();
        const out = new Map();
        for (const r of rows) out.set(r.id, { id: r.id, address: r.address, amount: r.amount, unlockAt: r.unlockAt, createdAt: r.createdAt });
        return out;
    }

    // ==================== Account Operations ====================

    saveAccount(address, account) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO accounts (address, nst_balance, nsd_balance, staked_nst, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);

        stmt.run(
            address,
            account.nst_balance || '0',
            account.nsd_balance || '0',
            account.staked_nst || '0',
            Date.now()
        );
    }

    // Save account with validator candidate flag support
    saveAccountFull(address, account) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO accounts (address, nst_balance, nsd_balance, staked_nst, is_validator_candidate, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            address,
            account.nst_balance || '0',
            account.nsd_balance || '0',
            account.staked_nst || '0',
            account.is_validator_candidate ? 1 : 0,
            Date.now()
        );
    }

    getAccount(address) {
        const row = this.db.prepare('SELECT * FROM accounts WHERE address = ?').get(address);
        if (!row) return null;

        return {
            address: row.address,
            nst_balance: row.nst_balance,
            nsd_balance: row.nsd_balance,
            staked_nst: row.staked_nst,
            is_validator_candidate: row.is_validator_candidate || 0,
            updatedAt: row.updatedAt
        };
    }

    getAllAccounts() {
        const rows = this.db.prepare('SELECT * FROM accounts').all();
        const accounts = new Map();

        for (const row of rows) {
            accounts.set(row.address, {
                address: row.address,
                nst_balance: row.nst_balance,
                nsd_balance: row.nsd_balance,
                staked_nst: row.staked_nst,
                is_validator_candidate: row.is_validator_candidate || 0,
                updatedAt: row.updatedAt
            });
        }

        return accounts;
    }

    deleteAccount(address) {
        this.db.prepare('DELETE FROM accounts WHERE address = ?').run(address);
    }

    clearAccounts() {
        this.db.prepare('DELETE FROM accounts').run();
    }

    // ==================== Utility ====================

    beginTransaction() {
        this.db.prepare('BEGIN').run();
    }

    commit() {
        this.db.prepare('COMMIT').run();
    }

    rollback() {
        this.db.prepare('ROLLBACK').run();
    }

    close() {
        this.db.close();
    }

    // Get database stats
    getStats() {
        const blockCount = this.db.prepare('SELECT COUNT(*) as count FROM blocks').get().count;
        const validatorCount = this.db.prepare('SELECT COUNT(*) as count FROM validators').get().count;
        const txCount = this.db.prepare('SELECT COUNT(*) as count FROM tx_index').get().count;
        const accountCount = this.db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
        const proposalCount = this.db.prepare('SELECT COUNT(*) as count FROM proposals').get().count;

        return {
            blocks: blockCount,
            validators: validatorCount,
            transactions: txCount,
            accounts: accountCount,
            proposals: proposalCount,
            dbPath: this.dbPath
        };
    }
}

export default StateDatabase;

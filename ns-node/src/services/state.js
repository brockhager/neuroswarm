import { StateDatabase } from './state-db.js';

// Initialize database connection
// Allow tests to provide an isolated DB path via environment variable.
// This keeps integration tests deterministic and avoids polluting the shared DB.
const DB_PATH = process.env.NS_NODE_DB_PATH || null;
const db = new StateDatabase(DB_PATH);

// Load initial state from database on startup
console.log('[State] Loading chain state from database...');
const dbStats = db.getStats();
console.log('[State] Database stats:', dbStats);

// Load validators from DB or initialize empty
export const validators = db.getAllValidators();
console.log(`[State] Loaded ${validators.size} validators from DB`);

// Load blocks from DB or initialize empty
export const blockMap = db.getAllBlocks();
console.log(`[State] Loaded ${blockMap.size} blocks from DB`);

// Load tx index from DB or initialize empty
export const txIndex = db.getAllTxIndex();
console.log(`[State] Loaded ${txIndex.size} transaction indices from DB`);

// Load proposals from DB or initialize empty
export const proposals = db.getAllProposals();
console.log(`[State] Loaded ${proposals.size} proposals from DB`);

// Load accounts from DB or initialize empty
export const accounts = db.getAllAccounts();
console.log(`[State] Loaded ${accounts.size} accounts from DB`);

// Load pending unstakes
export const pendingUnstakes = db.getAllPendingUnstakes();
console.log(`[State] Loaded ${pendingUnstakes.size} pending unstakes from DB`);

// Initialize NS Shared Pool if not exists
const NS_SHARED_POOL_ADDRESS = 'ns-rewards-pool';
if (!accounts.has(NS_SHARED_POOL_ADDRESS)) {
    const poolAccount = {
        address: NS_SHARED_POOL_ADDRESS,
        nst_balance: '0',
        nsd_balance: '0',
        staked_nst: '0',
        updatedAt: Date.now()
    };
    accounts.set(NS_SHARED_POOL_ADDRESS, poolAccount);
    db.saveAccount(NS_SHARED_POOL_ADDRESS, poolAccount);
    console.log('[State] Initialized NS Shared Pool account');
}

// Load heads from DB or initialize by computing from blockMap
export const heads = db.getAllHeads();
if (heads.size === 0 && blockMap.size > 0) {
    // Recompute heads as blocks without children
    console.log('[State] Recomputing heads from block map...');
    const childExists = new Set();
    for (const [hash, block] of blockMap.entries()) {
        if (block.parentHash && block.parentHash !== '0'.repeat(64)) {
            childExists.add(block.parentHash);
        }
    }
    for (const [hash] of blockMap.entries()) {
        if (!childExists.has(hash)) {
            heads.add(hash);
            db.saveHead(hash);
        }
    }
    console.log(`[State] Computed ${heads.size} heads`);
}

// Load chain state from DB
const loadedState = db.getAllChainState();
export const state = {
    canonicalTipHash: loadedState.canonicalTipHash || null,
    totalStake: loadedState.totalStake || 0,
    slashPct: loadedState.slashPct || 10
};

console.log(`[State] Canonical tip: ${state.canonicalTipHash || 'none'}`);
console.log(`[State] Total stake: ${state.totalStake}`);

// ==================== Persistence Helpers ====================

/**
 * Persist validator to database
 */
export function persistValidator(validatorId, validator) {
    db.saveValidator(validatorId, validator);
}

/**
 * Persist all validators to database (for bulk operations)
 */
export function persistAllValidators() {
    for (const [id, v] of validators.entries()) {
        db.saveValidator(id, v);
    }
}

/**
 * Persist block to database
 */
export function persistBlock(blockHash, block) {
    db.saveBlock(blockHash, block);
}

/**
 * Persist transaction index entry
 */
export function persistTxIndex(txId, blockHash, txIndex) {
    db.saveTxIndex(txId, blockHash, txIndex);
}

/**
 * Persist chain state to database
 */
export function persistChainState() {
    db.setChainState('canonicalTipHash', state.canonicalTipHash);
    db.setChainState('totalStake', state.totalStake);
    db.setChainState('slashPct', state.slashPct);
}

/**
 * Persist proposal to database
 */
export function persistProposal(id, proposal) {
    db.saveProposal(id, proposal);
}

/**
 * Persist account to database
 */
export function persistAccount(address, account) {
    // Use saveAccountFull which includes is_validator_candidate
    if (typeof db.saveAccountFull === 'function') db.saveAccountFull(address, account);
    else db.saveAccount(address, account);
}

export function persistPendingUnstake(id, record) {
    db.savePendingUnstake(id, record);
}

export function removePendingUnstake(id) {
    db.deletePendingUnstake(id);
}

export function persistReleasedUnstake(id, record) {
    if (typeof db.saveReleasedUnstake === 'function') db.saveReleasedUnstake(id, record);
}

export function getReleasedUnstake(id) {
    if (typeof db.getReleasedUnstake === 'function') return db.getReleasedUnstake(id);
    return null;
}

export function removeReleasedUnstake(id) {
    if (typeof db.deleteReleasedUnstake === 'function') db.deleteReleasedUnstake(id);
}

/**
 * Add head and persist
 */
export function addHead(blockHash) {
    heads.add(blockHash);
    db.saveHead(blockHash);
}

/**
 * Remove head and persist
 */
export function removeHead(blockHash) {
    heads.delete(blockHash);
    db.removeHead(blockHash);
}

/**
 * Get full database statistics
 */
export function getDatabaseStats() {
    return db.getStats();
}

/**
 * Begin database transaction (for atomic operations during reorg)
 */
export function beginTransaction() {
    db.beginTransaction();
}

/**
 * Commit database transaction
 */
export function commitTransaction() {
    db.commit();
}

/**
 * Rollback database transaction
 */
export function rollbackTransaction() {
    db.rollback();
}

/**
 * Clear tx index (used during reorg)
 */
export function clearTxIndex() {
    txIndex.clear();
    db.clearTxIndex();
}

// ==================== Existing Helper Functions ====================

export function getCanonicalHeight() {
    let h = state.canonicalTipHash;
    let height = 0;
    while (h && blockMap.has(h)) {
        height += 1;
        h = blockMap.get(h).parentHash;
    }
    return height;
}

export function getBlockAncestors(hash) {
    const ancestors = [];
    let curr = hash;
    while (curr && blockMap.has(curr)) {
        ancestors.push(curr);
        curr = blockMap.get(curr).parentHash;
    }
    return ancestors; // from child up to genesis
}

export function findCommonAncestor(hashA, hashB) {
    const aAnc = new Set(getBlockAncestors(hashA));
    let curr = hashB;
    while (curr && blockMap.has(curr)) {
        if (aAnc.has(curr)) return curr;
        curr = blockMap.get(curr).parentHash;
    }
    return null;
}

// Export database instance for direct access if needed
export { db };

import fetch from 'node-fetch';
import {
    blockMap, heads, txIndex, validators, state, accounts,
    getBlockAncestors, findCommonAncestor,
    persistValidator, persistChainState, persistBlock, persistTxIndex,
    persistAllValidators, addHead, removeHead, clearTxIndex, persistAccount
} from './state.js';
import {
    sha256Hex, canonicalize, txIdFor, verifyEd25519, computeMerkleRoot
} from '../utils/crypto.js';
import { logNs } from '../utils/logger.js';
import { getGatewayConfig } from './gateway.js';

// Tokenomics Constants
const COIN = 100000000n; // 1 NST = 10^8 atomic units
const INITIAL_REWARD = 50000000n; // 0.5 NST
const HALVING_INTERVAL = 14700000;
const NS_SHARED_POOL_ADDRESS = 'ns-rewards-pool';

export function calculateBlockReward(height) {
    const cycle = Math.floor(height / HALVING_INTERVAL);
    if (cycle >= 64) return 0n;
    return INITIAL_REWARD >> BigInt(cycle);
}

export function chooseValidator(prevHash, slot) {
    // deterministic selection: seed = sha256(prevHash + slot)
    const seed = sha256Hex(Buffer.from(String(prevHash) + String(slot), 'utf8'));
    const seedNum = parseInt(seed.slice(0, 12), 16);
    if (state.totalStake === 0) return null;
    const r = seedNum % state.totalStake;
    let acc = 0;
    for (const [id, v] of validators.entries()) {
        acc += Number(v.stake || 0);
        if (r < acc) return id;
    }
    return null;
}

export function doSlash(id) {
    if (!validators.has(id)) return;
    const vv = validators.get(id);
    if (vv.slashed) return; // only once
    const toSlash = Math.min(vv.stake, Math.floor((vv.stake * state.slashPct) / 100));
    vv.stake -= toSlash;
    state.totalStake -= toSlash;
    vv.slashed = true;
    vv.slashedAt = Date.now();
    // Persist validator and chain state changes
    persistValidator(id, vv);
    persistChainState();
    logNs('WARN', `Slashed validator ${id} by ${toSlash} (${state.slashPct}%) due to equivocation`);
}

export async function performReorg(oldTipHash, newTipHash) {
    if (!newTipHash) return;
    const ancestor = findCommonAncestor(oldTipHash, newTipHash);
    // rollback blocks from old tip down to ancestor (exclusive)
    const rollbackHashes = [];
    if (oldTipHash) {
        let h = oldTipHash;
        while (h && h !== ancestor) {
            if (!blockMap.has(h)) break;
            rollbackHashes.push(h);
            h = blockMap.get(h).parentHash;
        }
    }
    // accumulate apply chain from ancestor's child to new tip
    const applyHashes = [];
    let h = newTipHash;
    while (h && h !== ancestor) {
        if (!blockMap.has(h)) break;
        applyHashes.push(h);
        h = blockMap.get(h).parentHash;
    }
    applyHashes.reverse();
    // rollback: we will restore validator state to ancestor snapshot if ancestor exists, else genesis
    if (ancestor) {
        const ancBlock = blockMap.get(ancestor);
        const snapArr = ancBlock.snapshot && ancBlock.snapshot.validators ? ancBlock.snapshot.validators : [];
        validators.clear();
        for (const [id, v] of snapArr) validators.set(id, { stake: Number(v.stake), publicKey: v.publicKey });
    } else {
        // ancestor is null (genesis): do not clear global validator registrations here.
        // Keep global validators (registrations) as they are; snapshots are used only
        // for branch-local state during reorgs.
    }
    // rebuild txIndex and mempool: collect txs removed by rollback, clear mempool, then replay canonical chain
    clearTxIndex();
    const removedTxIds = new Set();
    if (rollbackHashes.length > 0) {
        for (const rh of rollbackHashes) {
            const rb = blockMap.get(rh);
            if (!rb) continue;
            for (const t of rb.txs) removedTxIds.add(txIdFor(t));
        }
    }
    // NS does not own a mempool; gateway manages pending txs. No local mempool clearing.
    const requeueCandidates = [];
    // replay blocks from genesis up to ancestor (if any)
    const canonicalPath = [];
    if (ancestor) {
        // get ancestors of ancestor to genesis and reverse
        let at = ancestor;
        const ancestorsWithGen = [];
        while (at) { ancestorsWithGen.push(at); at = blockMap.get(at).parentHash; }
        ancestorsWithGen.reverse();
        for (const bh of ancestorsWithGen) canonicalPath.push(bh);
    }
    // append applyHashes
    canonicalPath.push(...applyHashes);
    // reapply state along canonicalPath
    for (const bh of canonicalPath) {
        const b = blockMap.get(bh);
        // process stake/unstake and txIndex
        for (let i = 0; i < b.txs.length; i++) {
            const tx = b.txs[i];
            const id = txIdFor(tx);
            txIndex.set(id, { blockHash: bh, txIndex: i });
            // gateway manages mempool; NS does not delete consumed txs locally
            if (tx.type === 'stake') {
                if (!validators.has(tx.validatorId)) validators.set(tx.validatorId, { stake: 0, publicKey: tx.publicKey || 'unknown' });
                const vv = validators.get(tx.validatorId);
                vv.stake += Number(tx.amount);
                state.totalStake += Number(tx.amount);
            }
            if (tx.type === 'unstake') {
                if (validators.has(tx.validatorId)) {
                    const vv = validators.get(tx.validatorId);
                    const amt = Math.min(Number(tx.amount), vv.stake);
                    vv.stake -= amt;
                    state.totalStake -= amt;
                }
            }
        }
        // reward validator
        const totalFees = b.txs.reduce((s, tx) => s + Number(tx.fee || 0), 0);
        const baseReward = Number(process.env.BLOCK_REWARD || 10);
        const reward = baseReward + totalFees;
        const vv = validators.get(b.header.validatorId);
        if (vv) { vv.stake += reward; state.totalStake += reward; }
    }
    // any removed txs that are NOT now part of the canonical chain should be re-added to mempool
    // but NS is lightweight; instead, request gateway to requeue them
    for (const txId of removedTxIds) {
        if (!txIndex.has(txId)) {
            // we don't have original tx data reconstructed here; instead, leave placeholder or skip
            // Attempt to find tx in blocks for data
            let found = null;
            for (const h of rollbackHashes) {
                const rb = blockMap.get(h);
                if (!rb) continue;
                for (const tx of rb.txs) {
                    if (txIdFor(tx) === txId) { found = tx; break; }
                }
                if (found) break;
            }
            // gateway manages re-adding any txs post-reorg; NS does not re-add to mempool
            if (found) requeueCandidates.push(found);
        }
    }
    // update heads: remove tip of old chain and add newTip
    if (oldTipHash) {
        // find any heads from old chain that are no longer heads
        // we'll cleanup by recomputing heads as blocks without children
    }
    // refresh heads set (blocks that have no children)
    const childExists = new Set();
    for (const [hsh, bl] of blockMap.entries()) {
        if (bl.parentHash) childExists.add(bl.parentHash);
    }
    heads.clear();
    for (const [hsh] of blockMap.entries()) if (!childExists.has(hsh)) heads.add(hsh);

    // Send requeue request to gateway for any removed txs that we reconstructed
    if (requeueCandidates.length > 0) {
        try {
            const GATEWAY_CONFIG = getGatewayConfig();
            const gw = GATEWAY_CONFIG && GATEWAY_CONFIG.length ? GATEWAY_CONFIG[0] : null;
            if (gw && gw.url) {
                const url = gw.url.replace(/\/$/, '') + '/v1/mempool/requeue';
                const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txs: requeueCandidates }) });
                if (res.ok) {
                    const j = await res.json().catch(() => null);
                    logNs(`Requeued ${requeueCandidates.length} tx(s) to gateway ${gw.url} response=${JSON.stringify(j)}`);
                } else {
                    logNs(`Failed to requeue txs to ${gw.url} status=${res.status}`);
                }
            }
        } catch (e) {
            logNs(`Exception requeue txs to gateway: ${e.message}`);
        }
    }
}

export async function chooseCanonicalTipAndReorg() {
    // pick head with maximum cumWeight
    let bestHash = null;
    let bestWeight = -1;
    for (const h of heads) {
        const b = blockMap.get(h);
        if (!b) continue;
        if (b.cumWeight > bestWeight) {
            bestWeight = b.cumWeight; bestHash = h;
        }
    }
    if (!bestHash) return;
    if (state.canonicalTipHash === bestHash) return; // no change
    // New canonical chain tip found: perform reorg from canonicalTipHash to bestHash
    const oldTip = state.canonicalTipHash;
    state.canonicalTipHash = bestHash;
    try {
        await performReorg(oldTip, bestHash);
    } catch (e) {
        logNs(`performReorg error: ${e.message}`);
    }
}

export function applyBlock(block) {
    // Verify merkle root
    const txIds = block.txs.map(tx => txIdFor(tx));
    const calcRoot = computeMerkleRoot(txIds);
    if (calcRoot !== block.header.merkleRoot) return { ok: false, reason: 'bad_merkle' };
    // verify validator registration
    const validatorId = block.header.validatorId;
    if (!validators.has(validatorId)) return { ok: false, reason: 'unknown_validator' };
    const v = validators.get(validatorId);
    // verify header signature using ed25519 public key
    // Build canonical header data excluding the signature key entirely to match signing input.
    const { signature: _sigIgnored, ...headerNoSig } = block.header;
    const headerData = canonicalize(headerNoSig);
    const sigPreview = (block.header.signature || '').toString().slice(0, 32);
    logNs('DEBUG', 'Verifying header signature validator=', validatorId, 'sigPreview=', sigPreview);
    const verified = verifyEd25519(v.publicKey, headerData, block.header.signature);
    if (!verified) {
        logNs('DEBUG', 'Signature verification failed headerDataLength=', headerData.length);
        return { ok: false, reason: 'bad_sig' };
    }
    // verify prevHash references a known parent or genesis
    const parentHash = block.header.prevHash;
    const genesisPrev = '0'.repeat(64);
    let parent = null;
    if (parentHash !== genesisPrev) {
        if (!blockMap.has(parentHash)) return { ok: false, reason: 'unknown_parent' };
        parent = blockMap.get(parentHash);
    }
    // determine the slot based on parent height
    const parentHeight = parent ? getBlockAncestors(parentHash).length : 0;
    const slot = parentHeight + 1;
    const eligible = chooseValidator(parentHash, slot);
    if (eligible !== validatorId) {
        logNs('WARN', `Warning: validator ${validatorId} proposed block for slot ${slot} but deterministic selection was ${eligible}; accepting anyway (fork support)`);
        // allow forks: do not reject; accept validly-signed blocks even if not selected
    }
    // compute block hash and parent
    const blockHash = sha256Hex(Buffer.from(canonicalize(block.header), 'utf8'));
    block.blockHash = blockHash;
    block.parentHash = parentHash;
    // compute cumulative weight with respect to parent's snapshot state
    const parentWeight = parent ? parent.cumWeight : 0;
    // compute snapshot base as parent's snapshot if available, else current validators
    const baseSnapArr = parent ? JSON.parse(JSON.stringify(parent.snapshot.validators)) : JSON.parse(JSON.stringify(Array.from(validators.entries())));
    // find validator stake from base snapshot
    let vStake = 0;
    for (const [id, vs] of baseSnapArr) {
        if (id === validatorId) { vStake = Number(vs.stake || 0); break; }
    }
    block.cumWeight = parentWeight + (Number(vStake) || 0);
    //copy snapshot without mutating global state for branch blocks
    const snapshot = { validators: JSON.parse(JSON.stringify(baseSnapArr)) };
    block.snapshot = snapshot;
    blockMap.set(blockHash, block);

    // Persist block to database
    persistBlock(blockHash, block);

    addHead(blockHash);
    let totalFees = 0;
    // determine if the block extends the current canonical tip (and therefore should update global state)
    const extendsCanonical = (parentHash === state.canonicalTipHash);
    const consumedIds = [];
    for (let i = 0; i < block.txs.length; i++) {
        const id = txIdFor(block.txs[i]);
        if (extendsCanonical) {
            txIndex.set(id, { blockHash, txIndex: i });
            persistTxIndex(id, blockHash, i);
            consumedIds.push(id);
        }
        totalFees += Number(block.txs[i].fee || 0);
        // process stake/unstake
        const tx = block.txs[i];
        if (tx.type === 'stake' && tx.validatorId && Number(tx.amount)) {
            const target = tx.validatorId;
            if (extendsCanonical) {
                if (!validators.has(target)) validators.set(target, { stake: 0, publicKey: tx.publicKey || 'unknown' });
                const vv = validators.get(target);
                vv.stake += Number(tx.amount);
                state.totalStake += Number(tx.amount);
                persistValidator(target, vv);
            } else {
                // apply to snapshot validators
                const idx = snapshot.validators.findIndex(([id]) => id === target);
                if (idx === -1) snapshot.validators.push([target, { stake: Number(tx.amount), publicKey: tx.publicKey || 'unknown' }]);
                else snapshot.validators[idx][1].stake += Number(tx.amount);
            }
        }
        if (tx.type === 'unstake' && tx.validatorId && Number(tx.amount)) {
            const target = tx.validatorId;
            if (extendsCanonical) {
                if (validators.has(target)) {
                    const vv = validators.get(target);
                    const amt = Math.min(Number(tx.amount), vv.stake);
                    vv.stake -= amt;
                    state.totalStake -= amt;
                    persistValidator(target, vv);
                }
            } else {
                const idx = snapshot.validators.findIndex(([id]) => id === target);
                if (idx !== -1) {
                    const vv = snapshot.validators[idx][1];
                    const amt = Math.min(Number(tx.amount), vv.stake);
                    vv.stake -= amt;
                }
            }
        }
    }
    // reward validator
    const height = block.header.height || (parentHeight + 1);
    const nstReward = calculateBlockReward(height);

    // Calculate total NSD fees
    let totalNsdFees = 0n;
    for (const tx of block.txs) {
        totalNsdFees += BigInt(tx.fee || 0);
    }

    // Split NSD fees: 90% to validator, 10% to shared pool
    const validatorShare = (totalNsdFees * 9n) / 10n;
    const poolShare = totalNsdFees - validatorShare;

    if (extendsCanonical) {
        // Update validator stake (consensus weight)
        // Note: In this model, stake might be separate from liquid NST balance.
        // For now, we add reward to stake to maintain existing behavior, 
        // BUT we also need to credit the account balance.
        // The prompt says "Mint... and transfer it to the winning Validator".
        // We will credit the account. Stake updates via transactions (stake/unstake) are separate.
        // However, existing code adds reward to stake. We should probably keep that for consensus security
        // if the model implies auto-compounding, OR separate it.
        // "Mint the calculated Dynamic NST Block Reward and transfer it to the winning Validator (VP-Node)."
        // This implies liquid balance.
        // Let's update the Account.

        // 1. Get/Create Validator Account
        let valAccount = accounts.get(validatorId);
        if (!valAccount) {
            valAccount = {
                address: validatorId,
                nst_balance: '0',
                nsd_balance: '0',
                staked_nst: '0',
                updatedAt: Date.now()
            };
            accounts.set(validatorId, valAccount);
        }

        // 2. Credit NST Reward
        const currentNst = BigInt(valAccount.nst_balance);
        valAccount.nst_balance = (currentNst + nstReward).toString();

        // 3. Credit NSD Fee Share
        const currentNsd = BigInt(valAccount.nsd_balance);
        valAccount.nsd_balance = (currentNsd + validatorShare).toString();

        // 4. Persist Validator Account
        persistAccount(validatorId, valAccount);

        // 5. Credit Pool Share
        if (poolShare > 0n) {
            let poolAccount = accounts.get(NS_SHARED_POOL_ADDRESS);
            // Pool should exist from startup, but safety check
            if (!poolAccount) {
                poolAccount = {
                    address: NS_SHARED_POOL_ADDRESS,
                    nst_balance: '0',
                    nsd_balance: '0',
                    staked_nst: '0',
                    updatedAt: Date.now()
                };
                accounts.set(NS_SHARED_POOL_ADDRESS, poolAccount);
            }
            const currentPoolNsd = BigInt(poolAccount.nsd_balance);
            poolAccount.nsd_balance = (currentPoolNsd + poolShare).toString();
            persistAccount(NS_SHARED_POOL_ADDRESS, poolAccount);
        }

        // Update total stake if we are auto-compounding? 
        // The prompt doesn't explicitly say auto-compound. 
        // "Mint... and transfer it to the winning Validator". Usually means liquid.
        // Existing code: v.stake += reward. 
        // I will COMMENT OUT the auto-stake increase to strictly follow "transfer to... nst_balance".
        // Validators must explicitly stake if they want to compound.
        // v.stake += Number(nstReward); // DISABLED for strict separation
        // state.totalStake += Number(nstReward); // DISABLED

        // Update canonical tip and persist chain state
        state.canonicalTipHash = blockHash;
        persistChainState();
    } else {
        // update snapshot validator
        // For branch blocks, we don't update global accounts.
        // We only update the snapshot validators if we were tracking rewards there.
        // Since we moved to account-based rewards, snapshot validators (which track stake)
        // might not need update unless we auto-compound.
        // If we don't auto-compound, we don't touch snapshot stake.

        // However, to keep `cumWeight` accurate if it depends on stake, we might need to know.
        // But `cumWeight` is usually static stake + work.
        // If we stop auto-compounding, `cumWeight` won't grow by rewards.

        const idx = snapshot.validators.findIndex(([id]) => id === validatorId);
        // if (idx !== -1) snapshot.validators[idx][1].stake += reward; // DISABLED

        // Re-persist block with updated snapshot
        persistBlock(blockHash, block);
    }

    return { ok: true, blockHash };
}

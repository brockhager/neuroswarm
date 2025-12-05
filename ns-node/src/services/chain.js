import fetch from 'node-fetch';
import EventEmitter from 'events';
import {
    blockMap, heads, txIndex, validators, state, accounts, pendingUnstakes,
    getBlockAncestors, findCommonAncestor,
    persistValidator, persistChainState, persistBlock, persistTxIndex,
    persistAllValidators, addHead, removeHead, clearTxIndex, persistAccount
    , persistPendingUnstake, removePendingUnstake, persistReleasedUnstake, getReleasedUnstake, removeReleasedUnstake, beginTransaction, commitTransaction, rollbackTransaction, db
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

/**
 * CN-07-A: getProducer(height)
 * Deterministically selects the block producer for a given height based on stake weight.
 * Uses the canonical tip hash and height to seed selection, ensuring the same height
 * always returns the same producer (deterministic), and higher stake yields higher
 * selection frequency (stake-weighted).
 * 
 * @param {number} height - The block height for which to select a producer
 * @returns {string|null} - The validator ID (address) selected to produce the block, or null if no eligible validators
 */
export function getProducer(height) {
    // Use canonical tip hash as prevHash seed; if no canonical tip exists, use genesis placeholder
    const prevHash = state.canonicalTipHash || '0'.repeat(64);

    // Filter only active validator candidates with stake >= minimum (5,000 NST = 500,000,000,000 atomic units)
    const MIN_STAKE = 500000000000; // 5,000 NST in atomic units
    const eligible = [];
    let eligibleTotalStake = 0;

    for (const [id, v] of validators.entries()) {
        const acct = accounts.get(id);
        // Only include validators that are registered candidates with sufficient stake and not slashed
        if (acct && acct.is_validator_candidate && !v.slashed && Number(v.stake || 0) >= MIN_STAKE) {
            eligible.push({ id, stake: Number(v.stake || 0) });
            eligibleTotalStake += Number(v.stake || 0);
        }
    }

    if (eligible.length === 0 || eligibleTotalStake === 0) return null;

    // Deterministic seed from prevHash + height
    const seed = sha256Hex(Buffer.from(String(prevHash) + String(height), 'utf8'));
    const seedNum = parseInt(seed.slice(0, 12), 16);
    const r = seedNum % eligibleTotalStake;

    // Weighted selection
    let acc = 0;
    for (const v of eligible) {
        acc += v.stake;
        if (r < acc) return v.id;
    }

    // Fallback: return last eligible validator
    return eligible[eligible.length - 1].id;
}

// Helper: synchronize a validator's staking weight from account.staked_nst
export function syncValidatorStakeFromAccount(address) {
    try {
        const acct = accounts.get(address);
        const currentStake = acct ? BigInt(acct.staked_nst || '0') : 0n;
        const newStakeNum = Number(currentStake);
        const prev = validators.get(address);
        const prevStakeNum = prev ? Number(prev.stake || 0) : 0;
        if (!validators.has(address)) {
            // only add if account marked as candidate
            if (acct && acct.is_validator_candidate) {
                validators.set(address, { stake: newStakeNum, publicKey: prev ? prev.publicKey : 'unknown', slashed: prev ? !!prev.slashed : false });
                persistValidator(address, validators.get(address));
                state.totalStake += newStakeNum;
                persistChainState();
            }
        } else {
            // update and adjust totalStake
            const vv = validators.get(address);
            if (vv) {
                vv.stake = newStakeNum;
                persistValidator(address, vv);
                state.totalStake = Math.max(0, state.totalStake - prevStakeNum + newStakeNum);
                persistChainState();
            }
        }
    } catch (e) {
        logNs('ERROR', 'syncValidatorStakeFromAccount failed', e.message);
    }
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
        // Restore validators from ancestor snapshot and recompute totalStake from snapshot
        validators.clear();
        let restoredTotal = 0;
        for (const [id, v] of snapArr) {
            const stakeNum = Number(v && v.stake || 0);
            validators.set(id, { stake: stakeNum, publicKey: v.publicKey });
            restoredTotal += stakeNum;
        }
        state.totalStake = restoredTotal;
        persistChainState();
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
    // canonicalPath is the ordered list of blocks to replay for the new canonical chain.
    // applyHashes was collected from newTip back to ancestor (exclusive) and reversed,
    // which yields the correct order from ancestor's child up to newTip; if ancestor is null
    // applyHashes already contains the full chain from genesis up to newTip.
    const canonicalPath = applyHashes;
    // reapply state along canonicalPath
    for (const bh of canonicalPath) {
        const b = blockMap.get(bh);
        // process transactions in canonical replay: handle validator-level and account-level staking
        for (let i = 0; i < b.txs.length; i++) {
            const tx = b.txs[i];
            const id = txIdFor(tx);
            txIndex.set(id, { blockHash: bh, txIndex: i });

            // validator-level stake/unstake (legacy)
            if (tx.type === 'stake' && tx.validatorId) {
                if (!validators.has(tx.validatorId)) validators.set(tx.validatorId, { stake: 0, publicKey: tx.publicKey || 'unknown' });
                const vv = validators.get(tx.validatorId);
                vv.stake += Number(tx.amount);
                state.totalStake += Number(tx.amount);
                persistValidator(tx.validatorId, vv);
            }
            if (tx.type === 'unstake' && tx.validatorId) {
                if (validators.has(tx.validatorId)) {
                    const vv = validators.get(tx.validatorId);
                    const amt = Math.min(Number(tx.amount), vv.stake);
                    vv.stake -= amt;
                    state.totalStake -= amt;
                    persistValidator(tx.validatorId, vv);
                }
            }

            // account-level staking (NST_STAKE / NST_UNSTAKE / REGISTER_VALIDATOR)
            if (tx.type === 'NST_STAKE' && tx.from && Number(tx.amount)) {
                const addr = tx.from;
                let acct = accounts.get(addr);
                if (!acct) {
                    acct = { address: addr, nst_balance: '0', nsd_balance: '0', staked_nst: '0', updatedAt: Date.now() };
                    accounts.set(addr, acct);
                }
                const amt = BigInt(tx.amount);
                const curBal = BigInt(acct.nst_balance || '0');
                const curStaked = BigInt(acct.staked_nst || '0');
                // On replay we assume txs were valid previously; clamp to available funds
                const withdraw = amt > curBal ? curBal : amt;
                acct.nst_balance = (curBal - withdraw).toString();
                acct.staked_nst = (curStaked + withdraw).toString();
                acct.updatedAt = Date.now();
                persistAccount(addr, acct);
                if (acct.is_validator_candidate) syncValidatorStakeFromAccount(addr);
            }

            if (tx.type === 'NST_UNSTAKE' && tx.from && Number(tx.amount)) {
                const addr = tx.from;
                let acct = accounts.get(addr);
                if (!acct) continue; // nothing to do
                const amt = BigInt(tx.amount);
                const curStaked = BigInt(acct.staked_nst || '0');
                const withdraw = amt > curStaked ? curStaked : amt;
                acct.staked_nst = (curStaked - withdraw).toString();
                acct.updatedAt = Date.now();
                const txId = id;
                const unlockAt = Date.now() + (7 * 24 * 60 * 60 * 1000);
                const pending = { id: txId, address: addr, amount: withdraw.toString(), unlockAt, createdAt: Date.now() };
                pendingUnstakes.set(txId, pending);
                persistAccount(addr, acct);
                persistPendingUnstake(txId, pending);
                if (acct.is_validator_candidate) syncValidatorStakeFromAccount(addr);
            }

            if (tx.type === 'REGISTER_VALIDATOR' && tx.from) {
                const addr = tx.from;
                let acct = accounts.get(addr);
                if (!acct) continue;
                acct.is_validator_candidate = true;
                acct.updatedAt = Date.now();
                persistAccount(addr, acct);
                // sync the validator stake from the account's staked_nst
                syncValidatorStakeFromAccount(addr);
            }
        }

        // reward validator: credit account balances (not auto-compound into stake)
        const totalFees = b.txs.reduce((s, tx) => s + Number(tx.fee || 0), 0);
        const baseReward = Number(process.env.BLOCK_REWARD || 10);
        const reward = baseReward; // nst reward in atomic units (Number)
        const nstReward = BigInt(reward);
        const validatorShare = BigInt(Math.floor((Number(totalFees) * 9) / 10));
        const poolShare = BigInt(totalFees) - validatorShare;

        if (typeof b.header !== 'undefined') {
            const vid = b.header.validatorId;
            if (vid) {
                // credit account balances for validator
                let valAccount = accounts.get(vid);
                if (!valAccount) {
                    valAccount = { address: vid, nst_balance: '0', nsd_balance: '0', staked_nst: '0', updatedAt: Date.now() };
                    accounts.set(vid, valAccount);
                }
                // add nstReward to nst_balance
                valAccount.nst_balance = (BigInt(valAccount.nst_balance || '0') + nstReward).toString();
                // credit NSD fees (validatorShare)
                valAccount.nsd_balance = (BigInt(valAccount.nsd_balance || '0') + validatorShare).toString();
                persistAccount(vid, valAccount);

                // credit pool share
                if (poolShare > 0n) {
                    const NS_SHARED_POOL_ADDRESS = 'ns-rewards-pool';
                    let poolAccount = accounts.get(NS_SHARED_POOL_ADDRESS);
                    if (!poolAccount) {
                        poolAccount = { address: NS_SHARED_POOL_ADDRESS, nst_balance: '0', nsd_balance: '0', staked_nst: '0', updatedAt: Date.now() };
                        accounts.set(NS_SHARED_POOL_ADDRESS, poolAccount);
                    }
                    poolAccount.nsd_balance = (BigInt(poolAccount.nsd_balance || '0') + poolShare).toString();
                    persistAccount(NS_SHARED_POOL_ADDRESS, poolAccount);
                }
            }
        }
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
            if (found) {
                // If this tx was an NST_UNSTAKE and already released, we must revert the release
                try {
                    if (found.type === 'NST_UNSTAKE') {
                        const rel = getReleasedUnstake(txId);
                        if (rel) {
                            // Revert release atomically
                            beginTransaction();
                            // subtract released amount from account nst_balance
                            let acctRow = db.getAccount(rel.address) || { address: rel.address, nst_balance: '0', nsd_balance: '0', staked_nst: '0', is_validator_candidate: 0 };
                            const releasedAmt = BigInt(rel.amount || '0');
                            const currentBal = BigInt(acctRow.nst_balance || '0');
                            // guard: avoid negative balances
                            const newBal = currentBal >= releasedAmt ? currentBal - releasedAmt : 0n;
                            acctRow.nst_balance = newBal.toString();
                            acctRow.updatedAt = Date.now();
                            // persist account
                            if (typeof db.saveAccountFull === 'function') db.saveAccountFull(rel.address, acctRow);
                            else db.saveAccount(rel.address, acctRow);

                            // recreate pending_unstake (use now + 7 days as unlock window)
                            const recreated = { id: txId, address: rel.address, amount: rel.amount, unlockAt: Date.now() + (7 * 24 * 60 * 60 * 1000), createdAt: Date.now() };
                            db.savePendingUnstake(txId, recreated);

                            // remove released record
                            removeReleasedUnstake(txId);

                            commitTransaction();

                            // update in-memory state
                            accounts.set(rel.address, acctRow);
                            pendingUnstakes.set(txId, recreated);
                            logNs('INFO', `Reverted release for ${txId} due to reorg; restored pending_unstake`);
                        }
                    }
                } catch (e) {
                    try { rollbackTransaction(); } catch (ee) { }
                    logNs('ERROR', 'Failed to revert released_unstake during reorg', e && e.message);
                }
                requeueCandidates.push(found);
            }
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

// Sweep matured pending unstakes and credit account balances
export async function releaseMatureUnstakes(cutoffTime) {
    try {
        const matured = [];
        for (const [id, rec] of pendingUnstakes.entries()) {
            if (rec && Number(rec.unlockAt || 0) <= Number(cutoffTime)) matured.push([id, rec]);
        }
        if (matured.length === 0) return;

        // Process each matured record in its own db transaction to ensure atomicity
        for (const [id, rec] of matured) {
            try {
                // start DB transaction
                beginTransaction();
                // re-check pending record in DB to avoid races / double-crediting
                const dbRec = db.getPendingUnstake(id);
                if (!dbRec) {
                    // already removed by another concurrent caller
                    commitTransaction();
                    continue;
                }

                const addr = dbRec.address;
                const amt = BigInt(dbRec.amount || '0');

                // Save a released_unstake record (so it can be reverted if a later reorg occurs)
                persistReleasedUnstake(id, { address: addr, amount: amt.toString(), releasedAt: Date.now() });
                // Remove the pending_unstake record in DB first (prevents double-credit in race)
                db.deletePendingUnstake(id);

                // Then credit account balance
                let acctRow = db.getAccount(addr);
                if (!acctRow) {
                    acctRow = { address: addr, nst_balance: '0', nsd_balance: '0', staked_nst: '0', is_validator_candidate: 0 };
                }
                const newBal = BigInt(acctRow.nst_balance || '0') + amt;
                acctRow.nst_balance = newBal.toString();
                acctRow.updatedAt = Date.now();

                // persist account and commit transaction
                if (typeof db.saveAccountFull === 'function') db.saveAccountFull(addr, acctRow);
                else db.saveAccount(addr, acctRow);
                commitTransaction();

                // Remove from in-memory map to keep state consistent
                pendingUnstakes.delete(id);
                // Also ensure persisted cache removal is done (already done above)

                // Update in-memory accounts map to reflect DB
                accounts.set(addr, acctRow);

                logNs('INFO', `Released pending_unstake ${id} -> ${addr} amount=${amt}`);
            } catch (innerErr) {
                // on any db error, rollback
                try { rollbackTransaction(); } catch (e) { }
                logNs('ERROR', 'releaseMatureUnstakes record processing failed', innerErr && innerErr.message);
            }
        }
    } catch (e) {
        logNs('ERROR', 'releaseMatureUnstakes failed', e && e.message);
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
    // determine validator id (support VP header.producerId alias without mutating header before verification)
    const validatorId = block.header.validatorId || block.header.producerId;
    if (!validators.has(validatorId)) return { ok: false, reason: 'unknown_validator' };
    const v = validators.get(validatorId);
    // verify header signature using ed25519 public key
    // Build canonical header data excluding the signature key entirely to match signing input.
    const { signature: _sigIgnored, ...headerNoSig } = block.header;
    const headerData = canonicalize(headerNoSig);
    const sigPreview = (block.header.signature || '').toString().slice(0, 32);
    logNs('DEBUG', 'Verifying header signature validator=', validatorId, 'sigPreview=', sigPreview);
    let verified = verifyEd25519(v.publicKey, headerData, block.header.signature);
    // Allow tests to bypass signature checks via env var for isolated integration testing.
    if (!verified && process.env.NS_SKIP_SIGNATURE_VERIFICATION === '1') {
        logNs('INFO', 'NS_SKIP_SIGNATURE_VERIFICATION enabled - skipping signature enforcement for tests');
        verified = true;
    }
    if (!verified) {
        logNs('DEBUG', 'Signature verification failed headerDataLength=', headerData.length);
        // Log canonical header data for debugging mismatch scenarios (truncated)
        try {
            logNs('DEBUG', 'Canonical header data (verify side, truncated 1024):', headerData.slice(0, 1024));
            logNs('DEBUG', 'Header keys:', Object.keys(headerNoSig).sort());
        } catch (e) {
            logNs('DEBUG', 'Error logging headerData', e && e.message);
        }
        return { ok: false, reason: 'bad_sig' };
    }
    // safe to set validatorId on header now that signature verified (do not mutate before verification)
    if (!block.header.validatorId && block.header.producerId) block.header.validatorId = block.header.producerId;
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
    // If we don't have a canonical tip yet (fresh DB) and the block's parent is genesis, treat
    // the first block as extending the canonical chain so its effects (rewards/fees) are applied.
    // If parent is genesis, and there are no existing child blocks of genesis in blockMap
    // then treat this first child-of-genesis as extending the canonical chain (apply rewards).
    const hasGenesisChild = Array.from(blockMap.values()).some(b => b.parentHash === genesisPrev);
    const extendsCanonical = (parentHash === state.canonicalTipHash) || (parentHash === genesisPrev && (!hasGenesisChild || state.canonicalTipHash === null));
    const consumedIds = [];
    for (let i = 0; i < block.txs.length; i++) {
        const id = txIdFor(block.txs[i]);
        if (extendsCanonical) {
            txIndex.set(id, { blockHash, txIndex: i });
            persistTxIndex(id, blockHash, i);
            consumedIds.push(id);
        }
        totalFees += Number(block.txs[i].fee || 0);
        // process stake/unstake and staking txs
        const tx = block.txs[i];
        if ((tx.type === 'stake' || tx.type === 'NST_STAKE') && tx.validatorId && Number(tx.amount)) {
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
        if ((tx.type === 'unstake' || tx.type === 'NST_UNSTAKE') && tx.validatorId && Number(tx.amount)) {
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

        // SLASHING EVIDENCE: on-chain proof of double-signing / equivocation
        if (tx.type === 'SLASHEVIDENCE' && tx.evidence && tx.evidence.validatorId) {
            const target = tx.evidence.validatorId;
            // Canonical apply: enforce full slashing (burn stake, revoke candidacy)
            if (extendsCanonical) {
                if (validators.has(target)) {
                    const vv = validators.get(target);
                    const toBurn = Number(vv.stake || 0);
                    // zero out the validator's stake and mark slashed
                    vv.stake = 0;
                    vv.slashed = true;
                    vv.slashedAt = Date.now();
                    // persist and update chain state
                    persistValidator(target, vv);
                    state.totalStake = Math.max(0, state.totalStake - toBurn);
                    persistChainState();
                }

                // Burn account-level staked NST and revoke candidate status as well
                const acct = accounts.get(target);
                if (acct) {
                    acct.staked_nst = '0';
                    acct.is_validator_candidate = 0;
                    persistAccount(target, acct);
                    accounts.set(target, acct);
                }
            } else {
                // Non-canonical branch: reflect slashing in snapshot validators (stake -> 0)
                const idx = snapshot.validators.findIndex(([id]) => id === target);
                if (idx !== -1) snapshot.validators[idx][1].stake = 0;
            }
            // slashing evidence is a terminal action; continue to next tx
            continue;
        }

        // ACCOUNT-LEVEL staking txs: NST_STAKE / NST_UNSTAKE
        // NST_STAKE: move amount from account.nst_balance -> account.staked_nst
        if (tx.type === 'NST_STAKE' && tx.from && Number(tx.amount)) {
            const addr = tx.from;
            let acct = accounts.get(addr);
            if (!acct) {
                acct = { address: addr, nst_balance: '0', nsd_balance: '0', staked_nst: '0', updatedAt: Date.now() };
                accounts.set(addr, acct);
            }
            const amt = BigInt(tx.amount);
            const curBal = BigInt(acct.nst_balance || '0');
            if (curBal < amt) return { ok: false, reason: 'insufficient_funds' };
            const newBal = curBal - amt;
            const curStaked = BigInt(acct.staked_nst || '0');
            const newStaked = curStaked + amt;
            // Enforce minimum self-stake: new staked must be >= MIN_SELF_STAKE
            const MIN_SELF_STAKE = 5000n * COIN; // 5000 NST
            if (newStaked < MIN_SELF_STAKE) return { ok: false, reason: 'insufficient_stake_minimum' };
            acct.nst_balance = newBal.toString();
            acct.staked_nst = newStaked.toString();
            acct.updatedAt = Date.now();
            if (extendsCanonical) {
                persistAccount(addr, acct);
                // if the account is a validator candidate, sync its validator stake
                if (acct.is_validator_candidate) syncValidatorStakeFromAccount(addr);
            } else {
                // For non-canonical branch: reflect the account-level stake change in the block snapshot
                const idx = snapshot.validators.findIndex(([id]) => id === addr);
                const amtNum = Number(tx.amount);
                if (idx === -1) snapshot.validators.push([addr, { stake: amtNum, publicKey: tx.publicKey || 'unknown' }]);
                else snapshot.validators[idx][1].stake += amtNum;
            }
        }

        // NST_UNSTAKE: move amount from staked_nst -> pending_unstakes (unbonding)
        if (tx.type === 'NST_UNSTAKE' && tx.from && Number(tx.amount)) {
            const addr = tx.from;
            let acct = accounts.get(addr);
            if (!acct) return { ok: false, reason: 'account_not_found' };
            const amt = BigInt(tx.amount);
            const curStaked = BigInt(acct.staked_nst || '0');
            const withdraw = amt > curStaked ? curStaked : amt;
            acct.staked_nst = (curStaked - withdraw).toString();
            acct.updatedAt = Date.now();
            // Create pending unbond record
            const txId = txIdFor(tx);
            const unlockAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days mock
            const pending = { id: txId, address: addr, amount: withdraw.toString(), unlockAt, createdAt: Date.now() };
            pendingUnstakes.set(txId, pending);
            if (extendsCanonical) {
                persistAccount(addr, acct);
                persistPendingUnstake(txId, pending);
                if (acct.is_validator_candidate) syncValidatorStakeFromAccount(addr);
            } else {
                // Track unstake in snapshot validators (if present) for branch state
                const idx = snapshot.validators.findIndex(([id]) => id === addr);
                if (idx !== -1) {
                    const vv = snapshot.validators[idx][1];
                    const withdrawAmt = Number(withdraw);
                    vv.stake = Math.max(0, (vv.stake || 0) - withdrawAmt);
                }
                // Also add pending unstake record into snapshot if desired (skipped for now)
            }
        }

        // REGISTER_VALIDATOR: activate account candidacy if staked_nst >= MIN_SELF_STAKE
        if (tx.type === 'REGISTER_VALIDATOR' && tx.from) {
            const addr = tx.from;
            let acct = accounts.get(addr);
            if (!acct) return { ok: false, reason: 'account_not_found' };
            const curStaked = BigInt(acct.staked_nst || '0');
            const MIN_SELF_STAKE = 5000n * COIN;
            if (curStaked < MIN_SELF_STAKE) return { ok: false, reason: 'insufficient_stake_minimum' };
            acct.is_validator_candidate = true;
            acct.updatedAt = Date.now();
            if (extendsCanonical) {
                persistAccount(addr, acct);
                // when a new candidate registers, create/update validators entry from account stake
                syncValidatorStakeFromAccount(addr);
            } else {
                // reflect the registration in the snapshot validators so branch blocks see candidate
                const idx = snapshot.validators.findIndex(([id]) => id === addr);
                const stakeNum = Number(acct.staked_nst || 0);
                if (idx === -1) snapshot.validators.push([addr, { stake: stakeNum, publicKey: 'unknown' }]);
                else snapshot.validators[idx][1].stake = stakeNum;
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
        // CN-07-C Scheduling: track missed production windows
        try {
            const designated = getProducer(height);
            if (designated) {
                if (designated === validatorId) {
                    // reset consecutive misses for the designated producer
                    if (validators.has(designated)) {
                        const vv = validators.get(designated);
                        if (vv && vv.consecutiveMisses) {
                            vv.consecutiveMisses = 0;
                            persistValidator(designated, vv);
                        }
                    }
                } else {
                    // designated missed their slot: increment their consecutive misses
                    if (validators.has(designated)) {
                        const vv = validators.get(designated);
                        vv.consecutiveMisses = (vv.consecutiveMisses || 0) + 1;
                        persistValidator(designated, vv);
                    }
                }
            }
        } catch (e) {
            logNs('ERROR', 'getProducer scheduling hook failed', e && e.message);
        }
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
        // Emit block applied event for network broadcast handlers
        try {
            chainEvents.emit('blockApplied', { blockHash, header: block.header, height });
        } catch (e) {
            logNs('ERROR', 'chainEvents.emit failed', e.message);
        }
        // For canonical blocks, update the block snapshot to reflect the current global validator state
        // so child blocks will inherit the up-to-date snapshot when computing cumWeight.
        try {
            block.snapshot = { validators: JSON.parse(JSON.stringify(Array.from(validators.entries()))) };
            blockMap.set(blockHash, block);
            persistBlock(blockHash, block);
        } catch (e) {
            logNs('ERROR', 'Failed to update canonical block snapshot', e && e.message);
        }
        // sweep mature pending unstakes on canonical block finalization
        try {
            // fire-and-forget: run release processor asynchronously
            releaseMatureUnstakes(Date.now()).catch((err) => logNs('ERROR', 'releaseMatureUnstakes failed', err && err.message));
        } catch (err) {
            logNs('ERROR', 'releaseMatureUnstakes scheduling failed', err && err.message);
        }
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

// Event emitter for higher-level services to react to on-chain events
export const chainEvents = new EventEmitter();

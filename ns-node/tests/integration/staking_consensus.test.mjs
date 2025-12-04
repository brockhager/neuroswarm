import test from 'node:test';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Use a fresh DB for deterministic tests
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-stake-consensus-'));
const tmpDbPath = path.join(tmpDir, `ns_stake_consensus_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;
process.env.NS_SKIP_SIGNATURE_VERIFICATION = '1';

// Import state & chain after setting env vars so the test uses the isolated DB
const { accounts, persistAccount, validators, persistValidator, db, state, persistChainState } = await import('../../src/services/state.js');
const { applyBlock, chooseValidator, syncValidatorStakeFromAccount } = await import('../../src/services/chain.js');
import { sha256Hex, canonicalize, txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';

const COIN = 100000000n;

test('Consensus selection favors higher-staked candidate', async () => {
  // Two accounts: alice (10000 NST), bob (1000 NST)
  const alice = 'alice-consensus';
  const bob = 'bob-consensus';

  // ensure accounts exist
  const aliceAcct = { address: alice, nst_balance: (11000n * COIN).toString(), nsd_balance: '0', staked_nst: '0', updatedAt: Date.now() };
  const bobAcct = { address: bob, nst_balance: (6000n * COIN).toString(), nsd_balance: '0', staked_nst: '0', updatedAt: Date.now() };
  accounts.set(alice, aliceAcct); persistAccount(alice, aliceAcct);
  accounts.set(bob, bobAcct); persistAccount(bob, bobAcct);

  // make genesis canonical so our first blocks extend canonical chain
  state.canonicalTipHash = '0'.repeat(64);
  if (typeof persistChainState === 'function') persistChainState();

  // Ensure validator entry exists (header requires a validator id to be known)
  validators.set(alice, { stake: 0, publicKey: 'test-pub', slashed: false });
  persistValidator(alice, validators.get(alice));

  // Apply NST_STAKE tx for alice: 10000 NST
  const stakeAlice = (10000n * COIN).toString();
  const txAlice = { id: 'a1', type: 'NST_STAKE', from: alice, amount: stakeAlice };
  const headerA = { version: '1.0.0', chainId: 'test', height: 1, validatorId: alice, prevHash: '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  headerA.merkleRoot = computeMerkleRoot([txIdFor(txAlice)]);
  headerA.signature = 'SIG';
  let r = applyBlock({ header: headerA, txs: [txAlice] });
  assert.ok(r.ok, `applyBlock staking alice failed: ${r.reason}`);

  // Apply REGISTER_VALIDATOR for alice
  const txRegA = { id: 'ar1', type: 'REGISTER_VALIDATOR', from: alice };
  const headerRegA = { version: '1.0.0', chainId: 'test', height: 2, validatorId: alice, prevHash: r.blockHash || '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  headerRegA.merkleRoot = computeMerkleRoot([txIdFor(txRegA)]);
  headerRegA.signature = 'SIG';
  r = applyBlock({ header: headerRegA, txs: [txRegA] });
  assert.ok(r.ok, `applyBlock register alice failed: ${r.reason}`);

  // Ensure validator entry exists for bob
  validators.set(bob, { stake: 0, publicKey: 'test-pub', slashed: false });
  persistValidator(bob, validators.get(bob));

  // Apply NST_STAKE for bob: 5000 NST (minimum self-stake required)
  const stakeBob = (5000n * COIN).toString();
  const txBob = { id: 'b1', type: 'NST_STAKE', from: bob, amount: stakeBob };
  const headerB = { version: '1.0.0', chainId: 'test', height: 3, validatorId: bob, prevHash: r.blockHash || '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  headerB.merkleRoot = computeMerkleRoot([txIdFor(txBob)]);
  headerB.signature = 'SIG';
  r = applyBlock({ header: headerB, txs: [txBob] });
  assert.ok(r.ok, `applyBlock staking bob failed: ${r.reason}`);

  // Register bob as candidate
  const txRegB = { id: 'br1', type: 'REGISTER_VALIDATOR', from: bob };
  const headerRegB = { version: '1.0.0', chainId: 'test', height: 4, validatorId: bob, prevHash: r.blockHash || '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  headerRegB.merkleRoot = computeMerkleRoot([txIdFor(txRegB)]);
  headerRegB.signature = 'SIG';
  r = applyBlock({ header: headerRegB, txs: [txRegB] });
  assert.ok(r.ok, `applyBlock register bob failed: ${r.reason}`);

  // After registration, syncValidatorStakeFromAccount should have been called by applyBlock.
  // Confirm validators entries and state.totalStake
  const aliceVal = validators.get(alice);
  const bobVal = validators.get(bob);
  assert.ok(aliceVal, 'alice should be in validators table');
  assert.ok(bobVal, 'bob should be in validators table');

  // Validate state.totalStake matches sum of validator stakes
  const sumStake = Array.from(validators.values()).reduce((s, v) => s + Number(v.stake || 0), 0);
  assert.strictEqual(state.totalStake, sumStake, `state.totalStake should equal validators sum (${state.totalStake} !== ${sumStake})`);

  // sampling deterministic seeds across many slots -- heavier stake should be picked more often
  const trials = 200;
  let aliceCount = 0, bobCount = 0;
  for (let i = 0; i < trials; i++) {
    const prev = 'seed-' + i;
    const pick = chooseValidator(prev, i);
    if (pick === alice) aliceCount++;
    if (pick === bob) bobCount++;
  }

  // Expect alice to be picked more often than bob (10000 > 1000)
  assert.ok(aliceCount > bobCount, `expected heavier staker to be selected more often (aliceCount=${aliceCount}, bobCount=${bobCount})`);

  // cleanup
  try { fs.unlinkSync(tmpDbPath); fs.rmdirSync(tmpDir); } catch (e) {}
});

import test from 'node:test';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

// fresh DB for deterministic tests
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-stake-reorg-'));
const tmpDbPath = path.join(tmpDir, `ns_stake_reorg_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;
process.env.NS_SKIP_SIGNATURE_VERIFICATION = '1';

// Import state and chain AFTER setting env vars so tests use the isolated DB
const { accounts, persistAccount, validators, persistValidator, db, state, persistChainState, blockMap, heads } = await import('../../src/services/state.js');
const { applyBlock, chooseValidator, chooseCanonicalTipAndReorg } = await import('../../src/services/chain.js');
import { txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';

const COIN = 100000000n;

// This test constructs two forks from the same parent and ensures a reorg
// happens to the branch with higher cumulative weight, and that validator
// stake state is consistent after the reorg.

test('Reorg updates validator stakes from ancestor snapshot and replay', async () => {
  const alice = 'alice-reorg';
  const bob = 'bob-reorg';

  // accounts with large balances
  const aliceAcct = { address: alice, nst_balance: (50000n * COIN).toString(), nsd_balance: '0', staked_nst: '0', updatedAt: Date.now() };
  const bobAcct = { address: bob, nst_balance: (80000n * COIN).toString(), nsd_balance: '0', staked_nst: '0', updatedAt: Date.now() };
  accounts.set(alice, aliceAcct); persistAccount(alice, aliceAcct);
  accounts.set(bob, bobAcct); persistAccount(bob, bobAcct);

  // ensure validators entries exist before genesis so snapshots include them if needed
  validators.clear();
  persistValidator(alice, { stake: 0, publicKey: 'a-pub', slashed: false });
  persistValidator(bob, { stake: 0, publicKey: 'b-pub', slashed: false });
  validators.set(alice, { stake: 0, publicKey: 'a-pub', slashed: false });
  validators.set(bob, { stake: 0, publicKey: 'b-pub', slashed: false });

  // Make genesis canonical tip be zeros so our first block extends canonical
  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();

  // 1) Canonical branch: Alice stakes 10k and registers (smaller than Bob later)
  const txStakeA = { id: 'a-stake', type: 'NST_STAKE', from: alice, amount: (10000n * COIN).toString() };
  const header1 = { version: '1.0.0', chainId: 'test', height: 1, validatorId: alice, prevHash: state.canonicalTipHash, merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  header1.merkleRoot = computeMerkleRoot([txIdFor(txStakeA)]);
  header1.signature = 'SIG';
  let r1 = applyBlock({ header: header1, txs: [txStakeA] });
  assert.ok(r1.ok, `applyBlock stake alice failed: ${r1.reason}`);

  const txRegA = { id: 'a-reg', type: 'REGISTER_VALIDATOR', from: alice };
  const header2 = { version: '1.0.0', chainId: 'test', height: 2, validatorId: alice, prevHash: r1.blockHash, merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  header2.merkleRoot = computeMerkleRoot([txIdFor(txRegA)]);
  header2.signature = 'SIG';
  let r2 = applyBlock({ header: header2, txs: [txRegA] });
  assert.ok(r2.ok, `applyBlock register alice failed: ${r2.reason}`);

  // add one more block on canonical branch produced by alice (no ops)
  const header3 = { version: '1.0.0', chainId: 'test', height: 3, validatorId: alice, prevHash: r2.blockHash, merkleRoot: computeMerkleRoot([]), timestamp: Date.now(), txCount: 0 };
  header3.signature = 'SIG';
  let r3 = applyBlock({ header: header3, txs: [] });
  assert.ok(r3.ok, `applyBlock canon alice block failed: ${r3.reason}`);

  // ensure canonical tip is at r3
  // applyBlock will update state.canonicalTipHash when extendsCanonical is true
  // but make sure it is set as such for test clarity
  state.canonicalTipHash = r3.blockHash;

  // Record baseline stakes
  const aliceStakeBefore = Number(validators.get(alice).stake || 0);

  // 2) Create fork from block2 (parent r2.blockHash) where Bob stakes heavily -> should win
  const txStakeB = { id: 'b-stake', type: 'NST_STAKE', from: bob, amount: (40000n * COIN).toString() }; // 40k > alice 10k
  const headerB1 = { version: '1.0.0', chainId: 'test', height: 3, validatorId: bob, prevHash: r2.blockHash, merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  headerB1.merkleRoot = computeMerkleRoot([txIdFor(txStakeB)]);
  headerB1.signature = 'SIG';
  const rb1 = applyBlock({ header: headerB1, txs: [txStakeB] });
  assert.ok(rb1.ok, `applyBlock branch stake bob failed: ${rb1.reason}`);

  const txRegB = { id: 'b-reg', type: 'REGISTER_VALIDATOR', from: bob };
  const headerB2 = { version: '1.0.0', chainId: 'test', height: 4, validatorId: bob, prevHash: rb1.blockHash, merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  headerB2.merkleRoot = computeMerkleRoot([txIdFor(txRegB)]);
  headerB2.signature = 'SIG';
  const rb2 = applyBlock({ header: headerB2, txs: [txRegB] });
  assert.ok(rb2.ok, `applyBlock branch register bob failed: ${rb2.reason}`);

  // extend branch with another bob-produced block to increase cumWeight
  const headerB3 = { version: '1.0.0', chainId: 'test', height: 5, validatorId: bob, prevHash: rb2.blockHash, merkleRoot: computeMerkleRoot([]), timestamp: Date.now(), txCount: 0 };
  headerB3.signature = 'SIG';
  const rb3 = applyBlock({ header: headerB3, txs: [] });
  assert.ok(rb3.ok, `applyBlock branch bob block failed: ${rb3.reason}`);

  // Debug: print known blocks and heads before reorg
  console.log('[TEST DEBUG] blockMap keys:', Array.from(blockMap.keys()));
  for (const k of blockMap.keys()) {
    const b = blockMap.get(k);
    console.log('[TEST DEBUG] block', k, 'parentHash=', b && b.parentHash, 'height=', b && b.header && b.header.height, 'cumWeight=', b && b.cumWeight);
  }
  for (const k of blockMap.keys()) {
    const b = blockMap.get(k);
    console.log('[TEST DEBUG] block', k, 'parentHash=', b && b.parentHash, 'height=', b && b.header && b.header.height);
  }
  console.log('[TEST DEBUG] heads:', Array.from(heads));

  // Now pick canonical tip based on cumWeight and trigger reorg if branch wins
  for (const h of heads) {
    const bh = blockMap.get(h);
    console.log('[TEST DEBUG] head', h, 'cumWeight=', bh && bh.cumWeight, 'header.height=', bh && bh.header && bh.header.height);
  }
  await chooseCanonicalTipAndReorg();

  // After reorg, validators map should include both alice and bob and totalStake reflect their stakes
  console.log('[TEST DEBUG] state.totalStake=', state.totalStake);
  console.log('[TEST DEBUG] validators:');
  for (const [id, v] of validators.entries()) console.log('  ', id, '=>', v && v.stake);
  assert.ok(validators.has(alice), 'alice should still be a validator after reorg');
  assert.ok(validators.has(bob), 'bob should be registered as validator after reorg');

  const totalStake = state.totalStake;
  const computed = Array.from(validators.values()).reduce((s, v) => s + Number(v.stake || 0), 0);
  assert.strictEqual(totalStake, computed, `state.totalStake must match validators sum after reorg (${totalStake} !== ${computed})`);

  // Expect bob to have higher stake than alice after we replay branch
  assert.ok(Number(validators.get(bob).stake || 0) > Number(validators.get(alice).stake || 0), 'bob should have larger stake after branch replay');

  // cleanup
  try { fs.unlinkSync(tmpDbPath); fs.rmdirSync(tmpDir); } catch (e) {}
});

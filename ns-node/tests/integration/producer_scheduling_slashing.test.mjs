import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Isolated DB per test run
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-producer-sched-'));
const tmpDbPath = path.join(tmpDir, `ns_producer_sched_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;
process.env.NS_SKIP_SIGNATURE_VERIFICATION = '1';

const { accounts, persistAccount, validators, persistValidator, state, persistChainState } = await import('../../src/services/state.js');
const { applyBlock, getProducer, syncValidatorStakeFromAccount } = await import('../../src/services/chain.js');
import { computeMerkleRoot, txIdFor } from '../../src/utils/crypto.js';

const COIN = 100000000n;

test('Missing block increments designated validator consecutive_misses', async () => {
  // Setup two validators A and B with sufficient stake
  const a = 'sched-val-a';
  const b = 'sched-val-b';
  const stakeA = 6000n * COIN; // 6000 NST
  const stakeB = 7000n * COIN; // 7000 NST

  // Accounts
  const acctA = { address: a, nst_balance: (10000n * COIN).toString(), nsd_balance: '0', staked_nst: stakeA.toString(), is_validator_candidate: true, updatedAt: Date.now() };
  const acctB = { address: b, nst_balance: (10000n * COIN).toString(), nsd_balance: '0', staked_nst: stakeB.toString(), is_validator_candidate: true, updatedAt: Date.now() };
  accounts.set(a, acctA); persistAccount(a, acctA);
  accounts.set(b, acctB); persistAccount(b, acctB);

  // add validators mapping
  validators.set(a, { stake: Number(stakeA), publicKey: 'pk-a', slashed: false, consecutiveMisses: 0 });
  validators.set(b, { stake: Number(stakeB), publicKey: 'pk-b', slashed: false, consecutiveMisses: 0 });
  persistValidator(a, validators.get(a));
  persistValidator(b, validators.get(b));

  // Update global total stake
  state.totalStake = Number(stakeA + stakeB);
  persistChainState();

  // Ensure genesis tip so our first block extends canonical chain
  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();

  // Determine designated producer for height 1
  const height = 1;
  const designated = getProducer(height);
  assert.ok(designated === a || designated === b, 'expected designated to be one of the two validators');

  // Choose other producer (not designated)
  const other = designated === a ? b : a;

  // Build a block produced by 'other' at height 1
  const tx = { id: 't1', type: 'noop', from: other };
  const header = { version: '1.0.0', chainId: 'test', height: height, validatorId: other, prevHash: '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  header.merkleRoot = computeMerkleRoot([txIdFor(tx)]);
  header.signature = 'SIG';

  const res = applyBlock({ header, txs: [tx] });
  assert.ok(res.ok, `applyBlock failed: ${res.reason}`);

  // After apply, the designated validator should have consecutiveMisses incremented
  const dv = validators.get(designated);
  assert.ok(dv, 'designated validator should exist');
  assert.strictEqual(dv.consecutiveMisses, 1, 'designated consecutiveMisses should be incremented to 1');

  // cleanup
  try { fs.unlinkSync(tmpDbPath); fs.rmdirSync(tmpDir); } catch (e) {}
});

test('SLASHEVIDENCE burns stake and revokes candidate status', async () => {
  // Setup validator target
  const target = 'slash-target';
  const stake = 9000n * COIN;

  const acct = { address: target, nst_balance: (20000n * COIN).toString(), nsd_balance: '0', staked_nst: stake.toString(), is_validator_candidate: true, updatedAt: Date.now() };
  accounts.set(target, acct); persistAccount(target, acct);

  validators.set(target, { stake: Number(stake), publicKey: 'pk-s', slashed: false, consecutiveMisses: 0 });
  persistValidator(target, validators.get(target));
  state.totalStake = Number(stake);
  persistChainState();

  // Build a slashing evidence tx in a canonical block (height 1)
  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();

  const evidenceTx = { id: 's1', type: 'SLASHEVIDENCE', evidence: { validatorId: target, note: 'double-sign' } };
  // ensure there is a producer validator in the system to sign/apply the block
  const prov = 'prov-signer';
  validators.set(prov, { stake: 0, publicKey: 'pk-prov', slashed: false, consecutiveMisses: 0 });
  persistValidator(prov, validators.get(prov));
  state.totalStake = state.totalStake + 0; // no-op ensure persisted

  const header = { version: '1.0.0', chainId: 'test', height: 1, validatorId: prov, prevHash: '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  header.merkleRoot = computeMerkleRoot([txIdFor(evidenceTx)]);
  header.signature = 'SIG';

  const r = applyBlock({ header, txs: [evidenceTx] });
  assert.ok(r.ok, `applyBlock SLASHEVIDENCE failed: ${r.reason}`);

  // Verify validator stake is zero and slashed flag is true
  const vv = validators.get(target);
  assert.ok(vv, 'validator entry should exist');
  assert.strictEqual(vv.stake, 0, 'validator stake should be burned to 0');
  assert.ok(vv.slashed, 'validator should be marked slashed');

  // Account should have staked_nst set to '0' and is_validator_candidate = 0
  const aRow = accounts.get(target);
  assert.strictEqual(aRow.staked_nst, '0', 'account staked_nst must be zeroed out');
  assert.strictEqual(aRow.is_validator_candidate, 0, 'is_validator_candidate should be revoked (0)');

  // state.totalStake should be zero
  assert.strictEqual(state.totalStake, 0, 'state.totalStake should be updated (0)');

  // cleanup
  try { fs.unlinkSync(tmpDbPath); fs.rmdirSync(tmpDir); } catch (e) {}
});

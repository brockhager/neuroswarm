import test from 'node:test';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { sha256Hex, canonicalize, txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';
import StateDatabase from '../../src/services/state-db.js';

// Create temp DB for the test
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-stake-'));
const tmpDbPath = path.join(tmpDir, `ns_stake_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;
// For test convenience, skip signature verification so we can test tx application logic
process.env.NS_SKIP_SIGNATURE_VERIFICATION = '1';

// Import state/chain after setting env path so state.js uses our temp DB
const { accounts, pendingUnstakes, persistAccount, db, validators, persistValidator, state, persistChainState } = await import('../../src/services/state.js');
const { applyBlock } = await import('../../src/services/chain.js');

const COIN = 100000000n; // 1 NST in atomic units

test('NST_STAKE moves funds into staked_nst and enforces 5000 NST min', async () => {
  const addr = 'alice-stake-test';
  const initial = (6000n * COIN).toString();
  // ensure account exists
  const acct = { address: addr, nst_balance: initial, nsd_balance: '0', staked_nst: '0', updatedAt: Date.now() };
  accounts.set(addr, acct);
  persistAccount(addr, acct);

  // mark genesis as canonical so applyBlock treats blocks as canonical for these tests
  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();

  // Register a validator id so applyBlock accepts the header (signature check disabled)
  validators.set(addr, { stake: 0, publicKey: 'test-pub', slashed: false });
  persistValidator(addr, validators.get(addr));

  // register validator for header acceptance
  validators.set(addr, { stake: 0, publicKey: 'test-pub', slashed: false });
  persistValidator(addr, validators.get(addr));

  // create a block containing NST_STAKE tx for 5000 NST
  const amount = (5000n * COIN).toString();
  const tx = { id: 'tx-stake-1', type: 'NST_STAKE', from: addr, amount };
  const header = { version: '1.0.0', chainId: 'test', height: 1, validatorId: addr, prevHash: '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  header.merkleRoot = computeMerkleRoot([txIdFor(tx)]);
  header.signature = 'SIG';

  const res = applyBlock({ header, txs: [tx] });
  assert.ok(res.ok, `applyBlock failed: ${res.reason || 'unknown'}`);

  const updated = db.getAccount(addr);
  assert.ok(updated, 'account persisted');
  assert.strictEqual(BigInt(updated.staked_nst), 5000n * COIN, 'staked amount should be 5000 NST');
  // applyBlock credits block reward to the validator account; account balance = remaining + reward
  const expectedRemaining = 1000n * COIN + 50000000n; // 1000 NST + 0.5 NST block reward
  assert.strictEqual(BigInt(updated.nst_balance), expectedRemaining, 'remaining balance should be 1000 NST + block reward');

  // cleanup
  const newDB = new StateDatabase(tmpDbPath);
  newDB.close();
});

test('NST_STAKE rejects when resulting staked_nst < 5000 NST', async () => {
  const addr = 'bob-stake-test';
  const initial = (3000n * COIN).toString();
  const acct = { address: addr, nst_balance: initial, nsd_balance: '0', staked_nst: '0', updatedAt: Date.now() };
  accounts.set(addr, acct);
  persistAccount(addr, acct);

  const amount = (3000n * COIN).toString();
  // register validator so header will be accepted
  validators.set(addr, { stake: 0, publicKey: 'test-pub', slashed: false });
  persistValidator(addr, validators.get(addr));

  const tx = { id: 'tx-stake-2', type: 'NST_STAKE', from: addr, amount };
  const header = { version: '1.0.0', chainId: 'test', height: 2, validatorId: addr, prevHash: '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  header.merkleRoot = computeMerkleRoot([txIdFor(tx)]);
  header.signature = 'SIG';

  // ensure this block extends canonical tip
  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();
  const res = applyBlock({ header, txs: [tx] });
  assert.ok(!res.ok, 'expected stake below minimum to be rejected');
  assert.strictEqual(res.reason, 'insufficient_stake_minimum');
});

test('NST_UNSTAKE reduces staked_nst and creates pending_unstake', async () => {
  const addr = 'carol-unstake-test';
  const initialStaked = (8000n * COIN).toString();
  const acct = { address: addr, nst_balance: '0', nsd_balance: '0', staked_nst: initialStaked, updatedAt: Date.now() };
  validators.set(addr, { stake: Number(initialStaked), publicKey: 'test-pub', slashed: false });
  persistValidator(addr, validators.get(addr));
  accounts.set(addr, acct);
  persistAccount(addr, acct);

  const amount = (2000n * COIN).toString();
  const tx = { id: 'tx-unstake-1', type: 'NST_UNSTAKE', from: addr, amount };
  const header = { version: '1.0.0', chainId: 'test', height: 3, validatorId: addr, prevHash: '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  header.merkleRoot = computeMerkleRoot([txIdFor(tx)]);
  header.signature = 'SIG';

  // ensure this block extends canonical tip
  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();
  const res = applyBlock({ header, txs: [tx] });
  assert.ok(res.ok, `unstake apply failed: ${res.reason || 'unknown'}`);

  const updated = db.getAccount(addr);
  assert.strictEqual(BigInt(updated.staked_nst), 6000n * COIN, 'staked_nst should be reduced by 2000 NST');

  // pending unstakes should contain txId
  const id = txIdFor(tx);
  const pending = db.getAllPendingUnstakes().get(id);
  assert.ok(pending, 'pending unstakes should include the unstake record');
  assert.strictEqual(BigInt(pending.amount), 2000n * COIN, 'pending amount matches unstake request');

});

test('REGISTER_VALIDATOR sets candidacy flag when staked >= 5000 NST', async () => {
  const addr = 'dan-validator-test';
  const acct = { address: addr, nst_balance: '0', nsd_balance: '0', staked_nst: (5000n*COIN).toString(), is_validator_candidate: 0, updatedAt: Date.now() };
  validators.set(addr, { stake: 0, publicKey: 'test-pub', slashed: false });
  persistValidator(addr, validators.get(addr));
  accounts.set(addr, acct);
  persistAccount(addr, acct);

  const tx = { id: 'tx-reg-1', type: 'REGISTER_VALIDATOR', from: addr };
  const header = { version: '1.0.0', chainId: 'test', height: 4, validatorId: addr, prevHash: '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  header.merkleRoot = computeMerkleRoot([txIdFor(tx)]);
  header.signature = 'SIG';

  // ensure this block extends canonical tip for the test
  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();
  const res = applyBlock({ header, txs: [tx] });
  assert.ok(res.ok, `REGISTER_VALIDATOR failed: ${res.reason || 'unknown'}`);

  const updated = db.getAccount(addr);
  assert.strictEqual(Number(updated.is_validator_candidate), 1, 'account should be marked as validator candidate');
});

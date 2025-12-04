import test from 'node:test';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';

// fresh DB for deterministic tests
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-unbond-'));
const tmpDbPath = path.join(tmpDir, `ns_unbond_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;
process.env.NS_SKIP_SIGNATURE_VERIFICATION = '1';

const { accounts, persistAccount, pendingUnstakes, persistPendingUnstake, db, validators, persistValidator, state, persistChainState } = await import('../../src/services/state.js');
const { applyBlock, releaseMatureUnstakes } = await import('../../src/services/chain.js');

const COIN = 100000000n;

test('Unbond release sweeps matured pending_unstakes and credits account', async () => {
  const addr = 'unbond-test';
  // Pre-fund staked_nst
  const initialStaked = (8000n * COIN).toString();
  const acct = { address: addr, nst_balance: '0', nsd_balance: '0', staked_nst: initialStaked, updatedAt: Date.now() };
  accounts.set(addr, acct);
  persistAccount(addr, acct);

  // Ensure validator registration exists so headers accepted
  validators.set(addr, { stake: Number(initialStaked), publicKey: 'test-pub', slashed: false });
  persistValidator(addr, validators.get(addr));

  // ensure genesis canonical
  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();

  // NST_UNSTAKE for 2000 NST
  const amount = (2000n * COIN).toString();
  const tx = { id: 'tx-unbond-1', type: 'NST_UNSTAKE', from: addr, amount };
  const header = { version: '1.0.0', chainId: 'test', height: 1, validatorId: addr, prevHash: '0'.repeat(64), merkleRoot: null, timestamp: Date.now(), txCount: 1 };
  header.merkleRoot = computeMerkleRoot([txIdFor(tx)]);
  header.signature = 'SIG';

  const r = applyBlock({ header, txs: [tx] });
  assert.ok(r.ok, `applyBlock unstake failed: ${r.reason}`);

  // After applyBlock, pendingUnstakes should include the record
  const id = txIdFor(tx);
  let pending = db.getAllPendingUnstakes().get(id);
  assert.ok(pending, 'pending unstakes created');

  // Fast-forward: mark pending as matured (in the past) so release will pick it up
  pending.unlockAt = Date.now() - 1000;
  pendingUnstakes.set(id, pending);
  persistPendingUnstake(id, pending);

  // Call release processor
  await releaseMatureUnstakes(Date.now());

  // Check account credited
  const updated = db.getAccount(addr);
  assert.ok(updated, 'account exists after release');
  // account will also have received the block reward from the unstake block (0.5 NST)
  const expected = 2000n * COIN + 50000000n;
  assert.strictEqual(BigInt(updated.nst_balance), expected, 'released amount credited to nst_balance (plus block reward)');

  // pending unstakes should be cleared
  const pendNow = db.getAllPendingUnstakes().get(id);
  assert.ok(!pendNow, 'pending unstakes cleared after release');

  // cleanup
  try { fs.unlinkSync(tmpDbPath); fs.rmdirSync(tmpDir); } catch (e) {}
});

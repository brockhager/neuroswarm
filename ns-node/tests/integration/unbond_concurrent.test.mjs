import test from 'node:test';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-unbond-conc-'));
const tmpDbPath = path.join(tmpDir, `ns_unbond_conc_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;
process.env.NS_SKIP_SIGNATURE_VERIFICATION = '1';

const { accounts, persistAccount, pendingUnstakes, persistPendingUnstake, db, validators, persistValidator, state, persistChainState } = await import('../../src/services/state.js');
const { applyBlock, releaseMatureUnstakes } = await import('../../src/services/chain.js');

const COIN = 100000000n;

test('Concurrent release is safe and idempotent', async () => {
  const addr = 'conc-test';
  const initialStaked = (8000n * COIN).toString();
  const acct = { address: addr, nst_balance: '0', nsd_balance: '0', staked_nst: initialStaked, updatedAt: Date.now() };
  accounts.set(addr, acct); persistAccount(addr, acct);

  validators.set(addr, { stake: Number(initialStaked), publicKey: 't-pub', slashed: false });
  persistValidator(addr, validators.get(addr));

  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();

  const amount = (2000n * COIN).toString();
  const tx = { id: 'utx-conc-1', type: 'NST_UNSTAKE', from: addr, amount };
  const header = { version: '1.0.0', chainId: 'test', height: 1, validatorId: addr, prevHash: state.canonicalTipHash, merkleRoot: computeMerkleRoot([txIdFor(tx)]), timestamp: Date.now(), txCount: 1 };
  header.signature = 'SIG';

  const r = applyBlock({ header, txs: [tx] });
  assert.ok(r.ok, `applyBlock unstake failed: ${r.reason}`);

  const id = txIdFor(tx);
  let pending = db.getAllPendingUnstakes().get(id);
  assert.ok(pending, 'pending unstakes present');

  // mark matured
  pending.unlockAt = Date.now() - 1000;
  pendingUnstakes.set(id, pending);
  persistPendingUnstake(id, pending);

  // call two concurrent releases
  await Promise.all([releaseMatureUnstakes(Date.now()), releaseMatureUnstakes(Date.now())]);

  const updated = db.getAccount(addr);
  assert.ok(updated, 'account present');
  // should have been credited only once
  assert.strictEqual(BigInt(updated.nst_balance), 2000n * COIN + 50000000n, 'released amount credited exactly once (plus block reward)');

  // pending entry should be removed
  const after = db.getAllPendingUnstakes().get(id);
  assert.ok(!after, 'pending entry removed');

  // cleanup
  try { fs.unlinkSync(tmpDbPath); fs.rmdirSync(tmpDir); } catch (e) {}
});

import test from 'node:test';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-unbond-time-'));
const tmpDbPath = path.join(tmpDir, `ns_unbond_time_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;
process.env.NS_SKIP_SIGNATURE_VERIFICATION = '1';

const { accounts, persistAccount, pendingUnstakes, persistPendingUnstake, db, validators, persistValidator, state, persistChainState } = await import('../../src/services/state.js');
const { applyBlock, releaseMatureUnstakes } = await import('../../src/services/chain.js');

const COIN = 100000000n;

test('Timed maturity exact boundary behavior', async () => {
  const addr = 'timing-test';
  const initialStaked = (8000n * COIN).toString();
  const acct = { address: addr, nst_balance: (1000n * COIN).toString(), nsd_balance: '0', staked_nst: initialStaked, updatedAt: Date.now() };
  accounts.set(addr, acct); persistAccount(addr, acct);

  validators.set(addr, { stake: Number(initialStaked), publicKey: 't-pub', slashed: false });
  persistValidator(addr, validators.get(addr));

  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();

  const amount = (2000n * COIN).toString();
  const tx = { id: 'utx-time-1', type: 'NST_UNSTAKE', from: addr, amount };
  const header = { version: '1.0.0', chainId: 'test', height: 1, validatorId: addr, prevHash: state.canonicalTipHash, merkleRoot: computeMerkleRoot([txIdFor(tx)]), timestamp: Date.now(), txCount: 1 };
  header.signature = 'SIG';

  const r = applyBlock({ header, txs: [tx] });
  assert.ok(r.ok, `applyBlock unstake failed: ${r.reason}`);

  const id = txIdFor(tx);
  let pending = db.getAllPendingUnstakes().get(id);
  assert.ok(pending, 'pending unstakes present');

  // set unlockAt to a precise future value
  const unlockAt = Date.now() + 2000; // 2s in future
  pending.unlockAt = unlockAt;
  pendingUnstakes.set(id, pending);
  persistPendingUnstake(id, pending);

  // Should NOT release when cutoff is 1ms before unlock
  await releaseMatureUnstakes(unlockAt - 1);
  let after = db.getAllPendingUnstakes().get(id);
  assert.ok(after, 'pending should still exist just before unlock');

  // Should release when cutoff equals unlockAt
  await releaseMatureUnstakes(unlockAt);
  after = db.getAllPendingUnstakes().get(id);
  assert.ok(!after, 'pending should be released at exact unlock time');

  // cleanup
  try { fs.unlinkSync(tmpDbPath); fs.rmdirSync(tmpDir); } catch (e) {}
});

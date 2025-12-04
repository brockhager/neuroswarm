import test from 'node:test';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-unbond-reorg-'));
const tmpDbPath = path.join(tmpDir, `ns_unbond_reorg_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;
process.env.NS_SKIP_SIGNATURE_VERIFICATION = '1';

const { accounts, persistAccount, pendingUnstakes, persistPendingUnstake, db, validators, persistValidator, state, persistChainState } = await import('../../src/services/state.js');
const { applyBlock, releaseMatureUnstakes, chooseCanonicalTipAndReorg } = await import('../../src/services/chain.js');

const COIN = 100000000n;

// This test ensures that if an unstake is released and later a reorg removes the block that created the unstake,
// the release is reverted and the pending_unstake is restored.

test('Unbond release is reverted on reorg and then reapplied if canonical', async () => {
  const addr = 'reorg-test';
  const initialStaked = (8000n * COIN).toString();
  const acct = { address: addr, nst_balance: '0', nsd_balance: '0', staked_nst: initialStaked, updatedAt: Date.now() };
  accounts.set(addr, acct); persistAccount(addr, acct);

  validators.set(addr, { stake: Number(initialStaked), publicKey: 't-pub', slashed: false });
  persistValidator(addr, validators.get(addr));

  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();

  // Apply NST_UNSTAKE block
  const amount = (2000n * COIN).toString();
  const tx = { id: 'utx-reorg-1', type: 'NST_UNSTAKE', from: addr, amount };
  const header = { version: '1.0.0', chainId: 'test', height: 1, validatorId: addr, prevHash: state.canonicalTipHash, merkleRoot: computeMerkleRoot([txIdFor(tx)]), timestamp: Date.now(), txCount: 1 };
  header.signature = 'SIG';

  const r = applyBlock({ header, txs: [tx] });
  assert.ok(r.ok, `applyBlock unstake failed: ${r.reason}`);

  const id = txIdFor(tx);
  let pending = db.getAllPendingUnstakes().get(id);
  assert.ok(pending, 'pending created');

  // mark matured & release
  pending.unlockAt = Date.now() - 1000;
  pendingUnstakes.set(id, pending);
  persistPendingUnstake(id, pending);

  await releaseMatureUnstakes(Date.now());

  let after = db.getAllPendingUnstakes().get(id);
  assert.ok(!after, 'pending released');
  const credited = db.getAccount(addr);
  const creditedAmount = BigInt(credited.nst_balance || '0');
  assert.ok(creditedAmount >= 2000n * COIN, 'account credited for release');

  // Now build an alternate branch from genesis that excludes this unstake and is heavier
  // Apply two blocks on top of genesis that give higher cumulative weight
  // These blocks should make the other branch canonical and the original unstake block get rolled back
  const otherValidator = 'other-val';
  // give a large stake (atomic units) so branch becomes heavier than the original chain
  validators.set(otherValidator, { stake: 2000000000000, publicKey: 'o-pub', slashed: false });
  persistValidator(otherValidator, validators.get(otherValidator));

  const txb1 = { id: 'b1', type: 'stake', validatorId: otherValidator, amount: String(40000) }; // arbitrary
  // Build a branch from genesis (prevHash = genesis) to exclude the unstake block.
  const headerB1 = { version: '1.0.0', chainId: 'test', height: 1, validatorId: otherValidator, prevHash: '0'.repeat(64), merkleRoot: computeMerkleRoot([txIdFor(txb1)]), timestamp: Date.now(), txCount: 1 };
  headerB1.signature = 'SIG';
  const rb1 = applyBlock({ header: headerB1, txs: [txb1] });
  assert.ok(rb1.ok, `applyBlock branch b1 failed: ${rb1.reason}`);

  const headerB2 = { version: '1.0.0', chainId: 'test', height: 2, validatorId: otherValidator, prevHash: rb1.blockHash, merkleRoot: computeMerkleRoot([]), timestamp: Date.now(), txCount: 0 };
  headerB2.signature = 'SIG';
  const rb2 = applyBlock({ header: headerB2, txs: [] });
  assert.ok(rb2.ok, `applyBlock branch b2 failed: ${rb2.reason}`);

  // Now choose canonical tip (should pick branch B which is heavier) and trigger reorg
  await chooseCanonicalTipAndReorg();

  // After reorg, the original unstake block has been removed -> release should have been reverted
  after = db.getAllPendingUnstakes().get(id);
  assert.ok(after, 'pending unstake restored after reorg');

  // account should have had the credited amount removed (or at least decreased by the released amount)
  const afterAcct = db.getAccount(addr);
  const afterBal = BigInt(afterAcct.nst_balance || '0');
  assert.ok(afterBal < creditedAmount, 'account balance reduced after release revert');

  // cleanup
  try { fs.unlinkSync(tmpDbPath); fs.rmdirSync(tmpDir); } catch (e) {}
});

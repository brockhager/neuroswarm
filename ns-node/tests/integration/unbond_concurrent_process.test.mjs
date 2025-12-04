import test from 'node:test';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import child_process from 'child_process';
import { fileURLToPath } from 'url';
import { txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-unbond-proc-'));
const tmpDbPath = path.join(tmpDir, `ns_unbond_proc_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;
process.env.NS_SKIP_SIGNATURE_VERIFICATION = '1';

const { accounts, persistAccount, pendingUnstakes, persistPendingUnstake, db, validators, persistValidator, state, persistChainState } = await import('../../src/services/state.js');
const { applyBlock } = await import('../../src/services/chain.js');

const COIN = 100000000n;

test('Concurrent releases across independent processes are safe (no double-credit)', async () => {
  const addr = 'proc-conc-test';
  const initialStaked = (8000n * COIN).toString();
  const acct = { address: addr, nst_balance: '0', nsd_balance: '0', staked_nst: initialStaked, updatedAt: Date.now() };
  accounts.set(addr, acct); persistAccount(addr, acct);

  validators.set(addr, { stake: Number(initialStaked), publicKey: 'p-pub', slashed: false });
  persistValidator(addr, validators.get(addr));

  state.canonicalTipHash = '0'.repeat(64);
  persistChainState();

  // Create NST_UNSTAKE tx and apply (creates pending_unstake)
  const amount = (2000n * COIN).toString();
  const tx = { id: 'utx-proc-conc-1', type: 'NST_UNSTAKE', from: addr, amount };
  const header = { version: '1.0.0', chainId: 'test', height: 1, validatorId: addr, prevHash: state.canonicalTipHash, merkleRoot: computeMerkleRoot([txIdFor(tx)]), timestamp: Date.now(), txCount: 1 };
  header.signature = 'SIG';

  const r = applyBlock({ header, txs: [tx] });
  assert.ok(r.ok, `applyBlock unstake failed: ${r.reason}`);

  const id = txIdFor(tx);
  let pending = db.getAllPendingUnstakes().get(id);
  assert.ok(pending, 'pending unstakes present');

  // Force it to be matured
  pending.unlockAt = Date.now() - 1000;
  pendingUnstakes.set(id, pending);
  persistPendingUnstake(id, pending);

  // Spawn two independent Node processes which run release_runner.mjs using same DB path
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const runner = path.join(__dirname, 'release_runner.mjs');

  function spawnRunner() {
    return new Promise((res) => {
      const env = Object.assign({}, process.env, { NS_NODE_DB_PATH: tmpDbPath });
      const proc = child_process.spawn(process.execPath, [runner], { env, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', err = '';
      proc.stdout.on('data', d => out += d.toString());
      proc.stderr.on('data', d => err += d.toString());
      proc.on('exit', (code) => res({ code, out: out.trim(), err: err.trim() }));
    });
  }

  // Run both concurrently
  const [a, b] = await Promise.all([spawnRunner(), spawnRunner()]);

  // Both processes should have exited normally
  assert.ok(a.code === 0 || a.code === 2, `runner A unexpected exit ${a.code} ${a.err}`);
  assert.ok(b.code === 0 || b.code === 2, `runner B unexpected exit ${b.code} ${b.err}`);

  // Verify DB account -> released only once (plus block reward)
  const updated = db.getAccount(addr);
  assert.ok(updated, 'account present');
  const expectedRelease = 2000n * COIN;
  const blockReward = 50000000n; // initial reward as used by calculateBlockReward(height)
  // nst_balance should equal block reward + release (only once)
  assert.strictEqual(BigInt(updated.nst_balance), blockReward + expectedRelease, 'released credited exactly once across processes');

  // pending should be deleted
  const after = db.getAllPendingUnstakes().get(id);
  assert.ok(!after, 'pending should be removed after release');

  // cleanup
  try { fs.unlinkSync(tmpDbPath); fs.rmdirSync(tmpDir); } catch (e) {}
});

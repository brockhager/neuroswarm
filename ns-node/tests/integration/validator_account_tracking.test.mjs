import test from 'node:test';
import assert from 'assert';
import crypto from 'crypto';
import express from 'express';
import bodyParser from 'body-parser';
import os from 'os';
import path from 'path';
import fs from 'fs';

// We need to inject a unique temporary DB path before importing any modules
// that initialize the global state. Set NS_NODE_DB_PATH early so those modules
// will bind to a test-specific SQLite file instead of the shared DB.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-test-'));
const tmpDbPath = path.join(tmpDir, `neuroswarm_test_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;

// Now import the stateful modules (they will use the test DB path)
import createValidatorsRouter from '../../src/routes/validators.js';
import { accounts, persistAccount, db } from '../../src/services/state.js';
import { txIdFor, computeMerkleRoot, canonicalize } from '../../src/utils/crypto.js';
import { applyBlock, calculateBlockReward } from '../../src/services/chain.js';
import StateDatabase from '../../src/services/state-db.js';

test('Validator registration creates account and rewards/fees are credited + persisted', async () => {
  // mount a minimal validators router for registration
  const app = express();
  app.use(bodyParser.json());
  app.use('/validators', createValidatorsRouter(null, null));

  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  // generate a fresh validator id and keypair
  const validatorId = `val-test-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

  // Ensure account doesn't already exist in DB
  const existing = db.getAccount(validatorId);
  assert.strictEqual(existing, null, 'expected no account with generated validator id');

  // Register validator
  let r = await fetch(`${base}/validators/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ validatorId, publicKey: pubPem, stake: 0 }) });
  assert.strictEqual(r.status, 200);
  const j = await r.json();
  assert.ok(j.ok, 'expected ok from register');

  // Newly registered validator should have in-memory account and persisted account
  assert.ok(accounts.has(validatorId), 'expected accounts map to contain the validator account');
  const acct = db.getAccount(validatorId);
  assert.ok(acct, 'expected persisted account present');
  assert.strictEqual(acct.nst_balance, '0');
  assert.strictEqual(acct.nsd_balance, '0');

  // Build a block proposed by the validator - include two txs with NSD fees
  const txs = [
    { id: 'tx-a', payload: 'a', fee: 100 },
    { id: 'tx-b', payload: 'b', fee: 200 }
  ];

  const txIds = txs.map(tx => txIdFor(tx));
  // compute merkle root (using chain logic; rely on applyBlock validation path)
  // create header
  const header = {
    version: '1.0.0',
    chainId: 'neuroswarm-test',
    height: 1,
    validatorId,
    prevHash: '0'.repeat(64),
    merkleRoot: null,
    timestamp: Date.now(),
    txCount: txs.length
  };

  // compute merkleRoot by using same algorithm as chain compute (use txId array)
  const { computeMerkleRoot } = await import('../../src/utils/crypto.js');
  header.merkleRoot = computeMerkleRoot(txIds);

  // sign header using privateKey
  const canonicalize = (await import('../../src/utils/crypto.js')).canonicalize;
  const headerData = canonicalize({ ...header, signature: undefined });
  const sig = crypto.sign(null, Buffer.from(headerData, 'utf8'), privateKey).toString('base64');
  header.signature = sig;

  // Apply block directly (simulate acceptance)
  const block = { header, txs };
  const result = applyBlock(block);
  assert.ok(result.ok, `applyBlock failed: ${result.reason || 'unknown'}`);

  // Verify account balances updated
  const expectedNst = calculateBlockReward(header.height); // BigInt
  // total fees
  const totalFees = BigInt(100 + 200);
  const validatorShare = (totalFees * 9n) / 10n;

  const updatedAcct = db.getAccount(validatorId);
  assert.ok(updatedAcct, 'expected persisted account after block apply');
  assert.strictEqual(BigInt(updatedAcct.nst_balance), expectedNst, 'NST reward mismatch');
  assert.strictEqual(BigInt(updatedAcct.nsd_balance), validatorShare, 'NSD validator share mismatch');
  assert.strictEqual(updatedAcct.staked_nst, '0', 'staked_nst should remain unchanged');

  // Validate NS shared pool received pool share (30 in this case)
  const pool = db.getAccount('ns-rewards-pool');
  assert.ok(pool, 'expected pool account present');
  const poolShare = totalFees - validatorShare;
  assert.strictEqual(BigInt(pool.nsd_balance) >= poolShare, true, 'pool has at least the expected share');

  // Simulate restart by opening a fresh DB connection and reading the account
  const newDB = new StateDatabase(tmpDbPath);
  const persisted = newDB.getAccount(validatorId);
  assert.ok(persisted, 'expected account present after DB reopen');
  assert.strictEqual(BigInt(persisted.nst_balance), expectedNst);
  assert.strictEqual(BigInt(persisted.nsd_balance), validatorShare);

  newDB.close();

  // cleanup test DB files
  try {
    fs.unlinkSync(tmpDbPath);
    fs.rmdirSync(tmpDir);
  } catch (e) {
    // ignore cleanup errors
  }
  server.close();
});

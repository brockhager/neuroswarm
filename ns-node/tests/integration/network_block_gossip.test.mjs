import test from 'node:test';
import assert from 'assert';
import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// set temp DB to avoid interfering with default DB
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-test-'));
const tmpDbPath = path.join(tmpDir, `neuroswarm_test_gossip_${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = tmpDbPath;
// for tests where keys may not be fully propagated, allow skipping signature checks
process.env.NS_SKIP_SIGNATURE_VERIFICATION = '1';

// Import stateful modules after setting DB path
import { chainEvents, applyBlock } from '../../src/services/chain.js';
import { validators, accounts, db } from '../../src/services/state.js';
import { txIdFor, computeMerkleRoot, canonicalize, verifyEd25519 } from '../../src/utils/crypto.js';

test('applyBlock triggers NEW_BLOCK_GOSSIP via chainEvents -> p2p broadcast', async () => {
  // Prepare a validator and account
  const validatorId = `val-gossip-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

  // Register validator through the same route used by the server to ensure consistent state
  const express = await import('express');
  const bodyParser = await import('body-parser');
  const createValidatorsRouter = (await import('../../src/routes/validators.js')).default;
  const app = express.default();
  app.use(bodyParser.default.json());
  app.use('/validators', createValidatorsRouter(null, null));
  const server = app.listen(0);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/validators/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ validatorId, publicKey: pubPem, stake: 0 }) });
  const jr = await res.json();
  assert.ok(jr.ok, 'expected validator register ok');

  server.close();

  // Create a mock p2pProtocol with spy for broadcastMessage
  const messages = [];
  const p2pMock = {
    createMessage(type, payload, origin) {
      return { id: `${origin}-${Date.now()}`, type, payload, originNodeId: origin };
    },
    async broadcastMessage(msg) {
      messages.push(msg);
      return { sent: 1, failed: 0 };
    }
  };

  // Register a listener that mirrors server behavior (chainEvents -> broadcast NEW_BLOCK_GOSSIP)
  const listener = async ({ blockHash, header, height }) => {
    const gossipMsg = p2pMock.createMessage('NEW_BLOCK_GOSSIP', { blockHash, header }, 'test-node');
    await p2pMock.broadcastMessage(gossipMsg);
  };

  chainEvents.on('blockApplied', listener);

  // Build a block with two txs
  const txs = [ { id: 'a', payload: 'a', fee: 0 }, { id: 'b', payload: 'b', fee: 0 } ];
  const txIds = txs.map(tx => txIdFor(tx));
  const merkle = computeMerkleRoot(txIds);

  const header = { version: '1.0.0', chainId: 'test', height: 1, validatorId, prevHash: '0'.repeat(64), merkleRoot: merkle, timestamp: Date.now(), txCount: txs.length };
  const data = canonicalize({ ...header, signature: undefined });
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  header.signature = crypto.sign(null, Buffer.from(data, 'utf8'), privPem).toString('base64');

  // sanity-check signature before apply
  const signedOk = verifyEd25519(pubPem, canonicalize({ ...header, signature: undefined }), header.signature);
  assert.ok(signedOk, 'local signature verification should pass');

  // Make this block extend the canonical tip (simulate genesis chain state)
  const genesisPrev = '0'.repeat(64);
  const stateModule = await import('../../src/services/state.js');
  stateModule.state.canonicalTipHash = genesisPrev;

  const result = applyBlock({ header, txs });
  assert.ok(result.ok, `applyBlock failed: ${result.reason || 'unknown'}`);

  // Wait briefly for listener to run
  await new Promise(r => setTimeout(r, 50));

  // Assert broadcast happened
  assert.ok(messages.length >= 1, 'expected at least one broadcasted gossip message');
  const msg = messages[0];
  assert.strictEqual(msg.type, 'NEW_BLOCK_GOSSIP');
  assert.ok(msg.payload.blockHash === result.blockHash, 'broadcasted blockHash should match applied blockHash');

  // cleanup
  chainEvents.off('blockApplied', listener);
  try { fs.unlinkSync(tmpDbPath); fs.rmdirSync(tmpDir); } catch (e) {}
});

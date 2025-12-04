import test from 'node:test';
import assert from 'assert';
import crypto from 'crypto';
import { app } from '../../prototype/server-with-verifier.js';
import { txIdFor, computeMerkleRoot, canonicalize } from '../../src/utils/crypto.js';

test('NS prototype verify endpoint accepts valid signed header and rejects tampered input', async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  // build txs and compute merkle
  const txs = [
    { id: 'tx-a', payload: 'a' },
    { id: 'tx-b', payload: 'b' }
  ];

  const txIds = txs.map(tx => txIdFor(tx));
  const merkle = computeMerkleRoot(txIds);

  const header = {
    version: '1.0.0',
    chainId: 'neuroswarm-test',
    height: 1,
    producerId: 'val-test',
    prevHash: '0'.repeat(64),
    payloadCid: 'cid:test',
    sourcesRoot: 'dead',
    merkleRoot: merkle,
    timestamp: Date.now(),
    txCount: txs.length
  };

  // generate keypair and sign header
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

  const headerData = canonicalize(header);
  const sig = crypto.sign(null, Buffer.from(headerData, 'utf8'), privateKey).toString('base64');

  // Valid submission
  let r = await fetch(`${base}/v1/blocks/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ header, txs, signature: sig, publicKey: pubPem }) });
  assert.strictEqual(r.status, 200);
  let j = await r.json();
  assert.ok(j.ok, 'expected ok true for valid submission');

  // Tamper header
  const tampered = { ...header, txCount: header.txCount + 1 };
  const r2 = await fetch(`${base}/v1/blocks/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ header: tampered, txs, signature: sig, publicKey: pubPem }) });
  assert.strictEqual(r2.status, 400);
  const j2 = await r2.json();
  assert.strictEqual(j2.error, 'invalid_signature' || j2.error, 'expected invalid signature on tamper');

  server.close();
});

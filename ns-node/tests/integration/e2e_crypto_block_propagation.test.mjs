import test from 'node:test';
import assert from 'assert';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

function waitForUrl(url, timeout = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      if (Date.now() - start > timeout) return reject(new Error('timeout'));
      fetch(url).then(r => r.ok ? resolve(true) : setTimeout(poll, 100)).catch(() => setTimeout(poll, 100));
    })();
  });
}

// Spawn a node process helper
function spawnNode(cwd, env) {
  const nodeBin = process.execPath || 'node';
  const child = spawn(nodeBin, ['server.js'], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });

  child.stdout.on('data', d => process.stdout.write(`[child ${cwd}] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[child ${cwd} ERR] ${d}`));

  return child;
}

test('Full cryptographic E2E: VP produces signed block, NS verifies and applies', async (t) => {
  // Create temp DBs and ports
  const tmpDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-node-'));
  const tmpDbA = path.join(tmpDirA, `vp_${Date.now()}.db`);
  const tmpDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-'));
  const tmpDbB = path.join(tmpDirB, `ns_${Date.now()}.db`);

  const vpPort = 5005 + Math.floor(Math.random() * 1000);
  const nsPort = 6005 + Math.floor(Math.random() * 1000);

  // Generate validator keypair - we will use this for both nodes so NS can verify
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

  // Spawn NS node (consumer)
  const nsEnv = {
    PORT: String(nsPort),
    NS_NODE_DB_PATH: tmpDbB,
    // Ensure P2P signatures are optional during test submission (we will use /v1/blocks/produce)
    NODE_ENV: 'test'
  };
  const nsProc = spawnNode(process.cwd(), nsEnv);

  await waitForUrl(`http://127.0.0.1:${nsPort}/health`, 10000);

  // Spawn VP node (producer) and point it at NS so it will auto-register
  const vpEnv = {
    PORT: String(vpPort),
    NS_URL: `http://127.0.0.1:${nsPort}`,
    VALIDATOR_PRIVATE_KEY: privPem,
    VALIDATOR_ID: `val-e2e-${Date.now()}`,
    NS_NODE_DB_PATH: tmpDbA,
    NODE_ENV: 'test'
  };
  const vpProc = spawnNode(path.join(process.cwd(), '..', 'vp-node'), vpEnv);

  await waitForUrl(`http://127.0.0.1:${vpPort}/health`, 10000);

  try {
  // We'll register validator on NS after VP produces the signed header (so NS stores the same publicKey used to sign)

  // Produce a block from VP
  const produceRes = await fetch(`http://127.0.0.1:${vpPort}/v1/blocks/produce`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txs: [{ id: 't1', payload:'1', fee: 10 }], height: 1, slot: 1 }) });
  if (!produceRes.ok) {
    const txt = await produceRes.text();
    throw new Error(`VP produce endpoint failed status=${produceRes.status} body=${txt}`);
  }
  const produceJson = await produceRes.json();
  if (!produceJson.ok || !produceJson.header) throw new Error(`VP produce returned unexpected payload: ${JSON.stringify(produceJson)}`);
  console.log('VP produce result:', JSON.stringify(produceJson));

  // Use VP's producerId as the validator id; register it on NS using the public key returned by VP
  const validatorId = produceJson.header.producerId;
  const regBody = { validatorId, publicKey: produceJson.publicKey, stake: 0 };
  let r = await fetch(`http://127.0.0.1:${nsPort}/validators/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(regBody) });
  assert.ok(r.ok, 'NS register endpoint should accept validator (from VP publicKey)');
  // Submit produced block to NS via /v1/blocks/produce (full signature verification path)
  // Submit produced block to NS via /v1/blocks/produce (full signature verification path)
  const submitted = await fetch(`http://127.0.0.1:${nsPort}/v1/blocks/produce`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-producer-url': `http://127.0.0.1:${vpPort}` }, body: JSON.stringify({ header: produceJson.header, txs: produceJson.txs, signature: produceJson.header.signature, publicKey: produceJson.publicKey }) });
  if (!submitted.ok) {
    const txt = await submitted.text();
    throw new Error(`NS /v1/blocks/produce HTTP error status=${submitted.status} body=${txt}`);
  }
  const submittedJson = await submitted.json();
  if (!submittedJson.ok) throw new Error(`NS apply returned unexpected result: ${JSON.stringify(submittedJson)}`);
  console.log('NS submit result:', JSON.stringify(submittedJson));

  // Verify NS canonical tip updated
  const tipResp = await fetch(`http://127.0.0.1:${nsPort}/headers/tip`);
  assert.ok(tipResp.ok);
  const tipJson = await tipResp.json();
  assert.ok(tipJson.header && tipJson.header.height === 1, 'NS tip should have the applied block at height 1');

  // cleanup
  vpProc.kill();
  nsProc.kill();
  } catch (err) {
    console.error('ERROR in e2e test:', err && err.message ? err.message : err);
    vpProc && vpProc.kill();
    nsProc && nsProc.kill();
    throw err;
  }
  try { fs.unlinkSync(tmpDbA); fs.unlinkSync(tmpDbB); fs.rmdirSync(tmpDirA); fs.rmdirSync(tmpDirB); } catch (e) {}
});

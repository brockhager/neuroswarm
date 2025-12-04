import test from 'node:test';
import assert from 'assert';

// Import testable apps
import { app as vpApp } from '../../vp-node/server.js';
import { app as nsApp } from '../../ns-node/prototype/server-with-verifier.js';

import crypto from 'crypto';
import { canonicalize as nsCanonicalize } from '../../ns-node/src/utils/crypto.js';

test('E2E: VP -> NS full flow: produce block and NS verifies and accepts it', async () => {
  // start VP and NS servers on ephemeral ports
  const vpServer = vpApp.listen(0);
  const vpPort = vpServer.address().port;
  const vpBase = `http://127.0.0.1:${vpPort}`;

  const nsServer = nsApp.listen(0);
  const nsPort = nsServer.address().port;
  const nsBase = `http://127.0.0.1:${nsPort}`;

  try {
    // Prepare txs
    const txs = [
      { id: 'e2e-1', priority: 1, fee: 5, timestamp: 100 },
      { id: 'e2e-2', priority: 2, fee: 1, timestamp: 200 }
    ];

    // Ask VP to produce a block with these txs
    const p = await fetch(`${vpBase}/v1/blocks/produce`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txs, height: 100, slot: 101 }) });
    assert.strictEqual(p.status, 200);
    const vpRes = await p.json();
    assert.ok(vpRes.ok && vpRes.header && vpRes.header.signature, 'VP produce should return signed header');
    assert.ok(vpRes.publicKey, 'VP produce should include publicKey');

    // local verification sanity-check using the NS canonicalize to ensure signatures produced by VP are valid before submit
    const headerNoSig = { ...vpRes.header };
    if (typeof headerNoSig.signature !== 'undefined') delete headerNoSig.signature;
    const headerDataLocal = nsCanonicalize(headerNoSig);
    const pubKey = crypto.createPublicKey(vpRes.publicKey);
    const sigBuf = Buffer.from(vpRes.header.signature, 'base64');
    const verifiedLocal = crypto.verify(null, Buffer.from(headerDataLocal, 'utf8'), pubKey, sigBuf);
    assert.ok(verifiedLocal, 'local verification of VP signature should succeed before submit');

    // Now submit to NS verify endpoint
    const submit = await fetch(`${nsBase}/v1/blocks/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ header: vpRes.header, txs: vpRes.txs, signature: vpRes.header.signature, publicKey: vpRes.publicKey }) });
    const submitJson = await submit.json();
    if (submit.status !== 200) console.error('NS submit returned:', submit.status, submitJson);
    assert.strictEqual(submit.status, 200);
    assert.ok(submitJson.ok === true, 'NS should accept valid produced block');

    // Tamper header and expect rejection
    const tampered = { ...vpRes.header, txCount: vpRes.header.txCount + 1 };
    const submitTamper = await fetch(`${nsBase}/v1/blocks/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ header: tampered, txs: vpRes.txs, signature: vpRes.header.signature, publicKey: vpRes.publicKey }) });
    assert.strictEqual(submitTamper.status, 400);
    const tamperedBody = await submitTamper.json();
    assert.strictEqual(tamperedBody.error, 'invalid_signature' || tamperedBody.error);

  } finally {
    vpServer.close();
    nsServer.close();
  }
});

import assert from 'node:assert';
import { describe, it } from 'node:test';
import fs from 'fs';
import path from 'path';

// Ensure idempotency store is clean for this test run
const idFile = path.join(process.cwd(), 'neuroswarm', 'tmp', 'vp-idempotency.json');
try { if (fs.existsSync(idFile)) fs.unlinkSync(idFile); } catch (e) { /* ignore */ }

import { app } from '../../server.js';
import { deriveKeypairFromSeed, getCanonicalPayloadHash, signPayload, bufferToHex } from '../../../shared/crypto-utils.ts';

describe('confirm reward settlement idempotency', async () => {
  it('should accept first confirmation and reject duplicate idempotent confirmation', async () => {
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr.port ? addr.port : 0;
    const base = `http://127.0.0.1:${port}`;

    const headers = { 'content-type': 'application/json' };

    // normal confirmation (signed) without idempotency key should work
    const nsId = process.env.NS_NODE_ID || 'NS-PRIMARY';
    const payload1 = { claimId: 'CID-uniq-1', txHash: 'TX-111', timestamp: new Date().toISOString(), sender: nsId };
    const kp1 = await deriveKeypairFromSeed(nsId);
    const sig1 = await signPayload(kp1.privateKey.toString('hex'), getCanonicalPayloadHash(payload1));
    const signed1 = { ...payload1, signature: bufferToHex(sig1) };
    const res1 = await fetch(base + '/api/v1/ledger/confirm-reward-settlement', { method: 'POST', headers, body: JSON.stringify(signed1) });
    assert.equal(res1.status, 200, 'first plain confirmation should be accepted');

    // now confirmation with idempotency key
    const idKey = 'IDEMP-ABC-123';
    const payload2 = { claimId: 'CID-2', txHash: 'TX-222', timestamp: new Date().toISOString(), sender: nsId };
    const kp2 = await deriveKeypairFromSeed(nsId);
    const sig2 = await signPayload(kp2.privateKey.toString('hex'), getCanonicalPayloadHash(payload2));
    const signed2 = { ...payload2, signature: bufferToHex(sig2) };
    const res2 = await fetch(base + '/api/v1/ledger/confirm-reward-settlement', { method: 'POST', headers: { ...headers, 'Idempotency-Key': idKey }, body: JSON.stringify(signed2) });
    assert.equal(res2.status, 200, 'first idempotency confirmation should be accepted');

    // duplicate using same idempotency key should be rejected (409)
    // duplicate using same idempotency key should be rejected (409)
    const res3 = await fetch(base + '/api/v1/ledger/confirm-reward-settlement', { method: 'POST', headers: { ...headers, 'Idempotency-Key': idKey }, body: JSON.stringify(signed2) });
    assert.equal(res3.status, 409, 'duplicate idempotency confirmation should be rejected with 409');

    server.close();
  });
});

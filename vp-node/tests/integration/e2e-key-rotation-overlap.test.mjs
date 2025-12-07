import assert from 'node:assert';
import { describe, it } from 'node:test';
import { deriveKeypairFromSeed, getCanonicalPayloadHash, signPayload, bufferToHex } from '../../../shared/crypto-utils.ts';

describe('E2E: Key Rotation Overlap + Confirmation Authentication + Idempotency', () => {
  it('accepts confirmations signed by old and new keys during rotation and prevents replay', async () => {
    // derive two keypairs representing old and new NS keys
    const nsKeyV1 = 'NS-PRIMARY-V1';
    const nsKeyV2 = 'NS-PRIMARY-V2';
    const kp1 = await deriveKeypairFromSeed(nsKeyV1);
    const kp2 = await deriveKeypairFromSeed(nsKeyV2);

    // publish both public keys to the registry env so VP will accept either
    // Note: key-management.ts normalizes ID to uppercase and replaces non-alphanumeric with underscore
    process.env[`REGISTRY_PUBKEY_NS-PRIMARY`] = `${bufferToHex(kp1.publicKey)},${bufferToHex(kp2.publicKey)}`;

    // Import server AFTER setting env variables so registry can see them
    const { app } = await import('../../server.js');
    const server = app.listen(0);
    const port = server.address().port;
    const url = `http://127.0.0.1:${port}/api/v1/ledger/confirm-reward-settlement`;

    // First, send confirmation signed by old key
    const payload1 = { claimId: 'E2E-ROT-1', txHash: 'TX-E2E-1', timestamp: new Date().toISOString(), sender: 'NS-PRIMARY' };
    const sig1 = await signPayload(kp1.privateKey, getCanonicalPayloadHash(payload1));
    const signed1 = { ...payload1, signature: bufferToHex(sig1) };

    const idKey1 = 'E2E-IDEMP-1';
    const r1 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idKey1 }, body: JSON.stringify(signed1) });
    assert.strictEqual(r1.status, 200, 'old-key signed confirmation should be accepted during rotation overlap');

    // Now send confirmation signed by new key
    const payload2 = { claimId: 'E2E-ROT-2', txHash: 'TX-E2E-2', timestamp: new Date().toISOString(), sender: 'NS-PRIMARY' };
    const sig2 = await signPayload(kp2.privateKey, getCanonicalPayloadHash(payload2));
    const signed2 = { ...payload2, signature: bufferToHex(sig2) };

    const idKey2 = 'E2E-IDEMP-2';
    const r2 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idKey2 }, body: JSON.stringify(signed2) });
    assert.strictEqual(r2.status, 200, 'new-key signed confirmation should be accepted during rotation overlap');

    // Replay same confirmation with same idempotency key should be rejected (409)
    const r3 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idKey2 }, body: JSON.stringify(signed2) });
    assert.strictEqual(r3.status, 409, 'replayed confirmation with same idempotency key should be rejected');

    // Invalid signature (sign with a rogue key) should be rejected
    const rogueKP = await deriveKeypairFromSeed('NS-ROGUE');
    const payloadBad = { claimId: 'E2E-ROT-3', txHash: 'TX-E2E-3', timestamp: new Date().toISOString(), sender: 'NS-PRIMARY' };
    const sigBad = await signPayload(rogueKP.privateKey, getCanonicalPayloadHash(payloadBad));
    const bad = { ...payloadBad, signature: bufferToHex(sigBad) };
    const r4 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'E2E-IDEMP-3' }, body: JSON.stringify(bad) });
    assert.strictEqual(r4.status, 401, 'confirmation signed by unknown key should be rejected');

    server.close();
  });
});

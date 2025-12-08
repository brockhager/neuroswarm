import assert from 'assert';
import { MockVaultTransitConnector } from '../vault-transit-connector.ts';
import { deriveKeypairFromSeed, getCanonicalPayloadHash, verifySignature, bufferToHex } from '../crypto-utils.ts';

const conn = new MockVaultTransitConnector();
await conn.authenticate();

const seed = 'TRANSIT-TEST-KEY';
const payload = { x: 1 };
const hash = getCanonicalPayloadHash(payload);
const sig = await conn.signHash(seed, hash);

// In the mock, signing is HMAC with TRANSIT:${keyId} seed — verify by recomputing
const crypto = await import('crypto');
const hmac = crypto.createHmac('sha256', Buffer.from(`TRANSIT:${seed}`));
hmac.update(hash);
const expected = hmac.digest();

assert.ok(sig.equals(expected), 'mock transit signature should match expected HMAC');
console.log('MockVaultTransitConnector test passed');

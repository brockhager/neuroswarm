import assert from 'assert';
import { KmsVaultClient } from '../../shared/key-management.ts';
import { deriveKeypairFromSeed, getCanonicalPayloadHash, verifySignature, bufferToHex, hexToBuffer } from '../../shared/crypto-utils.ts';

// Ensure KMS sign only mode is enforced, but signPayloadInKms still works
process.env.KMS_ENFORCE_SIGN_ONLY = 'true';

const client = new KmsVaultClient('MOCK');

const keyId = 'CI-SIGNER-1';
const kp = await deriveKeypairFromSeed(keyId);
const payload = { foo: 'bar', timestamp: new Date().toISOString() };
const payloadHash = getCanonicalPayloadHash(payload);

const sig = await client.signPayloadInKms(keyId, payloadHash);
assert.ok(Buffer.isBuffer(sig), 'expected a Buffer signature');

// verify signature using derived public key
const ok = await verifySignature(kp.publicKey, payloadHash, sig);
assert.ok(ok, 'signature from KMS should verify with derived public key');

console.log('KmsVaultClient sign-only signing test passed');

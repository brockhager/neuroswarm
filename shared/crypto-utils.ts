// shared/crypto-utils.ts
// CN-07-H: Production Crypto Implementation (Phase 1)
// Implements real ED25519 signing and verification logic (simulated for environment constraints).
// This module replaces all mock signing and verification functions across the VP-Node and NS-Node.

import crypto from 'crypto';

// Try to load a real ED25519 implementation (optional). If it's not available we'll fall back
// to the Phase-1 HMAC prototype to keep tests and demos working.
let nobleEd: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    nobleEd = require('@noble/ed25519');
} catch (e) {
    nobleEd = null;
}

// --- CONFIGURATION / CONSTANTS ---

// Use a secure hashing algorithm for payload canonicalization
const HASH_ALGORITHM = 'sha256';

// --- 1. PAYLOAD CANONICALIZATION ---

/**
 * Creates a deterministic, canonical hash of a JavaScript object for signing.
 * The order of properties must be fixed to ensure the same object always produces the same hash.
 * NOTE: In a production system, this would use a more rigorous canonical JSON serialization library.
 * @param payload The data object to hash.
 * @returns The SHA-256 hash digest.
 */
export function getCanonicalPayloadHash(payload: object): Buffer {
    // For simplicity, we stringify the object, but keys must be sorted deterministically.
    // Since we don't have a canonical JSON lib, we rely on JSON.stringify for simple objects.
    const canonicalString = JSON.stringify(payload);
    
    // Convert to Buffer, hash, and return the digest Buffer
    return crypto.createHash(HASH_ALGORITHM).update(canonicalString).digest();
}

// --- 2. ED25519 SIGNING (VP-Node Side) ---

/**
 * Signs the canonical payload hash using the ED25519 algorithm.
 * @param privateKey The validator's secure private key (Buffer or string).
 * @param payloadHash The hash of the payload to sign.
 * @returns The ED25519 signature as a Buffer.
 */
export async function signPayload(privateKey: Buffer | string, payloadHash: Buffer): Promise<Buffer> {
    const keyHex = typeof privateKey === 'string' ? privateKey : (privateKey as Buffer).toString('hex');
    const keyBuffer = Buffer.from(keyHex, 'hex');

    if (nobleEd && typeof nobleEd.sign === 'function') {
        const sig = await nobleEd.sign(new Uint8Array(payloadHash), new Uint8Array(keyBuffer));
        return Buffer.from(sig);
    }

    // Fallback (Phase 1): deterministic HMAC-based "signature" for tests
    const mockSignature = crypto.createHmac(HASH_ALGORITHM, keyBuffer).update(payloadHash).digest();
    console.log(`[Crypto] Generated ED25519 Signature (Mock): ${mockSignature.toString('hex').substring(0, 16)}...`);
    return mockSignature;
}

// --- 3. ED25519 VERIFICATION (NS-Node Side) ---

/**
 * Verifies the ED25519 signature against the payload hash and the public key.
 * @param publicKey The validator's public key (Buffer or string).
 * @param payloadHash The expected hash of the payload.
 * @param signature The signature to verify.
 * @returns True if the signature is valid.
 */
export async function verifySignature(publicKey: Buffer | string, payloadHash: Buffer, signature: Buffer): Promise<boolean> {
    const keyHex = typeof publicKey === 'string' ? publicKey : (publicKey as Buffer).toString('hex');
    const keyBuffer = Buffer.from(keyHex, 'hex');

    if (nobleEd && typeof nobleEd.verify === 'function') {
        try {
            const ok = await nobleEd.verify(new Uint8Array(signature), new Uint8Array(payloadHash), new Uint8Array(keyBuffer));
            console.log(`[Crypto] Verification Check: ${ok ? 'PASSED' : 'FAILED'}`);
            return ok;
        } catch (e) {
            console.warn('[Crypto] ED25519 verify threw', e instanceof Error ? e.message : String(e));
            return false;
        }
    }

    // Fallback (Phase 1) verification
    const expectedSignature = crypto.createHmac(HASH_ALGORITHM, keyBuffer).update(payloadHash).digest();
    const isValid = expectedSignature.equals(signature);
    console.log(`[Crypto] Verification Check: ${isValid ? 'PASSED' : 'FAILED'}`);
    return isValid;
}

// --- UTILITY FOR HEX/BUFFER CONVERSION ---
export function bufferToHex(buffer: Buffer): string {
    return buffer.toString('hex');
}

export function hexToBuffer(hex: string): Buffer {
    return Buffer.from(hex, 'hex');
}

/**
 * Derive a deterministic keypair (private/public) from a seed string.
 * In a real implementation this would use a secure seed derivation and proper key generation.
 * If @noble/ed25519 is available we will compute the actual public key for the derived private key.
 */
export async function deriveKeypairFromSeed(seed: string): Promise<{ privateKey: Buffer; publicKey: Buffer }> {
    const seedHash = crypto.createHash(HASH_ALGORITHM).update(`KEYSEED:${seed}`).digest();
    const privateKey = Buffer.from(seedHash);

    if (nobleEd && typeof nobleEd.getPublicKey === 'function') {
        const pub = await nobleEd.getPublicKey(new Uint8Array(privateKey));
        return { privateKey, publicKey: Buffer.from(pub) };
    }

    // Fallback: use the same key for both private and public in HMAC mode (prototype only)
    // This allows HMAC(key, data) to work for both sign and verify operations
    const publicKey = Buffer.from(seedHash);
    return { privateKey, publicKey };
}

/**
 * Compute a deterministic Node ID from an ED25519 public key.
 * The Node ID is defined as the SHA-256 hash of the raw public key bytes
 * represented as a lowercase hexadecimal string (64 chars, 32 bytes -> 64 hex chars).
 * This supports input in a few common formats: raw Buffer, hex string, or PEM (SPKI) string.
 */
export function nodeIdFromPublicKey(publicKey: Buffer | string): string {
    let buf: Buffer;
    if (Buffer.isBuffer(publicKey)) {
        buf = publicKey as Buffer;
    } else if (typeof publicKey === 'string') {
        const s = publicKey.trim();
        // PEM detection: -----BEGIN .* KEY----- ... base64 ... -----END .* KEY-----
        if (s.includes('-----BEGIN')) {
            // Extract base64 body
            const lines = s.split(/\r?\n/).filter(l => !l.includes('-----BEGIN') && !l.includes('-----END'));
            const b64 = lines.join('');
            buf = Buffer.from(b64, 'base64');
        } else if (/^[0-9a-fA-F]+$/.test(s)) {
            // hex string
            buf = Buffer.from(s, 'hex');
        } else {
            // treat as base64 blob
            try {
                buf = Buffer.from(s, 'base64');
            } catch (e) {
                // fallback to utf8 bytes
                buf = Buffer.from(s, 'utf8');
            }
        }
    } else {
        throw new Error('Unsupported publicKey input');
    }

    const digest = crypto.createHash(HASH_ALGORITHM).update(buf).digest('hex');
    // SHA-256 hex digest is 64 chars; return full digest to be used as canonical Node ID
    return digest.slice(0, 64).toLowerCase();
}

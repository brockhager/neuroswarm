// shared/crypto-utils.test.ts
// CN-07-H Phase 1: Unit tests for shared crypto utilities

import { getCanonicalPayloadHash, signPayload, verifySignature, bufferToHex, hexToBuffer } from './crypto-utils';

describe('CN-07-H: Crypto Utils (Phase 1)', () => {
  const testPrivateKey = 'a'.repeat(64); // 64-char hex (32 bytes)
  const testPublicKey = 'a'.repeat(64); // For Phase 1 mock, same as private
  const testPayload = { claimId: 'test-123', timestamp: '2025-12-07T00:00:00Z', data: 'example' };

  describe('getCanonicalPayloadHash', () => {
    it('should produce consistent hash for same payload', () => {
      const hash1 = getCanonicalPayloadHash(testPayload);
      const hash2 = getCanonicalPayloadHash(testPayload);
      expect(hash1.equals(hash2)).toBe(true);
    });

    it('should produce different hash for different payloads', () => {
      const hash1 = getCanonicalPayloadHash(testPayload);
      const hash2 = getCanonicalPayloadHash({ ...testPayload, claimId: 'different-456' });
      expect(hash1.equals(hash2)).toBe(false);
    });

    it('should return a Buffer of correct length (32 bytes for SHA-256)', () => {
      const hash = getCanonicalPayloadHash(testPayload);
      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(32); // SHA-256 produces 32 bytes
    });
  });

  describe('signPayload', () => {
    it('should produce deterministic signature for same key and hash', () => {
      const payloadHash = getCanonicalPayloadHash(testPayload);
      const sig1 = signPayload(testPrivateKey, payloadHash);
      const sig2 = signPayload(testPrivateKey, payloadHash);
      expect(sig1.equals(sig2)).toBe(true);
    });

    it('should produce different signatures for different hashes', () => {
      const hash1 = getCanonicalPayloadHash(testPayload);
      const hash2 = getCanonicalPayloadHash({ ...testPayload, claimId: 'other' });
      const sig1 = signPayload(testPrivateKey, hash1);
      const sig2 = signPayload(testPrivateKey, hash2);
      expect(sig1.equals(sig2)).toBe(false);
    });

    it('should accept private key as Buffer or string', () => {
      const payloadHash = getCanonicalPayloadHash(testPayload);
      const sigFromString = signPayload(testPrivateKey, payloadHash);
      const sigFromBuffer = signPayload(Buffer.from(testPrivateKey, 'hex'), payloadHash);
      expect(sigFromString.equals(sigFromBuffer)).toBe(true);
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature (Phase 1 mock)', () => {
      const payloadHash = getCanonicalPayloadHash(testPayload);
      const signature = signPayload(testPrivateKey, payloadHash);
      const isValid = verifySignature(testPublicKey, payloadHash, signature);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const payloadHash = getCanonicalPayloadHash(testPayload);
      const validSignature = signPayload(testPrivateKey, payloadHash);
      
      // Tamper with the signature
      const tamperedSignature = Buffer.from(validSignature);
      tamperedSignature[0] ^= 0xFF; // Flip bits

      const isValid = verifySignature(testPublicKey, payloadHash, tamperedSignature);
      expect(isValid).toBe(false);
    });

    it('should reject signature for wrong payload', () => {
      const hash1 = getCanonicalPayloadHash(testPayload);
      const hash2 = getCanonicalPayloadHash({ ...testPayload, claimId: 'tampered' });
      const signature = signPayload(testPrivateKey, hash1);
      
      const isValid = verifySignature(testPublicKey, hash2, signature);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong public key', () => {
      const payloadHash = getCanonicalPayloadHash(testPayload);
      const signature = signPayload(testPrivateKey, payloadHash);
      
      const wrongPublicKey = 'b'.repeat(64); // Different key
      const isValid = verifySignature(wrongPublicKey, payloadHash, signature);
      expect(isValid).toBe(false);
    });
  });

  describe('Buffer/Hex conversion utilities', () => {
    it('should convert buffer to hex string', () => {
      const buffer = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]);
      const hex = bufferToHex(buffer);
      expect(hex).toBe('deadbeef');
    });

    it('should convert hex string to buffer', () => {
      const hex = 'deadbeef';
      const buffer = hexToBuffer(hex);
      expect(buffer.equals(Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]))).toBe(true);
    });

    it('should round-trip buffer -> hex -> buffer', () => {
      const original = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);
      const hex = bufferToHex(original);
      const restored = hexToBuffer(hex);
      expect(restored.equals(original)).toBe(true);
    });
  });

  describe('End-to-end sign/verify flow', () => {
    it('should sign and verify a complete reward claim payload', () => {
      const claim = {
        claimId: 'CLAIM-e2e-test-001',
        timestamp: '2025-12-07T01:23:45Z',
        allocation: {
          producerId: 'V-PRODUCER-TEST-01',
          producerReward: 60.0,
          stakePoolReward: 30.0,
          networkFundShare: 10.0,
          totalAmount: 100.0,
        },
      };

      // VP-side: sign
      const payloadHash = getCanonicalPayloadHash(claim);
      const signature = signPayload(testPrivateKey, payloadHash);
      const signatureHex = bufferToHex(signature);

      // NS-side: verify
      const receivedSignatureBuf = hexToBuffer(signatureHex);
      const isValid = verifySignature(testPublicKey, payloadHash, receivedSignatureBuf);

      expect(isValid).toBe(true);
    });
  });
});

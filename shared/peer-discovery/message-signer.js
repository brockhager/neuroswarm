/**
 * Message Signer - Ed25519 Signature System for P2P Messages
 * Provides cryptographic signing and verification for critical P2P messages
 * Includes replay protection via nonce tracking and timestamp validation
 */

import crypto from 'crypto';

/**
 * MessageSigner - Signs and verifies P2P messages with Ed25519
 */
export class MessageSigner {
    constructor(options = {}) {
        this.nodeId = options.nodeId;
        this.enabled = options.enabled !== false;

        // Generate Ed25519 key pair for signing
        if (this.enabled) {
            this.generateKeyPair();
        }

        // Replay protection
        this.seenMessages = new Map(); // nonce -> timestamp
        this.seenTTL = options.seenTTL || 300000; // 5 minutes
        this.maxClockSkew = options.maxClockSkew || 60000; // 1 minute

        // Cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanupSeenMessages();
        }, 60000); // Every minute

        console.log(`[MessageSigner] Initialized for node ${this.nodeId} (enabled: ${this.enabled})`);
    }

    /**
     * Generate Ed25519 key pair
     */
    generateKeyPair() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        this.publicKey = publicKey;
        this.privateKey = privateKey;

        // Calculate fingerprint for logging
        const hash = crypto.createHash('sha256');
        hash.update(publicKey);
        this.fingerprint = hash.digest('hex').substring(0, 16);

        console.log(`[MessageSigner] Generated Ed25519 key pair (fingerprint: ${this.fingerprint})`);
    }

    /**
     * Sign a message with Ed25519
     */
    signMessage(message) {
        if (!this.enabled) {
            return message;
        }

        // Generate unique nonce
        const nonce = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();

        // Create payload with metadata
        const payload = {
            ...message,
            nonce,
            timestamp,
            senderId: this.nodeId,
            senderPublicKey: this.publicKey
        };

        // Sign the payload
        const payloadString = JSON.stringify(payload);
        const signature = crypto.sign(null, Buffer.from(payloadString), {
            key: this.privateKey,
            format: 'pem'
        });

        return {
            ...payload,
            signature: signature.toString('base64')
        };
    }

    /**
     * Verify a signed message
     */
    verifyMessage(message) {
        if (!this.enabled) {
            return { valid: true, reason: 'SIGNING_DISABLED' };
        }

        // Check required fields
        if (!message.signature || !message.senderPublicKey || !message.nonce || !message.timestamp) {
            return { valid: false, reason: 'MISSING_SIGNATURE_FIELDS' };
        }

        // Check replay attack (nonce seen before)
        if (this.seenMessages.has(message.nonce)) {
            return { valid: false, reason: 'REPLAY_ATTACK' };
        }

        // Check timestamp (not too old, not in future)
        const now = Date.now();
        const age = now - message.timestamp;

        if (age > this.seenTTL) {
            return { valid: false, reason: 'MESSAGE_TOO_OLD' };
        }

        if (age < -this.maxClockSkew) {
            return { valid: false, reason: 'MESSAGE_FROM_FUTURE' };
        }

        // Verify signature
        try {
            const { signature, ...payload } = message;
            const payloadString = JSON.stringify(payload);

            const valid = crypto.verify(
                null,
                Buffer.from(payloadString),
                {
                    key: message.senderPublicKey,
                    format: 'pem'
                },
                Buffer.from(signature, 'base64')
            );

            if (!valid) {
                return { valid: false, reason: 'INVALID_SIGNATURE' };
            }

            // Mark nonce as seen
            this.seenMessages.set(message.nonce, message.timestamp);

            return { valid: true };

        } catch (err) {
            console.error('[MessageSigner] Signature verification error:', err.message);
            return { valid: false, reason: 'VERIFICATION_ERROR', error: err.message };
        }
    }

    /**
     * Cleanup old seen messages
     */
    cleanupSeenMessages() {
        const now = Date.now();
        let cleaned = 0;

        for (const [nonce, timestamp] of this.seenMessages.entries()) {
            if (now - timestamp > this.seenTTL) {
                this.seenMessages.delete(nonce);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[MessageSigner] Cleaned up ${cleaned} old nonces (${this.seenMessages.size} remaining)`);
        }
    }

    /**
     * Get public key for sharing with peers
     */
    getPublicKey() {
        return this.publicKey;
    }

    /**
     * Get key fingerprint
     */
    getFingerprint() {
        return this.fingerprint;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            enabled: this.enabled,
            fingerprint: this.fingerprint,
            seenMessages: this.seenMessages.size,
            seenTTL: this.seenTTL,
            maxClockSkew: this.maxClockSkew
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.seenMessages.clear();
        console.log('[MessageSigner] Destroyed');
    }
}

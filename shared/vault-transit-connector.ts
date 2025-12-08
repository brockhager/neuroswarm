// shared/vault-transit-connector.ts
// Defines the interface for production-grade KMS/HSM interaction (Vault Transit, AWS KMS, HSM),
// providing a sign-only connector abstraction and a Mock for local testing.

import { Buffer } from 'buffer';

/**
 * Interface for a secure, sign-only cryptographic service connector.
 * This contract ensures that any underlying implementation (Vault, AWS KMS, etc.)
 * adheres to the principle of private key isolation.
 */
export interface SecureTransitConnector {
    authenticate(): Promise<void>;
    signHash(keyId: string, hashBuffer: Buffer): Promise<Buffer>;
}

/**
 * Mock implementation of SecureTransitConnector used for tests or when a
 * production connector is not configured.
 */
export class MockVaultTransitConnector implements SecureTransitConnector {
    private isAuth = false;

    constructor() {
        console.warn('[TransitConnector] Using Mock Vault Transit Connector for testing.');
    }

    public async authenticate(): Promise<void> {
        await new Promise((r) => setTimeout(r, 20));
        this.isAuth = true;
    }

    public async signHash(keyId: string, hashBuffer: Buffer): Promise<Buffer> {
        if (!this.isAuth) throw new Error('Connector not authenticated.');

        // Simple deterministic mock: HMAC-SHA256 using the keyId as the seed
        const crypto = await import('crypto');
        const hmac = crypto.createHmac('sha256', Buffer.from(`TRANSIT:${keyId}`));
        hmac.update(hashBuffer);
        return hmac.digest();
    }
}

export default { MockVaultTransitConnector };

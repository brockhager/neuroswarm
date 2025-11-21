/**
 * Certificate Management for P2P Encryption
 * Uses Node.js built-in crypto module (no external dependencies)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CryptoManager - Manages TLS certificates for encrypted P2P communication
 */
export class CryptoManager {
    constructor(options = {}) {
        this.nodeId = options.nodeId || 'unknown';
        this.nodeType = options.nodeType || 'NS';
        this.certDir = options.certDir || path.join(__dirname, '../data/certs');
        this.certPath = path.join(this.certDir, 'cert.pem');
        this.keyPath = path.join(this.certDir, 'key.pem');

        // Ensure cert directory exists
        if (!fs.existsSync(this.certDir)) {
            fs.mkdirSync(this.certDir, { recursive: true });
        }
    }

    /**
     * Generate a self-signed certificate
     * Uses openssl command (available on most systems)
     */
    async generateCertificate() {
        console.log('[Crypto] Generating self-signed certificate...');

        try {
            // Generate private key (2048-bit RSA)
            const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            // Create a simple self-signed certificate
            // Note: For production, use proper certificate generation with node-forge or openssl
            const cert = this.createSelfSignedCert(privateKey, publicKey);

            // Save to disk
            fs.writeFileSync(this.keyPath, privateKey);
            fs.writeFileSync(this.certPath, cert);

            console.log(`[Crypto] Certificate generated and saved to ${this.certDir}`);

            return {
                cert,
                privateKey,
                fingerprint: this.calculateFingerprint(cert)
            };
        } catch (err) {
            console.error('[Crypto] Error generating certificate:', err.message);
            throw err;
        }
    }

    /**
     * Create a basic self-signed certificate
     * This is a simplified version - for production use proper cert generation
     */
    createSelfSignedCert(privateKey, publicKey) {
        const now = new Date();
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

        // Create a basic PEM certificate structure
        // Note: This is a simplified version. For production, use node-forge or openssl
        const certData = {
            subject: {
                commonName: `${this.nodeType}-${this.nodeId}`,
                organizationName: 'NeuroSwarm',
                countryName: 'US'
            },
            issuer: {
                commonName: `${this.nodeType}-${this.nodeId}`,
                organizationName: 'NeuroSwarm',
                countryName: 'US'
            },
            notBefore: now,
            notAfter: oneYearFromNow,
            publicKey: publicKey
        };

        // For now, return the public key as cert (simplified)
        // In production, generate proper X.509 certificate
        return publicKey;
    }

    /**
     * Load existing certificate from disk
     */
    loadCertificate() {
        try {
            if (!fs.existsSync(this.certPath) || !fs.existsSync(this.keyPath)) {
                console.log('[Crypto] No existing certificate found');
                return null;
            }

            const cert = fs.readFileSync(this.certPath, 'utf8');
            const privateKey = fs.readFileSync(this.keyPath, 'utf8');

            console.log('[Crypto] Loaded existing certificate');

            return {
                cert,
                privateKey,
                fingerprint: this.calculateFingerprint(cert)
            };
        } catch (err) {
            console.error('[Crypto] Error loading certificate:', err.message);
            return null;
        }
    }

    /**
     * Load or generate certificate
     */
    async loadOrGenerateCertificate() {
        const existing = this.loadCertificate();
        if (existing) {
            return existing;
        }

        return await this.generateCertificate();
    }

    /**
     * Calculate SHA-256 fingerprint of certificate
     */
    calculateFingerprint(cert) {
        const hash = crypto.createHash('sha256');
        hash.update(cert);
        return 'sha256:' + hash.digest('hex');
    }

    /**
     * Verify certificate fingerprint matches expected value
     */
    verifyFingerprint(cert, expectedFingerprint) {
        const actualFingerprint = this.calculateFingerprint(cert);
        return actualFingerprint === expectedFingerprint;
    }

    /**
     * Get TLS options for HTTPS server
     */
    async getTLSOptions() {
        const { cert, privateKey } = await this.loadOrGenerateCertificate();

        return {
            key: privateKey,
            cert: cert,
            requestCert: false,  // Don't require client certificates
            rejectUnauthorized: false  // Accept self-signed certificates
        };
    }

    /**
     * Get HTTPS agent for client requests
     */
    getHTTPSAgent() {
        const https = require('https');

        return new https.Agent({
            rejectUnauthorized: false  // Accept self-signed certificates
        });
    }

    /**
     * Generate Ed25519 identity certificate for mTLS
     * Used for peer authentication in P2P network
     */
    generateIdentityCertificate() {
        console.log('[Crypto] Generating Ed25519 identity certificate...');

        try {
            // Generate Ed25519 key pair
            const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });

            // Create certificate metadata
            const certData = {
                version: 1,
                subject: {
                    commonName: `${this.nodeType}-${this.nodeId}`,
                    nodeId: this.nodeId,
                    nodeType: this.nodeType
                },
                publicKey: publicKey,
                notBefore: Date.now(),
                notAfter: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
                createdAt: Date.now()
            };

            // Sign the certificate data with private key
            const certString = JSON.stringify(certData);
            const signature = crypto.sign(null, Buffer.from(certString), {
                key: privateKey,
                format: 'pem'
            });

            const certificate = {
                ...certData,
                signature: signature.toString('base64')
            };

            // Calculate fingerprint
            const fingerprint = crypto.createHash('sha256')
                .update(publicKey)
                .digest('hex')
                .substring(0, 16);

            console.log(`[Crypto] Ed25519 identity certificate generated (fingerprint: ${fingerprint})`);

            return {
                publicKey,
                privateKey,
                certificate,
                fingerprint
            };
        } catch (err) {
            console.error('[Crypto] Error generating identity certificate:', err.message);
            throw err;
        }
    }

    /**
     * Verify peer identity certificate
     */
    verifyPeerCertificate(peerCert) {
        try {
            // Check required fields
            if (!peerCert || !peerCert.publicKey || !peerCert.signature) {
                return { valid: false, reason: 'MISSING_FIELDS' };
            }

            // Check expiration
            const now = Date.now();
            if (now < peerCert.notBefore) {
                return { valid: false, reason: 'NOT_YET_VALID' };
            }
            if (now > peerCert.notAfter) {
                return { valid: false, reason: 'EXPIRED' };
            }

            // Verify signature
            const { signature, ...certData } = peerCert;
            const certString = JSON.stringify(certData);

            const valid = crypto.verify(
                null,
                Buffer.from(certString),
                {
                    key: peerCert.publicKey,
                    format: 'pem'
                },
                Buffer.from(signature, 'base64')
            );

            if (!valid) {
                return { valid: false, reason: 'INVALID_SIGNATURE' };
            }

            return { valid: true };

        } catch (err) {
            console.error('[Crypto] Certificate verification error:', err.message);
            return { valid: false, reason: 'VERIFICATION_ERROR', error: err.message };
        }
    }

    /**
     * Get mTLS options for HTTPS server
     */
    async getMTLSOptions() {
        const tlsOptions = await this.getTLSOptions();

        return {
            ...tlsOptions,
            requestCert: true,           // Request client certificate
            rejectUnauthorized: false    // We'll verify manually
        };
    }
}

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
}

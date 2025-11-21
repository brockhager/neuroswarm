/**
 * Peer Certificate Validator - Handles mTLS certificate validation for peers
 * Separated from peer-manager for modularity and easier testing
 */

/**
 * PeerCertificateValidator - Validates peer identity certificates
 */
export class PeerCertificateValidator {
    constructor(cryptoManager, reputationManager, options = {}) {
        this.crypto = cryptoManager;
        this.reputation = reputationManager;
        this.securityLogger = options.securityLogger || null;
        this.requireMTLS = options.requireMTLS || false;
        this.mtlsMigrationMode = options.mtlsMigrationMode !== false; // Default: true

        console.log(`[CertValidator] Initialized (requireMTLS: ${this.requireMTLS}, migrationMode: ${this.mtlsMigrationMode})`);
    }

    /**
     * Validate peer certificate during addPeer
     */
    validatePeerCertificate(peerId, peerInfo) {
        // No certificate provided
        if (!peerInfo.certificate) {
            // In migration mode, allow peers without certificates
            if (this.mtlsMigrationMode) {
                console.log(`[CertValidator] Peer ${peerId} has no certificate (migration mode: allowed)`);
                return { valid: true, migrationMode: true };
            }

            // If mTLS required and not in migration mode, reject
            if (this.requireMTLS) {
                console.log(`[CertValidator] Peer ${peerId} missing certificate (mTLS required)`);
                this.reputation.recordBehavior(peerId, 'missingCertificate');
                return { valid: false, reason: 'MISSING_CERTIFICATE' };
            }

            // mTLS not required, allow
            return { valid: true };
        }

        // Certificate provided - verify it
        const verification = this.crypto.verifyPeerCertificate(peerInfo.certificate);

        if (!verification.valid) {
            console.log(`[CertValidator] Invalid certificate from ${peerId}: ${verification.reason}`);

            // Log security event
            if (this.securityLogger) {
                this.securityLogger.logSecurityEvent('INVALID_CERTIFICATE', peerId, {
                    reason: verification.reason
                });
            }

            this.reputation.recordBehavior(peerId, 'invalidCertificate');
            return { valid: false, reason: verification.reason };
        }

        // Certificate valid
        console.log(`[CertValidator] Verified certificate for ${peerId} (fingerprint: ${peerInfo.certificateFingerprint})`);
        return { valid: true, certificate: peerInfo.certificate };
    }

    /**
     * Get node identity certificate for sharing with peers
     */
    getNodeIdentity(nodeId, nodeType) {
        if (!this.crypto) {
            return null;
        }

        // Generate identity certificate if not already generated
        if (!this.identity) {
            this.identity = this.crypto.generateIdentityCertificate();
        }

        return {
            certificate: this.identity.certificate,
            certificateFingerprint: this.identity.fingerprint
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            requireMTLS: this.requireMTLS,
            mtlsMigrationMode: this.mtlsMigrationMode,
            hasIdentity: !!this.identity,
            identityFingerprint: this.identity?.fingerprint
        };
    }
}

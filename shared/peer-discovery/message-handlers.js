/**
 * Message Handlers - Handles different P2P message types
 * Separated from P2PProtocol for better modularity
 */

import { MessageType } from './p2p-protocol.js';

export class MessageHandlers {
    constructor(peerManager, messageSigner, reputation, securityLogger) {
        this.peerManager = peerManager;
        this.messageSigner = messageSigner;
        this.reputation = reputation;
        this.securityLogger = securityLogger;
    }

    /**
     * Handle incoming message with signature verification
     */
    async handleIncoming(message, senderPeerId) {
        // Verify signature for critical messages
        if (message.type === MessageType.NEW_BLOCK || message.type === MessageType.NEW_TX) {
            if (message.signature) {
                const verification = this.messageSigner.verifyMessage(message);

                if (!verification.valid) {
                    console.log(`[P2P] Invalid signature from ${senderPeerId}: ${verification.reason}`);

                    // Log security event
                    if (this.securityLogger) {
                        this.securityLogger.logSecurityEvent('INVALID_SIGNATURE', senderPeerId, {
                            messageType: message.type,
                            reason: verification.reason,
                            nonce: message.nonce
                        });
                    }

                    this.reputation.recordBehavior(senderPeerId, 'invalidMessage');
                    return { processed: false, reason: verification.reason };
                }

                console.log(`[P2P] Verified signature from ${senderPeerId}`);
                this.reputation.recordBehavior(senderPeerId, 'messageSuccess');
            } else if (this.messageSigner.enabled) {
                console.log(`[P2P] Missing signature from ${senderPeerId}`);

                // Log security event
                if (this.securityLogger) {
                    this.securityLogger.logSecurityEvent('MISSING_SIGNATURE', senderPeerId, {
                        messageType: message.type
                    });
                }

                this.reputation.recordBehavior(senderPeerId, 'invalidMessage');
                return { processed: false, reason: 'MISSING_SIGNATURE' };
            }
        }

        // Process based on message type
        let result = { processed: true };

        switch (message.type) {
            case MessageType.PEER_LIST:
                result = await this.handlePeerList(message.payload);
                break;

            case MessageType.NEW_BLOCK:
                result = { processed: true, action: 'block_received' };
                break;

            case MessageType.NEW_TX:
                result = { processed: true, action: 'tx_received' };
                break;

            case MessageType.PING:
                result = { processed: true, action: 'pong' };
                this.reputation.recordBehavior(senderPeerId, 'healthCheck');
                break;

            case MessageType.PONG:
                result = { processed: true, action: 'ping_response' };
                this.reputation.recordBehavior(senderPeerId, 'healthCheck');
                break;

            default:
                result = { processed: false, reason: 'unknown_type' };
        }

        return result;
    }

    /**
     * Handle peer list message (Peer Exchange)
     */
    async handlePeerList(payload) {
        const { peers, senderNodeType, senderPort } = payload;
        let added = 0;

        for (const peer of peers) {
            let nodeType = peer.nodeType;

            if (peer.port === senderPort && senderNodeType) {
                nodeType = senderNodeType;
            }

            const success = this.peerManager.addPeer({
                host: peer.host,
                port: peer.port,
                nodeType: nodeType,
                source: 'pex'
            });

            if (success) {
                added++;
            }
        }

        console.log(`[P2P] Peer exchange: added ${added} new peers from ${peers.length} received`);

        // Record successful PEX
        if (added > 0) {
            this.reputation.recordBehavior('pex-source', 'peerExchange');
        }

        return { processed: true, added };
    }

    /**
     * Sign outgoing message if needed
     */
    signIfNeeded(message) {
        if (this.messageSigner.enabled &&
            (message.type === MessageType.NEW_BLOCK || message.type === MessageType.NEW_TX)) {
            const signed = this.messageSigner.signMessage(message);
            console.log(`[P2P] Signed ${message.type} (nonce: ${signed.nonce.substring(0, 8)}...)`);
            return signed;
        }
        return message;
    }
}

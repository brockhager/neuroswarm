import fetch from 'node-fetch';
import { MessageSigner } from './message-signer.js';
import { MessageHandlers } from './message-handlers.js';
import { RateLimiter } from './rate-limiter.js';
import { ConsensusManager } from './consensus-manager.js';
import { ForkChoice } from './fork-choice.js';

/**
 * P2P Protocol - Handles message types and peer-to-peer communication
 * Implements gossip protocol with message deduplication
 */

// Message Types
export const MessageType = {
    PEER_LIST: 'PEER_LIST',      // Share known peers
    NEW_BLOCK: 'NEW_BLOCK',      // Broadcast new block
    NEW_TX: 'NEW_TX',            // Broadcast new transaction
    PING: 'PING',                // Health check
    PONG: 'PONG',                // Health check response
    VOTE: 'VOTE'                 // Consensus vote
};

/**
 * P2PProtocol - Manages peer-to-peer messaging and gossip protocol
 */
export class P2PProtocol {
    constructor(peerManager, options = {}) {
        this.peerManager = peerManager;
        this.seenMessages = new Map(); // messageId -> timestamp
        this.maxSeenMessages = options.maxSeenMessages || 1000;
        this.messageTimeout = options.messageTimeout || 300000; // 5 minutes

        // Message signing
        this.messageSigner = new MessageSigner({
            nodeId: peerManager.nodeId,
            enabled: options.requireSignatures !== false
        });

        // Security Logger
        this.securityLogger = options.securityLogger || null;

        // Metrics Service
        this.metricsService = options.metricsService || null;

        // Register metrics
        if (this.metricsService) {
            this.metricsService.registerCounter('p2p_messages_sent_total', 'Total P2P messages sent');
            this.metricsService.registerCounter('p2p_messages_received_total', 'Total P2P messages received');
            this.metricsService.registerCounter('p2p_bytes_sent_total', 'Total P2P bytes sent');
            this.metricsService.registerCounter('p2p_bytes_received_total', 'Total P2P bytes received');
        }

        // Message handlers with signature verification
        this.messageHandlers = new MessageHandlers(
            peerManager,
            this.messageSigner,
            peerManager.reputation,
            this.securityLogger
        );

        // Rate limiting
        this.rateLimiter = new RateLimiter({
            messagesPerSec: options.messagesPerSec || 10,
            bytesPerSec: options.bytesPerSec || 10240,
            enabled: options.enableRateLimiting !== false
        });

        // Consensus Manager
        this.consensusManager = new ConsensusManager({
            reputationManager: peerManager.reputation,
            messageSigner: this.messageSigner,
            metricsService: this.metricsService,
            securityLogger: this.securityLogger
        });

        // Fork Choice Rule
        this.forkChoice = new ForkChoice({
            consensusManager: this.consensusManager
        });

        // Periodically clean up old seen messages
        setInterval(() => this.cleanupSeenMessages(), 60000); // Every minute
    }

    /**
     * Create a message envelope
     */
    createMessage(type, payload, originNodeId) {
        const messageId = `${originNodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return {
            id: messageId,
            type,
            payload,
            originNodeId,
            timestamp: new Date().toISOString(),
            hops: 0
        };
    }

    /**
     * Check if we've seen this message before (for deduplication)
     */
    hasSeenMessage(messageId) {
        return this.seenMessages.has(messageId);
    }

    /**
     * Mark a message as seen
     */
    markMessageAsSeen(messageId) {
        this.seenMessages.set(messageId, Date.now());

        // Limit size of seen messages map
        if (this.seenMessages.size > this.maxSeenMessages) {
            const oldestKey = this.seenMessages.keys().next().value;
            this.seenMessages.delete(oldestKey);
        }
    }

    /**
     * Clean up old seen messages
     */
    cleanupSeenMessages() {
        const now = Date.now();
        const toDelete = [];

        for (const [messageId, timestamp] of this.seenMessages.entries()) {
            if (now - timestamp > this.messageTimeout) {
                toDelete.push(messageId);
            }
        }

        toDelete.forEach(id => this.seenMessages.delete(id));

        if (toDelete.length > 0) {
            console.log(`[P2P] Cleaned up ${toDelete.length} old messages from seen cache`);
        }
    }

    /**
     * Broadcast a message to all peers using gossip protocol
     */
    async broadcastMessage(message, excludePeerId = null) {
        // Sign message if needed
        const messageToSend = this.messageHandlers.signIfNeeded(message);

        // Don't broadcast if we've already seen this message
        if (this.hasSeenMessage(messageToSend.id)) {
            console.log(`[P2P] Skipping broadcast of already-seen message ${messageToSend.id}`);
            return { sent: 0, failed: 0 };
        }

        // Mark as seen
        this.markMessageAsSeen(messageToSend.id);

        const peers = this.peerManager.getAllPeers();
        let sent = 0;
        let failed = 0;

        // Increment hop count
        messageToSend.hops = (messageToSend.hops || 0) + 1;

        // Don't propagate messages that have traveled too far (prevent infinite loops)
        if (messageToSend.hops > 10) {
            console.log(`[P2P] Message ${messageToSend.id} exceeded max hops, not propagating`);
            return { sent: 0, failed: 0 };
        }

        for (const peer of peers) {
            // Don't send back to the peer we received from
            if (excludePeerId && peer.id === excludePeerId) {
                continue;
            }

            try {
                const url = `http://${peer.host}:${peer.port}/p2p/message`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(messageToSend),
                    timeout: 5000
                });

                if (response.ok) {
                    sent++;
                    this.peerManager.updatePeerHealth(peer.id, true);

                    if (this.metricsService) {
                        this.metricsService.inc('p2p_messages_sent_total', { type: messageToSend.type });
                        this.metricsService.inc('p2p_bytes_sent_total', {}, JSON.stringify(messageToSend).length);
                    }

                    console.log(`[P2P] Sent ${messageToSend.type} to ${peer.id}`);
                } else {
                    failed++;
                    this.peerManager.updatePeerHealth(peer.id, false);
                    console.log(`[P2P] Failed to send to ${peer.id}: HTTP ${response.status}`);
                }
            } catch (err) {
                failed++;
                this.peerManager.updatePeerHealth(peer.id, false);
                console.log(`[P2P] Error sending to ${peer.id}: ${err.message}`);
            }
        }

        console.log(`[P2P] Broadcast ${messageToSend.type} (${messageToSend.id}): sent=${sent}, failed=${failed}`);
        return { sent, failed };
    }

    /**
     * Send peer list to a specific peer (Peer Exchange)
     */
    async sendPeerList(targetPeer) {
        const peers = this.peerManager.getAllPeers();
        const message = this.createMessage(
            MessageType.PEER_LIST,
            {
                peers,
                senderNodeType: this.peerManager.nodeType,
                senderPort: this.peerManager.port
            },
            this.peerManager.nodeId
        );

        try {
            const url = `http://${targetPeer.host}:${targetPeer.port}/p2p/message`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
                timeout: 5000
            });

            if (response.ok) {
                console.log(`[P2P] Sent peer list to ${targetPeer.id}`);
                return true;
            } else {
                console.log(`[P2P] Failed to send peer list to ${targetPeer.id}`);
                return false;
            }
        } catch (err) {
            console.log(`[P2P] Error sending peer list to ${targetPeer.id}: ${err.message}`);
            return false;
        }
    }

    /**
     * Ping a peer to check if it's alive
     */
    async pingPeer(peer) {
        const message = this.createMessage(
            MessageType.PING,
            { timestamp: Date.now() },
            this.peerManager.nodeId
        );

        try {
            const url = `http://${peer.host}:${peer.port}/p2p/message`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
                timeout: 5000
            });

            if (response.ok) {
                this.peerManager.updatePeerHealth(peer.id, true);
                return true;
            } else {
                this.peerManager.updatePeerHealth(peer.id, false);
                return false;
            }
        } catch (err) {
            this.peerManager.updatePeerHealth(peer.id, false);
            return false;
        }
    }

    /**
     * Handle incoming message
     */
    async handleMessage(message, senderPeerId = null) {
        // Check rate limit FIRST
        const messageSize = JSON.stringify(message).length;
        const limitCheck = this.rateLimiter.checkLimit(senderPeerId, messageSize);

        if (!limitCheck.allowed) {
            console.log(`[P2P] Rate limit exceeded from ${senderPeerId}: ${limitCheck.reason}`);

            // Log security event
            if (this.securityLogger) {
                this.securityLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', senderPeerId, {
                    reason: limitCheck.reason,
                    messageSize: messageSize
                });
            }

            this.peerManager.reputation.recordBehavior(senderPeerId, 'spamDetected');
            return { processed: false, reason: limitCheck.reason };
        }

        // Check if we've already processed this message
        if (this.hasSeenMessage(message.id)) {
            console.log(`[P2P] Ignoring duplicate message ${message.id}`);
            return { processed: false, reason: 'duplicate' };
        }

        // Mark as seen
        this.markMessageAsSeen(message.id);

        console.log(`[P2P] Received ${message.type} from ${senderPeerId || 'unknown'}`);

        if (this.metricsService) {
            this.metricsService.inc('p2p_messages_received_total', { type: message.type });
            this.metricsService.inc('p2p_bytes_received_total', {}, messageSize);
        }

        // Delegate to message handlers (includes signature verification)
        const result = await this.messageHandlers.handleIncoming(message, senderPeerId);

        // Propagate message to other peers (gossip)
        if (result.processed && message.type !== MessageType.PING && message.type !== MessageType.PONG) {
            await this.broadcastMessage(message, senderPeerId);
        }

        // Handle specific message types
        if (message.type === MessageType.VOTE && result.processed) {
            this.consensusManager.handleVote(message.payload, senderPeerId);
        }

        if (message.type === MessageType.NEW_BLOCK && result.processed) {
            const newBlock = message.payload;
            // Validate block with ForkChoice
            // In a real system, we'd compare against our current head.
            // For now, we just check if it's a valid extension of the finalized chain.
            const finalizedHead = this.consensusManager.getFinalizedHead();

            if (!this.forkChoice.verifyAncestry(newBlock, finalizedHead)) {
                console.log(`[P2P] Block ${newBlock.hash} rejected: does not descend from finalized head`);
                return { processed: false, reason: 'invalid_ancestry' };
            }

            // If we had a current head, we'd check isReorgSafe here too.
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
            // Determine the correct nodeType for this peer
            let nodeType = peer.nodeType;

            // If this peer matches the sender (same port), use the sender's nodeType
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
        return { processed: true, added };
    }
}

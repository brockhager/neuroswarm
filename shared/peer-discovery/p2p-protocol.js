import fetch from 'node-fetch';
import zlib from 'zlib';
import { promisify } from 'util';
import { MessageSigner } from './message-signer.js';
import { MessageHandlers } from './message-handlers.js';
import { RateLimiter } from './rate-limiter.js';
import { ConsensusManager } from './consensus-manager.js';
import { ForkChoice } from './fork-choice.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * P2P Protocol - Handles message types and peer-to-peer communication
 * Implements gossip protocol with message deduplication
 */

// Message Types
export const MessageType = {
    PEER_LIST: 'PEER_LIST',      // Share known peers
    NEW_BLOCK: 'NEW_BLOCK',      // Broadcast new block
    NEW_BLOCK_GOSSIP: 'NEW_BLOCK_GOSSIP', // Optimized gossip message for newly-applied blocks
    NEW_TX: 'NEW_TX',            // Broadcast new transaction
    REQUEST_BLOCKS_SYNC: 'REQUEST_BLOCKS_SYNC', // Request for block headers/range
    RESPONSE_BLOCKS_SYNC: 'RESPONSE_BLOCKS_SYNC', // Response with blocks for a sync request
    PING: 'PING',                // Health check
    PONG: 'PONG',                // Health check response
    VOTE: 'VOTE',                // Consensus vote
    BATCH: 'BATCH'               // Batch of messages
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

        // Batching Configuration
        this.enableBatching = options.enableBatching !== false;
        this.batchInterval = options.batchInterval || 100; // 100ms
        this.maxBatchSize = options.maxBatchSize || 50; // 50 messages
        this.messageBuffer = [];
        this.batchTimer = null;

        // Compression Configuration
        this.enableCompression = options.enableCompression !== false;
        this.compressionThreshold = options.compressionThreshold || 1024; // 1KB

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
            this.metricsService.registerCounter('p2p_batches_sent_total', 'Total P2P batches sent');
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
     * Queue message for batching or send immediately
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

        // Check if message is suitable for batching (small messages like VOTES or TXs)
        const isBatchable = this.enableBatching &&
            (messageToSend.type === MessageType.VOTE ||
                messageToSend.type === MessageType.NEW_TX);

        if (isBatchable) {
            this.queueMessageForBatch(messageToSend, excludePeerId);
            return { sent: 0, failed: 0, queued: true };
        }

        return this.sendDirectBroadcast(messageToSend, excludePeerId);
    }

    /**
     * Queue message for batch sending
     */
    queueMessageForBatch(message, excludePeerId) {
        this.messageBuffer.push({ message, excludePeerId });

        if (this.messageBuffer.length >= this.maxBatchSize) {
            this.flushMessageBuffer();
        } else if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => this.flushMessageBuffer(), this.batchInterval);
        }
    }

    /**
     * Flush batched messages
     */
    async flushMessageBuffer() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        if (this.messageBuffer.length === 0) return;

        const messagesToFlush = [...this.messageBuffer];
        this.messageBuffer = [];

        // Group by excludePeerId to optimize broadcasting
        // Simplified: Just broadcast batch to everyone, peers will ignore duplicates
        // But we should respect excludePeerId if possible. 
        // For simplicity in this phase, we'll create one batch for all.

        const batchPayload = messagesToFlush.map(item => item.message);

        const batchMessage = this.createMessage(
            MessageType.BATCH,
            batchPayload,
            this.peerManager.nodeId
        );

        console.log(`[P2P] Flushing batch of ${batchPayload.length} messages`);

        if (this.metricsService) {
            this.metricsService.inc('p2p_batches_sent_total');
        }

        await this.sendDirectBroadcast(batchMessage, null);
    }

    /**
     * Send message directly to peers (internal implementation)
     */
    async sendDirectBroadcast(message, excludePeerId) {
        const peers = this.peerManager.getAllPeers();
        let sent = 0;
        let failed = 0;

        // Increment hop count
        message.hops = (message.hops || 0) + 1;

        // Don't propagate messages that have traveled too far
        if (message.hops > 10) {
            console.log(`[P2P] Message ${message.id} exceeded max hops, not propagating`);
            return { sent: 0, failed: 0 };
        }

        // Compression Logic
        let finalBody = JSON.stringify(message);
        let isCompressed = false;

        if (this.enableCompression && finalBody.length > this.compressionThreshold) {
            try {
                const compressedBuffer = await gzip(finalBody);
                // We need to wrap it to indicate compression
                // But standard fetch body is string or buffer. 
                // We'll send a custom header or wrap in a new envelope?
                // Let's modify the message structure itself if possible, OR
                // use a specific content-encoding header if our server supports it.
                // Our simple HTTP server might not handle content-encoding automatically.
                // Let's wrap in a "CompressedMessage" envelope for application-level handling.

                const compressedEnvelope = {
                    compressed: true,
                    data: compressedBuffer.toString('base64')
                };
                finalBody = JSON.stringify(compressedEnvelope);
                isCompressed = true;
            } catch (err) {
                console.error('[P2P] Compression failed, sending uncompressed', err);
            }
        }

        for (const peer of peers) {
            if (excludePeerId && peer.id === excludePeerId) continue;

            try {
                const url = `http://${peer.host}:${peer.port}/p2p/message`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: finalBody,
                    timeout: 5000
                });

                if (response.ok) {
                    sent++;
                    this.peerManager.updatePeerHealth(peer.id, true);

                    if (this.metricsService) {
                        this.metricsService.inc('p2p_messages_sent_total', { type: message.type });
                        this.metricsService.inc('p2p_bytes_sent_total', {}, finalBody.length);
                    }
                } else {
                    failed++;
                    this.peerManager.updatePeerHealth(peer.id, false);
                }
            } catch (err) {
                failed++;
                this.peerManager.updatePeerHealth(peer.id, false);
            }
        }

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
    async handleMessage(rawMessage, senderPeerId = null) {
        // Decompression Logic
        let message = rawMessage;
        if (rawMessage.compressed && rawMessage.data) {
            try {
                const buffer = Buffer.from(rawMessage.data, 'base64');
                const decompressed = await gunzip(buffer);
                message = JSON.parse(decompressed.toString());
            } catch (err) {
                console.error('[P2P] Decompression failed', err);
                return { processed: false, reason: 'decompression_failed' };
            }
        }

        // Handle Batch Messages
        if (message.type === MessageType.BATCH) {
            const batchMessages = message.payload;
            console.log(`[P2P] Received BATCH of ${batchMessages.length} messages`);

            const results = [];
            for (const subMsg of batchMessages) {
                // Recursively handle each message
                // Note: We don't re-broadcast the batch itself, but we might broadcast individual messages
                // if they are new. 
                // However, to prevent storm, we should probably NOT broadcast if they came in a batch
                // unless we are a gateway. For now, let's process them.
                const result = await this.handleSingleMessage(subMsg, senderPeerId);
                results.push(result);
            }
            return { processed: true, batchResults: results };
        }

        return this.handleSingleMessage(message, senderPeerId);
    }

    /**
     * Handle a single (non-batch) message
     */
    async handleSingleMessage(message, senderPeerId) {
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
            // console.log(`[P2P] Ignoring duplicate message ${message.id}`);
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
            const finalizedHead = this.consensusManager.getFinalizedHead();

            if (!this.forkChoice.verifyAncestry(newBlock, finalizedHead)) {
                console.log(`[P2P] Block ${newBlock.hash} rejected: does not descend from finalized head`);
                return { processed: false, reason: 'invalid_ancestry' };
            }
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


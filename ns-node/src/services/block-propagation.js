import { logNs } from '../utils/logger.js';

/**
 * BlockPropagationService - Handles block announcement and synchronization across NS-Nodes
 * 
 * Responsibilities:
 * - Announce newly accepted blocks to all connected NS-Node peers
 * - Handle incoming block announcements from peers
 * - Request full block data when needed
 * - Prevent announcement loops with seen-blocks tracking
 */
export class BlockPropagationService {
    constructor(p2pProtocol, peerManager) {
        this.p2pProtocol = p2pProtocol;
        this.peerManager = peerManager;

        // Track blocks we've already seen/announced to prevent loops
        this.seenBlocks = new Set();

        // Limit seen blocks cache to prevent memory growth
        this.maxSeenBlocks = 10000;

        logNs('[BlockPropagation] Service initialized');
    }

    /**
     * Announce a new block to all connected NS-Node peers
     * @param {string} blockHash - Hash of the block
     * @param {object} header - Block header
     * @param {number} height - Block height
     */
    async announceBlock(blockHash, header, height) {
        // Don't announce if we've already seen this block
        if (this.seenBlocks.has(blockHash)) {
            return;
        }

        // Mark as seen
        this._addToSeen(blockHash);

        // Get all connected NS-Node peers
        const nsPeers = this.peerManager?.getAllPeers?.('NS') || [];

        if (nsPeers.length === 0) {
            logNs('[BlockPropagation] No NS-Node peers to announce to');
            return;
        }

        logNs(`[BlockPropagation] Announcing block ${blockHash.slice(0, 12)}... to ${nsPeers.length} peers`);

        const announcement = {
            type: 'BLOCK_ANNOUNCEMENT',
            blockHash,
            header,
            height,
            timestamp: Date.now()
        };

        // Broadcast to all NS peers
        for (const peer of nsPeers) {
            try {
                await this._sendToPeer(peer, announcement);
            } catch (err) {
                logNs(`[BlockPropagation] Failed to announce to peer ${peer.id}: ${err.message}`);
            }
        }
    }

    /**
     * Handle incoming block announcement from a peer
     * @param {object} announcement - Block announcement message
     * @param {string} fromPeerId - Peer ID that sent the announcement
     * @param {function} onBlockNeeded - Callback when we need the full block
     */
    async handleBlockAnnouncement(announcement, fromPeerId, onBlockNeeded) {
        const { blockHash, header, height } = announcement;

        logNs(`[BlockPropagation] Received block announcement ${blockHash?.slice(0, 12)}... from ${fromPeerId}`);

        // Validate announcement
        if (!blockHash || !header) {
            logNs('[BlockPropagation] Invalid announcement: missing blockHash or header');
            return;
        }

        // Check if we've already seen this block
        if (this.seenBlocks.has(blockHash)) {
            logNs(`[BlockPropagation] Already seen block ${blockHash.slice(0, 12)}...`);
            return;
        }

        // Mark as seen to prevent requesting again
        this._addToSeen(blockHash);

        // Notify caller that we need this block
        if (onBlockNeeded) {
            try {
                await onBlockNeeded({ blockHash, header, height, fromPeerId });
            } catch (err) {
                logNs(`[BlockPropagation] Error processing needed block: ${err.message}`);
            }
        }
    }

    /**
     * Request full block data from a peer
     * @param {string} blockHash - Hash of block to request
     * @param {string} peerId - Peer to request from
     * @returns {Promise<object>} Full block data
     */
    async requestBlock(blockHash, peerId) {
        logNs(`[BlockPropagation] Requesting block ${blockHash.slice(0, 12)}... from ${peerId}`);

        const request = {
            type: 'BLOCK_REQUEST',
            blockHash,
            timestamp: Date.now()
        };

        try {
            const response = await this._sendToPeer({ id: peerId }, request);

            if (response && response.ok && response.block) {
                logNs(`[BlockPropagation] Received block ${blockHash.slice(0, 12)}... from ${peerId}`);
                return response.block;
            }

            logNs(`[BlockPropagation] Failed to get block from ${peerId}: ${response?.error || 'no response'}`);
            return null;
        } catch (err) {
            logNs(`[BlockPropagation] Error requesting block: ${err.message}`);
            return null;
        }
    }

    /**
     * Handle incoming block request from a peer
     * @param {object} request - Block request message
     * @param {function} getBlock - Callback to fetch block from local state
     * @returns {object} Response with block data or error
     */
    async handleBlockRequest(request, getBlock) {
        const { blockHash } = request;

        logNs(`[BlockPropagation] Received block request for ${blockHash?.slice(0, 12)}...`);

        if (!blockHash) {
            return { ok: false, error: 'missing_block_hash' };
        }

        try {
            const block = await getBlock(blockHash);

            if (!block) {
                return { ok: false, error: 'block_not_found' };
            }

            return {
                ok: true,
                block: {
                    blockHash: block.blockHash,
                    header: block.header,
                    txs: block.txs,
                    signature: block.header?.signature
                }
            };
        } catch (err) {
            logNs(`[BlockPropagation] Error handling block request: ${err.message}`);
            return { ok: false, error: 'internal_error' };
        }
    }

    /**
     * Track a block as seen to prevent loops
     */
    _addToSeen(blockHash) {
        this.seenBlocks.add(blockHash);

        // Limit cache size (FIFO)
        if (this.seenBlocks.size > this.maxSeenBlocks) {
            const firstHash = this.seenBlocks.values().next().value;
            this.seenBlocks.delete(firstHash);
        }
    }

    /**
     * Send message to a peer (placeholder - will use p2pProtocol when available)
     */
    async _sendToPeer(peer, message) {
        // If p2pProtocol has a send method, use it
        if (this.p2pProtocol && typeof this.p2pProtocol.sendToNode === 'function') {
            return await this.p2pProtocol.sendToNode(peer.id, message);
        }

        // Otherwise, this is a placeholder for when P2P is fully wired
        logNs(`[BlockPropagation] (Placeholder) Would send to ${peer.id}:`, message.type);
        return { ok: true };
    }

    /**
     * Get statistics about block propagation
     */
    getStats() {
        return {
            seenBlocksCount: this.seenBlocks.size,
            connectedPeers: this.peerManager?.getAllPeers?.('NS')?.length || 0
        };
    }
}

export default BlockPropagationService;

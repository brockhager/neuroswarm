import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ReputationManager } from './reputation.js';
import { NATTraversal } from './nat-traversal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PeerManager - Manages peer discovery, storage, and lifecycle
 * Supports universal peer discovery across all node types (NS, Gateway, VP)
 */
export class PeerManager {
    constructor(options = {}) {
        this.nodeId = options.nodeId || this.generateNodeId();
        this.nodeType = options.nodeType || 'NS'; // NS, Gateway, VP
        this.port = options.port || 3009;
        this.maxPeers = options.maxPeers || 8;
        this.dataDir = options.dataDir || path.join(__dirname, '../data');
        this.peersFile = path.join(this.dataDir, 'peers.json');

        // In-memory peer storage: Map<peerId, peerInfo>
        this.peers = new Map();

        // Bootstrap peers from environment variable
        this.bootstrapPeers = this.parseBootstrapPeers(options.bootstrapPeers);

        // Peer health tracking
        this.peerHealth = new Map(); // peerId -> { lastSeen, failCount }

        // Reputation system
        this.reputation = new ReputationManager({
            banThreshold: options.reputationBanThreshold || 20,
            decayRate: options.reputationDecayRate || 0.1
        });

        // NAT Traversal
        this.natTraversal = new NATTraversal({
            enabled: options.natTraversalEnabled !== false,
            localPort: this.port,
            stunServers: options.stunServers,
            refreshInterval: options.natRefreshInterval
        });

        this.loadPeersFromDisk();

        // Start NAT traversal if enabled
        if (this.natTraversal.enabled) {
            this.natTraversal.startPeriodicRefresh();
            console.log('[PeerManager] NAT traversal enabled');
        }
    }

    /**
     * Generate a unique node ID
     */
    generateNodeId() {
        return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Parse bootstrap peers from comma-separated string
     * Format: "localhost:3010:Gateway,localhost:3011:NS" or "192.168.1.10:3009"
     * Type is optional, defaults to 'NS'
     */
    parseBootstrapPeers(bootstrapPeers) {
        if (!bootstrapPeers) return [];

        return bootstrapPeers
            .split(',')
            .map(peer => peer.trim())
            .filter(peer => peer.length > 0)
            .map(peer => {
                const parts = peer.split(':');
                const host = parts[0] || 'localhost';
                const port = parseInt(parts[1]) || 3009;
                const nodeType = parts[2] || 'NS'; // Optional node type

                return {
                    id: `${host}:${port}`,
                    host,
                    port,
                    nodeType,
                    addedAt: new Date().toISOString(),
                    source: 'bootstrap'
                };
            });
    }

    /**
     * Load peers from disk
     */
    loadPeersFromDisk() {
        try {
            if (fs.existsSync(this.peersFile)) {
                const data = JSON.parse(fs.readFileSync(this.peersFile, 'utf8'));
                data.forEach(peer => {
                    this.peers.set(peer.id, peer);
                });
                console.log(`[PeerManager] Loaded ${this.peers.size} peers from disk`);
            }
        } catch (err) {
            console.error('[PeerManager] Error loading peers from disk:', err.message);
        }

        // Add bootstrap peers
        this.bootstrapPeers.forEach(peer => {
            if (!this.peers.has(peer.id)) {
                this.peers.set(peer.id, peer);
            }
        });
    }

    /**
     * Save peers to disk
     */
    savePeersToDisk() {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }

            const peersArray = Array.from(this.peers.values());
            fs.writeFileSync(this.peersFile, JSON.stringify(peersArray, null, 2));
            console.log(`[PeerManager] Saved ${peersArray.length} peers to disk`);
        } catch (err) {
            console.error('[PeerManager] Error saving peers to disk:', err.message);
        }
    }

    /**
     * Add a new peer
     */
    addPeer(peerInfo) {
        const { host, port, nodeType = 'NS', source = 'manual', publicHost, publicPort, natType } = peerInfo;
        const peerId = `${host}:${port}`;

        // Don't add ourselves
        if (port === this.port && (host === 'localhost' || host === '127.0.0.1')) {
            return false;
        }

        // Check reputation - don't add banned peers
        if (this.reputation.shouldBan(peerId)) {
            console.log(`[PeerManager] Rejected peer ${peerId} - reputation too low (${this.reputation.getScore(peerId)})`);
            return false;
        }

        // Check if we're at max capacity
        if (this.peers.size >= this.maxPeers && !this.peers.has(peerId)) {
            console.log(`[PeerManager] At max peer capacity (${this.maxPeers}), not adding ${peerId}`);
            return false;
        }

        if (!this.peers.has(peerId)) {
            this.peers.set(peerId, {
                id: peerId,
                host,
                port,
                nodeType,
                publicHost: publicHost || null,
                publicPort: publicPort || null,
                natType: natType || null,
                addedAt: new Date().toISOString(),
                source
            });

            this.peerHealth.set(peerId, {
                lastSeen: new Date().toISOString(),
                failCount: 0
            });

            // Initialize reputation for new peer
            this.reputation.initializePeer(peerId);

            console.log(`[PeerManager] Added peer: ${peerId} (type: ${nodeType}, source: ${source}, reputation: ${this.reputation.getScore(peerId)})`);
            this.savePeersToDisk();
            return true;
        }

        return false;
    }

    /**
     * Remove a peer
     */
    removePeer(peerId) {
        if (this.peers.has(peerId)) {
            this.peers.delete(peerId);
            this.peerHealth.delete(peerId);
            console.log(`[PeerManager] Removed peer: ${peerId}`);
            this.savePeersToDisk();
            return true;
        }
        return false;
    }

    /**
     * Get all peers, optionally filtered by node type
     */
    getAllPeers(filterType = null) {
        const allPeers = Array.from(this.peers.values());
        if (filterType) {
            return allPeers.filter(peer => peer.nodeType === filterType);
        }
        return allPeers;
    }

    /**
     * Get a specific peer
     */
    getPeer(peerId) {
        return this.peers.get(peerId);
    }

    /**
     * Update peer health (called after successful communication)
     */
    updatePeerHealth(peerId, success = true) {
        const health = this.peerHealth.get(peerId);
        if (!health) return;

        if (success) {
            health.lastSeen = new Date().toISOString();
            health.failCount = 0;
        } else {
            health.failCount += 1;

            // Remove peer after 5 consecutive failures
            if (health.failCount >= 5) {
                console.log(`[PeerManager] Removing unhealthy peer: ${peerId} (${health.failCount} failures)`);
                this.removePeer(peerId);
            }
        }
    }

    /**
     * Prune inactive peers (called periodically)
     */
    pruneInactivePeers(maxAgeMs = 3600000) { // 1 hour default
        const now = Date.now();
        const toRemove = [];

        for (const [peerId, health] of this.peerHealth.entries()) {
            const lastSeenTime = new Date(health.lastSeen).getTime();
            if (now - lastSeenTime > maxAgeMs) {
                toRemove.push(peerId);
            }
        }

        toRemove.forEach(peerId => {
            console.log(`[PeerManager] Pruning inactive peer: ${peerId}`);
            this.removePeer(peerId);
        });

        return toRemove.length;
    }

    /**
     * Get peer count, optionally filtered by type
     */
    getPeerCount(filterType = null) {
        if (filterType) {
            return this.getAllPeers(filterType).length;
            if (!bootstrapPeers) return [];

            return bootstrapPeers
                .split(',')
                .map(peer => peer.trim())
                .filter(peer => peer.length > 0)
                .map(peer => {
                    const parts = peer.split(':');
                    const host = parts[0] || 'localhost';
                    const port = parseInt(parts[1]) || 3009;
                    const nodeType = parts[2] || 'NS'; // Optional node type

                    return {
                        id: `${host}:${port}`,
                        host,
                        port,
                        nodeType,
                        addedAt: new Date().toISOString(),
                        source: 'bootstrap'
                    };
                });
        }

        /**
         * Load peers from disk
         */
        loadPeersFromDisk() {
            try {
                if (fs.existsSync(this.peersFile)) {
                    const data = JSON.parse(fs.readFileSync(this.peersFile, 'utf8'));
                    data.forEach(peer => {
                        this.peers.set(peer.id, peer);
                    });
                    console.log(`[PeerManager] Loaded ${this.peers.size} peers from disk`);
                }
            } catch (err) {
                console.error('[PeerManager] Error loading peers from disk:', err.message);
            }

            // Add bootstrap peers
            this.bootstrapPeers.forEach(peer => {
                if (!this.peers.has(peer.id)) {
                    this.peers.set(peer.id, peer);
                }
            });
        }

        /**
         * Save peers to disk
         */
        savePeersToDisk() {
            try {
                if (!fs.existsSync(this.dataDir)) {
                    fs.mkdirSync(this.dataDir, { recursive: true });
                }

                const peersArray = Array.from(this.peers.values());
                fs.writeFileSync(this.peersFile, JSON.stringify(peersArray, null, 2));
                console.log(`[PeerManager] Saved ${peersArray.length} peers to disk`);
            } catch (err) {
                console.error('[PeerManager] Error saving peers to disk:', err.message);
            }
        }

        /**
         * Add a new peer
         */
        addPeer(peerInfo) {
            const { host, port, nodeType = 'NS', source = 'manual' } = peerInfo;
            const peerId = `${host}:${port}`;

            // Don't add ourselves
            if (port === this.port && (host === 'localhost' || host === '127.0.0.1')) {
                return false;
            }

            // Check reputation - don't add banned peers
            if (this.reputation.shouldBan(peerId)) {
                console.log(`[PeerManager] Rejected peer ${peerId} - reputation too low (${this.reputation.getScore(peerId)})`);
                return false;
            }

            // Check if we're at max capacity
            if (this.peers.size >= this.maxPeers && !this.peers.has(peerId)) {
                console.log(`[PeerManager] At max peer capacity (${this.maxPeers}), not adding ${peerId}`);
                return false;
            }

            if (!this.peers.has(peerId)) {
                this.peers.set(peerId, {
                    id: peerId,
                    host,
                    port,
                    nodeType,
                    addedAt: new Date().toISOString(),
                    source
                });

                this.peerHealth.set(peerId, {
                    lastSeen: new Date().toISOString(),
                    failCount: 0
                });

                // Initialize reputation for new peer
                this.reputation.initializePeer(peerId);

                console.log(`[PeerManager] Added peer: ${peerId} (type: ${nodeType}, source: ${source}, reputation: ${this.reputation.getScore(peerId)})`);
                this.savePeersToDisk();
                return true;
            }

            return false;
        }

        /**
         * Remove a peer
         */
        removePeer(peerId) {
            if (this.peers.has(peerId)) {
                this.peers.delete(peerId);
                this.peerHealth.delete(peerId);
                console.log(`[PeerManager] Removed peer: ${peerId}`);
                this.savePeersToDisk();
                return true;
                health.lastSeen = new Date().toISOString();
                health.failCount = 0;
            } else {
                health.failCount += 1;

                // Remove peer after 5 consecutive failures
                if (health.failCount >= 5) {
                    console.log(`[PeerManager] Removing unhealthy peer: ${peerId} (${health.failCount} failures)`);
                    this.removePeer(peerId);
                }
            }
        }

        /**
         * Prune inactive peers (called periodically)
         */
        pruneInactivePeers(maxAgeMs = 3600000) { // 1 hour default
            const now = Date.now();
            const toRemove = [];

            for (const [peerId, health] of this.peerHealth.entries()) {
                const lastSeenTime = new Date(health.lastSeen).getTime();
                if (now - lastSeenTime > maxAgeMs) {
                    toRemove.push(peerId);
                }
            }

            toRemove.forEach(peerId => {
                console.log(`[PeerManager] Pruning inactive peer: ${peerId}`);
                this.removePeer(peerId);
            });

            return toRemove.length;
        }

        /**
         * Get peer count, optionally filtered by type
         */
        getPeerCount(filterType = null) {
            if (filterType) {
                return this.getAllPeers(filterType).length;
            }
            return this.peers.size;
        }

        /**
         * Get this node's information
         */
        getNodeInfo() {
            const publicAddress = this.natTraversal.getPublicAddress();

            return {
                nodeId: this.nodeId,
                nodeType: this.nodeType,
                port: this.port,
                publicIP: publicAddress.ip,
                publicPort: publicAddress.port,
                natType: publicAddress.natType,
                maxPeers: this.maxPeers,
                peerCount: this.peers.size
            };
        }
    }

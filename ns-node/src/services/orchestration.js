import fetch from 'node-fetch';
import { logNs } from '../utils/logger.js';

/**
 * OrchestrationService
 * Manages cross-node coordination for the NeuroSwarm ecosystem.
 * Handles task dispatching, peer selection, and workflow orchestration.
 */
export default class OrchestrationService {
    constructor(peerManager, metricsService) {
        this.peerManager = peerManager;
        this.metricsService = metricsService;
        
        if (this.metricsService) {
            this.metricsService.registerCounter('orchestration_tasks_total', 'Total tasks dispatched');
            this.metricsService.registerCounter('orchestration_tasks_failed', 'Total tasks failed');
        }
    }

    /**
     * Get available nodes by type
     * @param {string} type - 'NS', 'VP', 'Gateway'
     */
    getNodesByType(type) {
        return this.peerManager.getAllPeers(type);
    }

    /**
     * Dispatch a task to a specific node type
     * @param {string} targetType - Node type to target (e.g., 'VP' for validation)
     * @param {string} endpoint - API endpoint to call (e.g., '/api/validate')
     * @param {object} payload - Data to send
     * @param {object} options - { strategy: 'random' | 'round-robin' | 'broadcast' }
     */
    async dispatchTask(targetType, endpoint, payload, options = {}) {
        const peers = this.getNodesByType(targetType);
        if (peers.length === 0) {
            throw new Error(`No available peers of type ${targetType}`);
        }

        const strategy = options.strategy || 'random';
        
        if (this.metricsService) {
            this.metricsService.increment('orchestration_tasks_total');
        }

        try {
            if (strategy === 'broadcast') {
                return await this._broadcast(peers, endpoint, payload);
            } else {
                // Select single peer
                const peer = this._selectPeer(peers, strategy);
                return await this._sendToPeer(peer, endpoint, payload);
            }
        } catch (error) {
            if (this.metricsService) {
                this.metricsService.increment('orchestration_tasks_failed');
            }
            logNs('ERROR', `Orchestration failed for ${targetType}/${endpoint}`, error.message);
            throw error;
        }
    }

    /**
     * Select a peer based on strategy
     */
    _selectPeer(peers, strategy) {
        if (strategy === 'random') {
            return peers[Math.floor(Math.random() * peers.length)];
        }
        // Default to random for now
        return peers[Math.floor(Math.random() * peers.length)];
    }

    /**
     * Send request to a single peer
     */
    async _sendToPeer(peer, endpoint, payload) {
        const url = `http://${peer.host}:${peer.port}${endpoint}`;
        logNs('INFO', `Dispatching task to ${peer.id} (${url})`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            timeout: 5000
        });

        if (!response.ok) {
            throw new Error(`Peer ${peer.id} returned ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Broadcast request to all peers
     */
    async _broadcast(peers, endpoint, payload) {
        logNs('INFO', `Broadcasting task to ${peers.length} peers`);
        const promises = peers.map(peer => 
            this._sendToPeer(peer, endpoint, payload)
                .then(res => ({ peer: peer.id, status: 'fulfilled', value: res }))
                .catch(err => ({ peer: peer.id, status: 'rejected', reason: err.message }))
        );
        
        return await Promise.all(promises);
    }

    /**
     * Get orchestration status
     */
    getStatus() {
        return {
            peers: {
                NS: this.getNodesByType('NS').length,
                VP: this.getNodesByType('VP').length,
                Gateway: this.getNodesByType('Gateway').length
            }
        };
    }
}

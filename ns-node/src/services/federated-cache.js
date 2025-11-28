import { logNs } from '../utils/logger.js';
import * as knowledgeStore from './knowledge-store.js';

export default class FederatedCacheService {
    constructor(orchestrationService) {
        this.orchestrationService = orchestrationService;
    }

    /**
     * Query for knowledge, checking local cache first, then federated peers.
     */
    async semanticQuery(question, threshold = 0.8) {
        // 1. Check Local Cache
        try {
            const localResult = await knowledgeStore.semanticQueryKnowledge(question, threshold);
            if (localResult) {
                logNs('INFO', `FederatedCache: Local hit for "${question}"`);
                return { ...localResult, source: 'local' };
            }
        } catch (e) {
            logNs('WARN', `FederatedCache: Local query failed: ${e.message}`);
        }

        // 2. Check Federated Peers
        if (this.orchestrationService) {
            try {
                logNs('INFO', `FederatedCache: Querying peers for "${question}"`);
                // Broadcast to all NS nodes (contributors)
                // We use a custom 'broadcast' strategy or just get all peers
                const peers = this.orchestrationService.getNodesByType('NS');

                if (peers.length > 0) {
                    // We'll ask up to 3 random peers to avoid flooding
                    const targetPeers = peers.sort(() => 0.5 - Math.random()).slice(0, 3);

                    const promises = targetPeers.map(peer =>
                        this._queryPeer(peer, question, threshold)
                    );

                    // Return first successful result
                    const result = await Promise.any(promises);
                    if (result) {
                        logNs('INFO', `FederatedCache: Remote hit from ${result.peerId}`);

                        // Optionally cache locally?
                        // For now, just return it.
                        return { ...result, source: 'federated', peerId: result.peerId };
                    }
                }
            } catch (e) {
                // Promise.any throws AggregateError if all fail
                logNs('INFO', `FederatedCache: No remote hits found`);
            }
        }

        return null;
    }

    async _queryPeer(peer, question, threshold) {
        const url = `http://${peer.host}:${peer.port}/api/cache/query`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, threshold }),
            timeout: 2000 // Short timeout for cache
        });

        if (!response.ok) throw new Error('Request failed');

        const data = await response.json();
        if (!data.found) throw new Error('Not found');

        return { ...data.result, peerId: peer.id };
    }
}

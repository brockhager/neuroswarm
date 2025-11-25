/**
 * IPFS Knowledge Adapter
 * 
 * Retrieves previously stored answers from the IPFS knowledge base.
 * This adapter runs as Layer 2 in the knowledge system:
 * 1. Deterministic adapters (math, scores)
 * 2. IPFS Knowledge (this adapter) <- YOU ARE HERE
 * 3. Web search / LLM
 * 4. Store to IPFS
 */

import { queryKnowledge } from '../../ns-node/src/services/knowledge-store.js';

/**
 * Query the IPFS knowledge base for cached answers
 * @param {Object} params - Query parameters
 * @param {string} params.query - The question to search for
 * @returns {Promise<Object>} Result object with cached answer or error
 */
export async function query(params) {
    const { query: question } = params;

    if (!question) {
        return { error: 'Query is required' };
    }

    try {
        // Query IPFS knowledge base
        const knowledge = await queryKnowledge(question);

        if (!knowledge) {
            // Not found in cache - this is normal, not an error
            return {
                value: null,
                cacheHit: false
            };
        }

        // Found in cache!
        return {
            value: {
                answer: {
                    text: knowledge.answer,
                    source: `IPFS Cache (originally from ${knowledge.source})`,
                    cached: true,
                    cacheTimestamp: knowledge.timestamp,
                    expiresAt: knowledge.expiresAt
                },
                confidence: knowledge.confidence,
                verifiedBy: knowledge.verifiedBy,
                upvotes: knowledge.upvotes,
                downvotes: knowledge.downvotes
            },
            cacheHit: true
        };

    } catch (error) {
        // IPFS errors should not block the query - just log and continue
        console.error('IPFS knowledge query failed:', error.message);
        return {
            value: null,
            cacheHit: false,
            error: error.message
        };
    }
}

/**
 * Adapter metadata
 */
export const metadata = {
    name: 'ipfs-knowledge',
    description: 'Retrieves cached answers from IPFS knowledge base',
    version: '1.0.0',
    author: 'NeuroSwarm',
    capabilities: ['cache', 'retrieval'],
    priority: 2 // Run after deterministic adapters (1) but before web search (3)
};

/**
 * Hybrid Query Routes
 * RAG (Retrieval-Augmented Generation) endpoints
 */

import express from 'express';
import HybridQueryService from '../services/hybrid-query.js';

const router = express.Router();
let hybridQueryService = null;

// Initialize service on first use
async function getService() {
    if (!hybridQueryService) {
        const nsLlmClient = await import('../../../shared/ns-llm-client.js');
        hybridQueryService = new HybridQueryService(nsLlmClient.default || nsLlmClient);
    }
    return hybridQueryService;
}

// Execute hybrid query (RAG)
router.post('/query', async (req, res) => {
    try {
        const { query, topK, maxTokens } = req.body || {};

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: "missing 'query' string" });
        }

        const service = await getService();
        const result = await service.query(query, { topK, maxTokens });
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'hybrid-query-failed', details: err.message });
    }
});

// Add document to index
router.post('/add-document', async (req, res) => {
    try {
        const { id, text, metadata } = req.body || {};

        if (!id || !text) {
            return res.status(400).json({ error: "missing 'id' or 'text'" });
        }

        const service = await getService();
        const result = await service.addDocument(id, text, metadata);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'add-document-failed', details: err.message });
    }
});

// Get index statistics
router.get('/stats', async (req, res) => {
    try {
        if (!hybridQueryService) {
            return res.json({ documentCount: 0, dimension: null, message: 'Service not initialized' });
        }

        const stats = hybridQueryService.getStats();
        return res.json(stats);
    } catch (err) {
        return res.status(500).json({ error: 'stats-failed', details: err.message });
    }
});

export default router;

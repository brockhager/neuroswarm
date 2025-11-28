/**
 * Cache Routes - Visualization and Federated Query
 */

import express from 'express';

export default function createCacheRouter(cacheVisualizationService) {
    const router = express.Router();

    // Federated cache query endpoint (for peers)
    router.post('/query', async (req, res) => {
        try {
            const { question, threshold } = req.body;
            if (!question) return res.status(400).json({ error: 'Missing question' });

            // Use local knowledge store directly to avoid loops
            const { semanticQueryKnowledge } = await import('../services/knowledge-store.js');
            const result = await semanticQueryKnowledge(question, threshold || 0.8);

            if (result) {
                res.json({ found: true, result });
            } else {
                res.json({ found: false });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/visualization', (req, res) => {
        try {
            const data = cacheVisualizationService.getVisualizationData();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch visualization data', details: error.message });
        }
    });

    router.get('/stats', (req, res) => {
        try {
            const stats = cacheVisualizationService.getCacheStats();
            res.json(stats);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch cache stats', details: error.message });
        }
    });

    router.get('/clusters', (req, res) => {
        try {
            const threshold = parseFloat(req.query.threshold) || 0.7;
            const clusters = cacheVisualizationService.getSimilarityClusters(threshold);
            res.json({ clusters, threshold });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch similarity clusters', details: error.message });
        }
    });

    router.post('/refresh', (req, res) => {
        try {
            const data = cacheVisualizationService.refresh();
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ error: 'Failed to refresh cache visualization', details: error.message });
        }
    });

    return router;
}

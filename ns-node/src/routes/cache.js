/**
 * Cache Visualization Routes
 */

import express from 'express';

const router = express.Router();

// Service will be injected
let cacheVisualizationService = null;

export function setCacheVisualizationService(service) {
    cacheVisualizationService = service;
}

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

export default router;

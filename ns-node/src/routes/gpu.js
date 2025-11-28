import express from 'express';

export default function createGpuRouter(gpuResourceManager) {
    const router = express.Router();

    // Get local GPU status
    router.get('/status', async (req, res) => {
        try {
            const status = await gpuResourceManager.getStatus();
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get GPU status', details: error.message });
        }
    });

    // Get GPU-enabled peers
    router.get('/peers', async (req, res) => {
        try {
            // This will be implemented when we integrate with PeerManager
            const peers = []; // TODO: Query PeerManager for GPU-enabled peers
            res.json({ peers, count: peers.length });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get GPU peers', details: error.message });
        }
    });

    // Check if this node can handle an inference request
    router.post('/can-handle', async (req, res) => {
        try {
            const { requiredVram } = req.body;
            const result = gpuResourceManager.canHandleInference(requiredVram || 0);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: 'Failed to check capability', details: error.message });
        }
    });

    // Get utilization trend
    router.get('/utilization', async (req, res) => {
        try {
            const minutes = parseInt(req.query.minutes) || 5;
            const trend = gpuResourceManager.getUtilizationTrend(minutes);
            res.json(trend);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get utilization trend', details: error.message });
        }
    });

    // Get network metadata (for peer registration)
    router.get('/metadata', (req, res) => {
        try {
            const metadata = gpuResourceManager.getNetworkMetadata();
            res.json(metadata);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get metadata', details: error.message });
        }
    });

    return router;
}

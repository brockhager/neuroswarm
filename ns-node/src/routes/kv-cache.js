import express from 'express';

export default function createKvCacheRouter(kvCacheService) {
    const router = express.Router();

    // Get cache statistics
    router.get('/stats', (req, res) => {
        try {
            const stats = kvCacheService.getStats();
            res.json(stats);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get stats', details: error.message });
        }
    });

    // Clear all caches
    router.post('/clear', async (req, res) => {
        try {
            await kvCacheService.clear();
            res.json({ success: true, message: 'Cache cleared' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to clear cache', details: error.message });
        }
    });

    // Check if key exists
    router.get('/:key/exists', async (req, res) => {
        try {
            const exists = await kvCacheService.has(req.params.key);
            res.json({ exists });
        } catch (error) {
            res.status(500).json({ error: 'Failed to check key', details: error.message });
        }
    });

    // Delete specific cache entry
    router.delete('/:key', async (req, res) => {
        try {
            const deleted = await kvCacheService.delete(req.params.key);
            res.json({ success: deleted });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete key', details: error.message });
        }
    });

    // Prune expired entries
    router.post('/prune', async (req, res) => {
        try {
            await kvCacheService.prune();
            res.json({ success: true, message: 'Cache pruned' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to prune cache', details: error.message });
        }
    });

    return router;
}

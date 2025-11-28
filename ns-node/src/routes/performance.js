import express from 'express';

export default function createPerformanceRouter(performanceProfiler) {
    const router = express.Router();

    // Get current metrics
    router.get('/metrics', (req, res) => {
        try {
            const timeWindow = parseInt(req.query.window) || 60000; // Default 60s
            const metrics = performanceProfiler.getMetrics(timeWindow);
            res.json(metrics);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get metrics', details: error.message });
        }
    });

    // Get full performance report
    router.get('/report', (req, res) => {
        try {
            const report = performanceProfiler.generateReport();
            res.json(report);
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate report', details: error.message });
        }
    });

    // Analyze bottlenecks
    router.get('/bottlenecks', (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const analysis = performanceProfiler.analyzeBottlenecks(limit);
            res.json(analysis);
        } catch (error) {
            res.status(500).json({ error: 'Failed to analyze bottlenecks', details: error.message });
        }
    });

    // Clear history
    router.post('/clear', (req, res) => {
        try {
            performanceProfiler.clear();
            res.json({ success: true, message: 'Performance history cleared' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to clear history', details: error.message });
        }
    });

    return router;
}

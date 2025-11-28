import express from 'express';

export default function createOrchestrationRouter(orchestrationService) {
    const router = express.Router();

    router.get('/status', (req, res) => {
        res.json(orchestrationService.getStatus());
    });

    router.post('/dispatch', async (req, res) => {
        try {
            const { type, endpoint, payload, strategy } = req.body;
            if (!type || !endpoint) return res.status(400).json({ error: 'Missing type or endpoint' });

            const result = await orchestrationService.dispatchTask(type, endpoint, payload, { strategy });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

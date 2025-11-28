import express from 'express';

export default function createConsensusRouter(scoringConsensus) {
    const router = express.Router();

    router.post('/vote', (req, res) => {
        try {
            const { contentId, score, peerId } = req.body;
            if (!contentId || score === undefined || !peerId) {
                return res.status(400).json({ error: 'Missing fields' });
            }

            const result = scoringConsensus.submitScore(contentId, score, peerId);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    router.get('/:id', (req, res) => {
        const result = scoringConsensus.getConsensus(req.params.id);
        if (!result) return res.status(404).json({ error: 'Consensus session not found' });
        res.json(result);
    });

    return router;
}

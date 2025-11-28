import express from 'express';

export default function createGovernanceRouter(governanceService) {
    const router = express.Router();

    // Get governance state
    router.get('/state', (req, res) => {
        try {
            const state = governanceService.getGovernanceState();
            res.json(state);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch governance state', details: error.message });
        }
    });

    // Get governance statistics
    router.get('/stats', (req, res) => {
        try {
            const stats = governanceService.getStatistics();
            res.json(stats);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch governance stats', details: error.message });
        }
    });

    // Create a proposal
    router.post('/proposals', (req, res) => {
        try {
            const { parameterKey, proposedValue, proposerId, reason } = req.body;
            if (!parameterKey || proposedValue === undefined || !proposerId) {
                return res.status(400).json({
                    error: 'Missing required fields: parameterKey, proposedValue, proposerId'
                });
            }

            const proposal = governanceService.createProposal(parameterKey, proposedValue, proposerId, reason);
            res.json(proposal);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // Vote on a proposal
    router.post('/proposals/:id/vote', (req, res) => {
        try {
            const { voterId, vote } = req.body;
            if (!voterId || !vote) {
                return res.status(400).json({ error: 'Missing required fields: voterId, vote' });
            }

            const proposal = governanceService.voteOnProposal(req.params.id, voterId, vote);
            res.json(proposal);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // Get proposal details
    router.get('/proposals/:id', (req, res) => {
        try {
            const proposal = governanceService.getProposal(req.params.id);
            res.json(proposal);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    return router;
}

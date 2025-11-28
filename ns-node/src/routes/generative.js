import express from 'express';
import * as nsLlm from '../services/ns-llm.js';

export default function createGenerativeRouter(governanceService, blockchainAnchor) {
    const router = express.Router();

    // GET /audit - Retrieve audit logs
    router.get('/audit', (req, res) => {
        try {
            const logs = governanceService.getAuditLog();
            res.json(logs);
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve audit logs', details: error.message });
        }
    });

    // GET /metrics - Retrieve governance metrics
    router.get('/metrics', (req, res) => {
        try {
            const metrics = governanceService.getMetrics();
            res.json(metrics);
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve metrics', details: error.message });
        }
    });

    // GET /chain - Retrieve blockchain status
    router.get('/chain', (req, res) => {
        try {
            const chain = blockchainAnchor.getChain();
            const verified = blockchainAnchor.verifyChain();
            res.json({
                height: chain.length,
                verified,
                latestBlocks: chain.slice(-10).reverse()
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve blockchain status', details: error.message });
        }
    });

    // POST /generate - Generate text with governance checks
    router.post('/generate', async (req, res) => {
        try {
            const { text, model, maxTokens, timeout } = req.body;

            if (!text) {
                return res.status(400).json({ error: 'Text prompt is required' });
            }

            // 1. Governance Validation (pre-generation)
            const validation = await governanceService.validate(text, {
                query: text,
                coherenceScore: 0.8, // Placeholder
                federatedCacheService: req.app.locals.federatedCacheService
            });

            if (validation.status === 'reject') {
                return res.status(403).json({
                    error: 'Content rejected by governance policy',
                    violations: validation.violations,
                    score: validation.score
                });
            }

            // 2. Generate Content (if passed)
            const result = await nsLlm.generate(text, { model, maxTokens, timeout });

            // 3. Return Response
            res.json({
                ...result,
                governance: {
                    status: validation.status,
                    score: validation.score,
                    violations: validation.violations
                }
            });

        } catch (error) {
            console.error('Generation error:', error);
            res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    });

    // POST /generate/stream - Stream generated text
    router.post('/generate/stream', async (req, res) => {
        try {
            const { text, model, maxTokens, timeout } = req.body;

            if (!text) {
                return res.status(400).json({ error: 'Text prompt is required' });
            }

            // 1. Governance Validation (Pre-generation)
            const validation = await governanceService.validate(text, {
                query: text,
                coherenceScore: 0.8, // Placeholder
                federatedCacheService: req.app.locals.federatedCacheService
            });

            if (validation.status === 'reject') {
                return res.status(403).json({
                    error: 'Content rejected by governance policy',
                    violations: validation.violations
                });
            }

            // 2. Setup SSE Stream
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // 3. Stream Generation
            let accumulatedText = '';
            await nsLlm.generateStream(text, { model, maxTokens, timeout }, (tokenData) => {
                if (tokenData.stream_token) {
                    accumulatedText += tokenData.stream_token;
                    res.write(`data: ${JSON.stringify(tokenData)}\n\n`);
                }
            });

            res.write('event: done\ndata: [DONE]\n\n');
            res.end();

        } catch (error) {
            console.error('Streaming error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error', details: error.message });
            } else {
                res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
                res.end();
            }
        }
    });

    return router;
}

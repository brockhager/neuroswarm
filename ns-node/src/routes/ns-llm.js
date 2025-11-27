/**
 * NS-LLM Routes
 * Endpoints for embedding and generation
 */

import express from 'express';
import * as nsLlmService from '../services/ns-llm.js';

const router = express.Router();

// Embed endpoint
router.post('/embed', async (req, res) => {
    try {
        const { text, model } = req.body || {};
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: "missing 'text' string" });
        }

        try {
            const result = await nsLlmService.embed(text, { model });
            return res.json(result);
        } catch (e) {
            return res.status(502).json({ error: 'ns-llm-unavailable', details: e.message });
        }
    } catch (err) {
        return res.status(500).json({ error: 'embed-failed', details: err.message });
    }
});

export default router;

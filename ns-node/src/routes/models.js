/**
 * Model Management Routes
 * Endpoints for listing, switching, and managing models
 */

import express from 'express';
import ModelRegistry from '../../../shared/model-registry.js';

const router = express.Router();
const modelRegistry = new ModelRegistry();

// List available models
router.get('/models', (req, res) => {
    try {
        const models = modelRegistry.listModels();
        res.json({ models, total: models.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to list models', details: err.message });
    }
});

// Get current model
router.get('/models/current', (req, res) => {
    try {
        const model = modelRegistry.getCurrentModel();
        if (!model) {
            return res.status(404).json({ error: 'No model loaded' });
        }
        res.json(model);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get current model', details: err.message });
    }
});

// Switch model
router.post('/models/switch', (req, res) => {
    try {
        const { model } = req.body;
        if (!model) {
            return res.status(400).json({ error: 'Missing model key' });
        }

        const switched = modelRegistry.switchModel(model);
        res.json({ success: true, model: switched });
    } catch (err) {
        res.status(400).json({ error: 'Failed to switch model', details: err.message });
    }
});

// Get registry stats
router.get('/models/stats', (req, res) => {
    try {
        const stats = modelRegistry.getStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get stats', details: err.message });
    }
});

export default router;

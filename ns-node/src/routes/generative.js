/**
 * Generative Governance Routes
 * Endpoints for managing generative content governance
 */

import express from 'express';
import GenerativeGovernanceService from '../services/generative-governance.js';
import * as nsLlmService from '../services/ns-llm.js';

const router = express.Router();

// Initialize governance service
const governanceService = new GenerativeGovernanceService({
    minTokens: 5,
    maxTokens: 500,
    minCoherence: 0.3,
    strictMode: false
});

// Generate with governance validation
router.post('/generate', async (req, res) => {
    try {
        const { text, prompt, maxTokens, timeout, skipGovernance } = req.body || {};
        const inputText = text || prompt;

        if (!inputText || typeof inputText !== 'string') {
            return res.status(400).json({ error: "missing 'text' or 'prompt' string" });
        }

        try {
            const result = await nsLlmService.generate(inputText, { maxTokens, timeout });

            // Apply governance validation (unless explicitly skipped)
            if (!skipGovernance) {
                const validation = governanceService.validate(result.text, {
                    query: inputText
                });

                result.governance = {
                    status: validation.status,
                    score: validation.score,
                    violations: validation.violations,
                    tokenCount: validation.tokenCount
                };

                // Reject if governance fails
                if (validation.status === 'reject') {
                    return res.status(422).json({
                        error: 'governance-rejected',
                        text: result.text,
                        governance: result.governance
                    });
                }
            }

            return res.json(result);
        } catch (e) {
            return res.status(502).json({ error: 'ns-llm-unavailable', details: e.message });
        }
    } catch (err) {
        return res.status(500).json({ error: 'generate-failed', details: err.message });
    }
});

// Get governance metrics
router.get('/metrics', (req, res) => {
    try {
        const metrics = governanceService.getMetrics();
        return res.json(metrics);
    } catch (err) {
        return res.status(500).json({ error: 'metrics-failed', details: err.message });
    }
});

// Get governance configuration
router.get('/config', (req, res) => {
    try {
        const config = governanceService.getConfig();
        return res.json(config);
    } catch (err) {
        return res.status(500).json({ error: 'config-failed', details: err.message });
    }
});

// Update governance configuration
router.put('/config', (req, res) => {
    try {
        governanceService.updateConfig(req.body);
        return res.json({ success: true, config: governanceService.getConfig() });
    } catch (err) {
        return res.status(500).json({ error: 'config-update-failed', details: err.message });
    }
});

// Get audit log
router.get('/audit', (req, res) => {
    try {
        const { status, since, limit } = req.query;
        const log = governanceService.getAuditLog({
            status,
            since: since ? parseInt(since) : undefined,
            limit: limit ? parseInt(limit) : undefined
        });
        return res.json({ entries: log, total: log.length });
    } catch (err) {
        return res.status(500).json({ error: 'audit-failed', details: err.message });
    }
});

export default router;

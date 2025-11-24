import express from 'express';
import { loadHistory } from '../services/history.js';

const router = express.Router();

router.get('/', (req, res) => {
    res.json(loadHistory());
});

router.get('/debug/last-headers', (req, res) => {
    // read last response in history and surface headers if present
    try {
        const history = loadHistory();
        const last = history[history.length - 1] || {};
        res.json({ lastHeaders: last.headers || null });
    } catch (e) {
        res.json({ lastHeaders: null });
    }
});

export default router;

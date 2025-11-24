import express from 'express';
import { getGatewayConfig } from '../services/gateway.js';
import { validators } from '../services/state.js';

const router = express.Router();

router.get('/debug/peers', (req, res) => {
    try {
        const GATEWAY_CONFIG = getGatewayConfig();
        const peers = {
            gateways: GATEWAY_CONFIG.map(g => ({ url: g.url, reachable: g.reachable, lastError: g.lastError })),
            validators: Array.from(validators.entries()).map(([id, v]) => ({ validatorId: id, stake: v.stake, slashed: !!v.slashed }))
        };
        res.json({ peers });
    } catch (e) {
        res.json({ peers: null, error: e.message });
    }
});

export default router;

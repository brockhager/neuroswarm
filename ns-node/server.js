import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Local imports
import { PeerManager, P2PProtocol, MessageType } from '../shared/peer-discovery/index.js';
import { MetricsService } from '../shared/peer-discovery/metrics-service.js';
import { PORTS } from '../shared/ports.js';
import { defaultLogger } from './logger.js';
import { logNs } from './src/utils/logger.js';
import { loadGatewayConfig, getGatewayConfig } from './src/services/gateway.js';
import { state, getCanonicalHeight, validators } from './src/services/state.js';
import { chooseCanonicalTipAndReorg } from './src/services/chain.js';
import { computeSourcesRoot } from '../sources/index.js';

// Routes
import chatRouter from './src/routes/chat.js';
import p2pRouter from './src/routes/p2p.js';
import historyRouter from './src/routes/history.js';
import createValidatorsRouter, { createTxRouter, createBlocksRouter, createChainRouter } from './src/routes/validators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || PORTS.NS_NODE;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Metrics
const metricsService = new MetricsService();

// Initialize Peer Manager
const peerManager = new PeerManager({
  nodeType: 'NS',
  port: PORT,
  bootstrapPeers: process.env.BOOTSTRAP_PEERS || '',
  maxPeers: parseInt(process.env.MAX_PEERS) || 8,
  dataDir: path.join(__dirname, 'data'),
  metricsService: metricsService,
  localDiscovery: true
});

// Initialize P2P Protocol
const p2pProtocol = new P2PProtocol(peerManager, {
  metricsService: metricsService,
  securityLogger: peerManager.securityLogger
});

// Load Gateway Config
loadGatewayConfig();

// Mount Routes
app.use('/chat', chatRouter);
app.use('/', p2pRouter); // Handles /debug/peers
app.use('/history', historyRouter); // Handles /history and /debug/last-headers
app.use('/validators', createValidatorsRouter(p2pProtocol, peerManager));
app.use('/tx', createTxRouter(p2pProtocol, peerManager));
app.use('/blocks', createBlocksRouter(p2pProtocol, peerManager));
app.use('/', createChainRouter(p2pProtocol, peerManager)); // Handles /proof, /verify/proof, /ipfs/verify, /governance, /mempool, /chain/height, /headers/tip, /debug/verifyHeader

// Health Endpoint
let VERSION = '0.1.0';
try {
  const pkgPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pj = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    VERSION = pj.version || VERSION;
  }
} catch (e) {
  // ignore
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VERSION, uptime: process.uptime() });
});

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  logNs(`NeuroSwarm Node (NS) listening on port ${PORT}`);
  logNs(`Mode: ${process.env.NODE_ENV || 'development'}`);
  logNs(`P2P Network initialized. Node ID: ${peerManager.nodeId}`);
});

// Periodic heartbeat for operator/debugging visibility
const STATUS_ENABLED = process.env.STATUS === '1' || process.argv.includes('--status');
if (STATUS_ENABLED) {
  setInterval(async () => {
    try {
      const GATEWAY_CONFIG = getGatewayConfig();
      const gwStatus = GATEWAY_CONFIG.map(g => `${g.url}${g.reachable ? ':OK' : ':DOWN'}`).join(', ');
      const validatorCount = validators ? validators.size : 0;
      // Query gateway for mempool stats if available
      let mempoolSize = null;
      try {
        const gw = GATEWAY_CONFIG && GATEWAY_CONFIG.length ? GATEWAY_CONFIG[0] : null;
        if (gw && gw.url) {
          const url = gw.url.replace(/\/$/, '') + '/v1/stats';
          const r = await fetch(url);
          if (r.ok) {
            const j = await r.json(); if (j && typeof j.mempoolSize !== 'undefined') mempoolSize = j.mempoolSize;
          }
        }
      } catch (e) { /* ignore */ }
      // Note: blocksVerified and sourcesValidCount were local variables in old server.js.
      // We can't easily access them unless we move them to state.js or metrics.
      // For now, I'll omit them or use placeholders.
      logNs(`heartbeat | gateways=${gwStatus} validators=${validatorCount} mempool=${mempoolSize || 'unknown'} height=${getCanonicalHeight()} uptime=${process.uptime().toFixed(0)}s`);
    } catch (e) {
      logNs('Heartbeat error', e.message);
    }
  }, Number(process.env.STATUS_INTERVAL_MS || 60000));
}

// Graceful Shutdown
process.on('SIGTERM', () => {
  logNs('SIGTERM received. Shutting down...');
  server.close(() => {
    logNs('HTTP server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logNs('CRITICAL', 'Uncaught Exception:', err);
  // process.exit(1); // Optional: keep running or exit
});

process.on('unhandledRejection', (reason, promise) => {
  logNs('CRITICAL', 'Unhandled Rejection at:', promise, 'reason:', reason);
});

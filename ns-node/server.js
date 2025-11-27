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
import * as nsLlmService from './src/services/ns-llm.js';
import { state, getCanonicalHeight, validators } from './src/services/state.js';
import { chooseCanonicalTipAndReorg } from './src/services/chain.js';
import { computeSourcesRoot } from '../sources/index.js';
import QueryHistoryService from './src/services/query-history.js';
import GovernanceService from './src/services/governance.js';
import CacheVisualizationService from './src/services/cache-visualization.js';

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

// Initialize Query History Service
const queryHistoryService = new QueryHistoryService();

// Initialize Governance Service
const governanceService = new GovernanceService();

// Initialize Cache Visualization Service
const cacheVisualizationService = new CacheVisualizationService();

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

// Dashboard Route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Query History Routes
app.get('/api/query-history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const history = queryHistoryService.getHistory(limit, offset);
    res.json({ history, total: queryHistoryService.history.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch query history', details: error.message });
  }
});

app.get('/api/query-history/stats', (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const stats = queryHistoryService.getStats(hours);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch query stats', details: error.message });
  }
});

app.get('/api/query-history/:id', (req, res) => {
  try {
    const query = queryHistoryService.getQueryById(req.params.id);
    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }
    res.json(query);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch query', details: error.message });
  }
});

app.post('/api/query-history/:id/replay', (req, res) => {
  try {
    const replay = queryHistoryService.replayQuery(req.params.id);
    res.json(replay);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Embed proxy endpoint (NS Node → NS-LLM)
app.post('/embed', async (req, res) => {
  try {
    const { text, model } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ error: "missing 'text' string" });

    // Forward to NS-LLM adapter (native shim or HTTP prototype)
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

// Generate proxy endpoint (NS Node → NS-LLM)
app.post('/api/generate', async (req, res) => {
  try {
    const { text, prompt, maxTokens, timeout } = req.body || {};
    const inputText = text || prompt;

    if (!inputText || typeof inputText !== 'string') {
      return res.status(400).json({ error: "missing 'text' or 'prompt' string" });
    }

    // Forward to NS-LLM adapter
    try {
      const result = await nsLlmService.generate(inputText, { maxTokens, timeout });
      return res.json(result);
    } catch (e) {
      return res.status(502).json({ error: 'ns-llm-unavailable', details: e.message });
    }
  } catch (err) {
    return res.status(500).json({ error: 'generate-failed', details: err.message });
  }
});

// Governance Routes
app.get('/api/governance', (req, res) => {
  try {
    const state = governanceService.getGovernanceState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch governance state', details: error.message });
  }
});

app.get('/api/governance/stats', (req, res) => {
  try {
    const stats = governanceService.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch governance stats', details: error.message });
  }
});

app.post('/api/governance/proposals', (req, res) => {
  try {
    const { parameterKey, proposedValue, proposerId, reason } = req.body;
    if (!parameterKey || proposedValue === undefined || !proposerId) {
      return res.status(400).json({ error: 'Missing required fields: parameterKey, proposedValue, proposerId' });
    }

    const proposal = governanceService.createProposal(parameterKey, proposedValue, proposerId, reason);
    res.json(proposal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/governance/proposals/:id/vote', (req, res) => {
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

app.get('/api/governance/proposals/:id', (req, res) => {
  try {
    const proposal = governanceService.getProposal(req.params.id);
    res.json(proposal);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Cache Visualization Endpoints (Phase 4a.2)
app.get('/api/cache/visualization', (req, res) => {
  try {
    const data = cacheVisualizationService.getVisualizationData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch visualization data', details: error.message });
  }
});

app.get('/api/cache/stats', (req, res) => {
  try {
    const stats = cacheVisualizationService.getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cache stats', details: error.message });
  }
});

app.get('/api/cache/clusters', (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 0.7;
    const clusters = cacheVisualizationService.getSimilarityClusters(threshold);
    res.json({ clusters, threshold });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch similarity clusters', details: error.message });
  }
});

app.post('/api/cache/refresh', (req, res) => {
  try {
    const data = cacheVisualizationService.refresh();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh cache visualization', details: error.message });
  }
});

// Health Endpoint
let VERSION = '0.1.0';
try {
  // Prefer repository-level VERSION file when present (project root -> version-id.txt)
  const rootVersionPath = path.join(__dirname, '..', 'version-id.txt');
  if (fs.existsSync(rootVersionPath)) {
    VERSION = fs.readFileSync(rootVersionPath, 'utf8').trim() || VERSION;
  } else {
    const pkgPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pj = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      VERSION = pj.version || VERSION;
    }
  }
} catch (e) {
  // ignore errors reading version file
}

app.get('/health', async (req, res) => {
  try {
    // Check semantic features
    let semanticStatus = { available: false, message: 'Semantic features disabled' };
    try {
      const ipfsStatus = { ok: false, message: 'IPFS check skipped' };
      let ollamaHealthy = false;
      try {
        const response = await fetch('http://localhost:11434/api/tags', {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        if (response.ok) {
          const data = await response.json();
          ollamaHealthy = data.models && data.models.some(m => m.name.includes('llama3.2'));
        }
      } catch (e) {
        // Ollama not available
      }
      semanticStatus = {
        available: ollamaHealthy,
        ipfs: ipfsStatus,
        ollama: ollamaHealthy
      };
    } catch (e) {
      semanticStatus.message = `Semantic check failed: ${e.message}`;
    }

    // Knowledge index metrics
    let knowledgeMetrics = { total: 0, withEmbeddings: 0, avgConfidence: 0 };
    try {
      const { loadIndex } = await import('./src/services/knowledge-store.js');
      const index = loadIndex();
      const entries = Object.values(index);
      knowledgeMetrics.total = entries.length;
      knowledgeMetrics.withEmbeddings = entries.filter(e => e.embedding && Array.isArray(e.embedding)).length;

      const confidences = entries.filter(e => e.confidence).map(e => e.confidence);
      if (confidences.length > 0) {
        knowledgeMetrics.avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      }
    } catch (e) {
      knowledgeMetrics.error = e.message;
    }

    // Recent activity (last 24 hours)
    const recentActivity = queryHistoryService.getStats(24);

    // NS-LLM health (if available)
    let nsLlm = { available: false };
    try {
      nsLlm = await nsLlmService.health();
      // Add metrics if using HTTP client
      const clientMetrics = await nsLlmService.metrics();
      if (clientMetrics) {
        nsLlm.metrics = clientMetrics;
        nsLlm.clientType = nsLlmService.getClientType();
      }
    } catch (e) {
      nsLlm = { available: false, error: e.message };
    }

    res.json({
      status: 'ok',
      version: VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      semantic: semanticStatus,
      knowledge: knowledgeMetrics,
      activity: recentActivity,
      nsLlm,
      system: {
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed', details: error.message });
  }
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
  logNs(`Version: ${VERSION}`);
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

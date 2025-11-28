import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Local imports
import { PeerManager, P2PProtocol } from '../shared/peer-discovery/index.js';
import { MetricsService } from '../shared/peer-discovery/metrics-service.js';
import { PORTS } from '../shared/ports.js';
import { logNs } from './src/utils/logger.js';
import { loadGatewayConfig, getGatewayConfig } from './src/services/gateway.js';
import * as nsLlmService from './src/services/ns-llm.js';
import { state, getCanonicalHeight, validators } from './src/services/state.js';
import QueryHistoryService from './src/services/query-history.js';
import GovernanceService from './src/services/governance.js';
import CacheVisualizationService from './src/services/cache-visualization.js';
import GenerativeGovernanceService from './src/services/generative-governance.js';
import BlockchainAnchorService from './src/services/blockchain-anchor.js';
import OrchestrationService from './src/services/orchestration.js';
import ScoringConsensus from './src/services/scoring-consensus.js';
import FederatedCacheService from './src/services/federated-cache.js';
import GpuResourceManager from './src/services/gpu-resource-manager.js';
import KvCacheService from './src/services/kv-cache.js';
import PerformanceProfiler from './src/services/performance-profiler.js';
import PluginManager from './src/services/plugin-manager.js';

// Routes
import chatRouter from './src/routes/chat.js';
import p2pRouter from './src/routes/p2p.js';
import historyRouter from './src/routes/history.js';
import createGenerativeRouter from './src/routes/generative.js';
import createOrchestrationRouter from './src/routes/orchestration.js';
import createConsensusRouter from './src/routes/consensus.js';
import createGovernanceRouter from './src/routes/governance.js';
import createCacheRouter from './src/routes/cache.js';
import createGpuRouter from './src/routes/gpu.js';
import createKvCacheRouter from './src/routes/kv-cache.js';
import createPerformanceRouter from './src/routes/performance.js';
import createPluginRouter from './src/routes/plugins.js';
import createValidatorsRouter, { createTxRouter, createBlocksRouter, createChainRouter } from './src/routes/validators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || PORTS.NS_NODE;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Services
const metricsService = new MetricsService();
const queryHistoryService = new QueryHistoryService();
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

// Initialize Phase G Services
const gpuResourceManager = new GpuResourceManager();
await gpuResourceManager.initialize();

const kvCacheService = new KvCacheService();
await kvCacheService.initialize();

const performanceProfiler = new PerformanceProfiler();

const pluginManager = new PluginManager();
await pluginManager.initialize();

const orchestrationService = new OrchestrationService(peerManager, metricsService);
const scoringConsensus = new ScoringConsensus(peerManager.reputation, { minVotes: 2 });
const federatedCacheService = new FederatedCacheService(orchestrationService);
const blockchainAnchor = new BlockchainAnchorService();

// Initialize Generative Governance Service
const generativeGovernanceService = new GenerativeGovernanceService({
  minTokens: 5,
  maxTokens: 500,
  minCoherence: 0.3,
  strictMode: false,
  onAudit: (entry) => blockchainAnchor.addBlock(entry)
});

// Register Custom Validators
generativeGovernanceService.registerValidator('no-markdown-links', async (text) => {
  if (text.includes('](')) {
    return { status: 'warn', message: 'Markdown links are discouraged.' };
  }
  return { status: 'pass' };
});

generativeGovernanceService.registerValidator('semantic-grounding', async (text, context) => {
  if (!context || !context.federatedCacheService) {
    return { status: 'pass' };
  }
  const results = await context.federatedCacheService.semanticQuery(text);
  if (results.length === 0) {
    return { status: 'warn', message: 'Content not grounded in known knowledge base.' };
  }
  return { status: 'pass' };
});

// Initialize Governance Service and Subscribe to Changes
const governanceService = new GovernanceService();
governanceService.addListener((key, value) => {
  console.log(`Governance update received: ${key} -> ${value}`);
  const configUpdate = {};
  if (key === 'minTokens') configUpdate.minTokens = value;
  if (key === 'maxTokens') configUpdate.maxTokens = value;
  if (key === 'minCoherence') configUpdate.minCoherence = value;
  if (key === 'toxicityEnabled') configUpdate.toxicityEnabled = value;

  if (Object.keys(configUpdate).length > 0) {
    generativeGovernanceService.updateConfig(configUpdate);
    console.log('GenerativeGovernanceService config updated:', configUpdate);
  }
});

// Make services available to routers via app.locals
app.locals.federatedCacheService = federatedCacheService;

// Load Gateway Config
loadGatewayConfig();

// Mount Routes
app.use('/chat', chatRouter);
app.use('/', p2pRouter);
app.use('/history', historyRouter);
app.use('/api/orchestration', createOrchestrationRouter(orchestrationService));
app.use('/api/consensus', createConsensusRouter(scoringConsensus));
app.use('/api/governance', createGovernanceRouter(governanceService));
app.use('/api/cache', createCacheRouter(cacheVisualizationService));
app.use('/api/gpu', createGpuRouter(gpuResourceManager));
app.use('/api/kv-cache', createKvCacheRouter(kvCacheService));
app.use('/api/performance', createPerformanceRouter(performanceProfiler));
app.use('/api/plugins', createPluginRouter(pluginManager));
app.use('/api/generative', createGenerativeRouter(generativeGovernanceService, blockchainAnchor));

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

// Embed proxy endpoint
app.post('/embed', async (req, res) => {
  try {
    const { text, model } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "missing 'text' string" });
    }

    const result = await nsLlmService.embed(text, { model });
    return res.json(result);
  } catch (e) {
    return res.status(502).json({ error: 'ns-llm-unavailable', details: e.message });
  }
});

// Health Endpoint
let VERSION = '0.1.0';
try {
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

    const recentActivity = queryHistoryService.getStats(24);

    let nsLlm = { available: false };
    try {
      nsLlm = await nsLlmService.health();
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

// Periodic heartbeat
const STATUS_ENABLED = process.env.STATUS === '1' || process.argv.includes('--status');
if (STATUS_ENABLED) {
  setInterval(async () => {
    try {
      const GATEWAY_CONFIG = getGatewayConfig();
      const gwStatus = GATEWAY_CONFIG.map(g => `${g.url}${g.reachable ? ':OK' : ':DOWN'}`).join(', ');
      const validatorCount = validators ? validators.size : 0;
      let mempoolSize = null;
      try {
        const gw = GATEWAY_CONFIG && GATEWAY_CONFIG.length ? GATEWAY_CONFIG[0] : null;
        if (gw && gw.url) {
          const url = gw.url.replace(/\/$/, '') + '/v1/stats';
          const r = await fetch(url);
          if (r.ok) {
            const j = await r.json();
            if (j && typeof j.mempoolSize !== 'undefined') mempoolSize = j.mempoolSize;
          }
        }
      } catch (e) { /* ignore */ }
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
});

process.on('unhandledRejection', (reason, promise) => {
  logNs('CRITICAL', 'Unhandled Rejection at:', promise, 'reason:', reason);
});

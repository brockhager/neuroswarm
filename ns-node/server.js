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
import { state, getCanonicalHeight, validators, blockMap } from './src/services/state.js';
import { chainEvents } from './src/services/chain.js';
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
import { BlockPropagationService } from './src/services/block-propagation.js';
import { MessageType } from '../shared/peer-discovery/p2p-protocol.js';

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

// Sync controls
const MAX_SYNC_BLOCKS = parseInt(process.env.MAX_SYNC_BLOCKS) || 100; // max blocks per response
const MAX_CONCURRENT_SYNC_PER_PEER = parseInt(process.env.MAX_CONCURRENT_SYNC_PER_PEER) || 3;
const syncInflight = new Map(); // track inflight requests per peer id

// Register sync-related metrics
metricsService.registerCounter('sync_requests_total', 'Total REQUEST_BLOCKS_SYNC received');
metricsService.registerCounter('sync_ancestry_mismatch_total', 'Total ancestry mismatch rejections');
metricsService.registerCounter('sync_too_many_concurrent_total', 'Total sync rejections due to concurrency limits (429)');
metricsService.registerGauge('sync_inflight_total', 'Current number of in-flight sync handlers (global)');
metricsService.registerGauge('sync_inflight_per_peer', 'Current number of in-flight sync handlers per peer');

// Initialize Block Propagation Service
const blockPropagation = new BlockPropagationService(p2pProtocol, peerManager);
logNs('[Server] Block Propagation Service initialized');

// Listen for applied blocks and broadcast via P2P if blockPropagation is not present
chainEvents.on('blockApplied', async ({ blockHash, header, height }) => {
  try {
    // Prefer BlockPropagationService, otherwise fallback to simple P2P gossip
    if (blockPropagation && typeof blockPropagation.announceBlock === 'function') {
      await blockPropagation.announceBlock(blockHash, header, height);
    } else {
      const gossipMsg = p2pProtocol.createMessage(MessageType.NEW_BLOCK_GOSSIP, { blockHash, header }, peerManager.nodeId);
      await p2pProtocol.broadcastMessage(gossipMsg).catch(err => logNs('WARN', 'Gossip broadcast failed', err.message));
    }
  } catch (e) {
    logNs('ERROR', 'blockApplied handler error', e.message);
  }
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

// Mount Validators & Blockchain Routes (Critical: enables consensus and cryptographic verification)
app.use('/validators', createValidatorsRouter(p2pProtocol, peerManager));
app.use('/v1/tx', createTxRouter(p2pProtocol, peerManager));
app.use('/v1/blocks', createBlocksRouter(p2pProtocol, peerManager, blockPropagation));
app.use('/', createChainRouter(p2pProtocol, peerManager));

// P2P HTTP message ingress endpoint - used by peers to POST messages
app.post('/p2p/message', async (req, res) => {
  try {
    const message = req.body;
    const senderIp = req.ip || req.socket.remoteAddress;

    if (!message || !message.type || !message.id) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const result = await p2pProtocol.handleMessage(message, senderIp);

    // Application-level handling for sync requests
    if (message.type === MessageType.REQUEST_BLOCKS_SYNC && result.processed) {
      const { fromHeight = 0, toHeight = null, max = 100 } = message.payload || {};
      const originId = message.originNodeId || senderIp || 'unknown';

      // Observability: count incoming sync requests
      try { metricsService.inc('sync_requests_total', { origin: originId }); } catch (e) {}

      // Concurrency protection per-peer
      const cur = syncInflight.get(originId) || 0;
      if (cur >= MAX_CONCURRENT_SYNC_PER_PEER) {
        logNs('WARN', `REQUEST_BLOCKS_SYNC rejected due to too many concurrent syncs from ${originId}`);
        try { metricsService.inc('sync_too_many_concurrent_total', { origin: originId }); } catch (e) {}
        return res.status(429).json({ ok: false, error: 'too_many_concurrent_syncs' });
      }
      syncInflight.set(originId, cur + 1);
      // update gauges
      try {
        const totalInflight = Array.from(syncInflight.values()).reduce((a, b) => a + b, 0);
        metricsService.set('sync_inflight_total', totalInflight);
        metricsService.set('sync_inflight_per_peer', syncInflight.get(originId), { peer: originId });
      } catch (e) {}
      // ensure we decrement after handling
      let inflightDecremented = false;
      // Support an optional anchorPrevHash supplied by the requester (their local tip hash)
      // If supplied, the responder must ensure the first block of the response extends that anchor.
      const { anchorPrevHash = null } = message.payload || {};

      // Build canonical chain array (genesis -> tip)
      const blocksArr = [];
      let h = state.canonicalTipHash;
      if (h) {
        while (h && blockMap.has(h)) {
          const b = blockMap.get(h);
          blocksArr.push(b);
          h = b.parentHash;
        }
        blocksArr.reverse();
      }

      const effectiveMax = Math.min(Number(max || MAX_SYNC_BLOCKS), MAX_SYNC_BLOCKS);
      const slice = (typeof toHeight === 'number') ? blocksArr.slice(fromHeight, toHeight + 1) : blocksArr.slice(fromHeight, fromHeight + effectiveMax);

      // Testing helper: allow optional delayMs in payload to simulate long-running syncs (only enabled in NODE_ENV=test)
      if (process.env.NODE_ENV === 'test' && message.payload && Number(message.payload.delayMs) > 0) {
        try { await new Promise(r => setTimeout(r, Number(message.payload.delayMs))); } catch (e) {}
      }

      // If an anchorPrevHash was supplied, validate that the first block we would send
      // indeed references that anchor as its prevHash. If not, reject the sync request.
      if (anchorPrevHash && slice.length > 0) {
        const firstPrev = slice[0].header && slice[0].header.prevHash;
        if (firstPrev !== anchorPrevHash) {
          logNs('WARN', `REQUEST_BLOCKS_SYNC: anchor mismatch from ${message.originNodeId} - expected prevHash=${anchorPrevHash} got ${firstPrev}`);
          try { metricsService.inc('sync_ancestry_mismatch_total', { origin: originId }); } catch (e) {}
          // Reply to origin with an error message to avoid silent failures
          const errPayload = { requestId: message.id, error: 'ANCESTRY_MISMATCH', details: { expected: anchorPrevHash, found: firstPrev } };
          const errMsg = p2pProtocol.createMessage(MessageType.RESPONSE_BLOCKS_SYNC, errPayload, peerManager.nodeId);
          const originId = message.originNodeId;
          const originPeer = peerManager.getPeer(originId);
          if (originPeer) {
            const url = `http://${originPeer.host}:${originPeer.port}/p2p/message`;
            try {
              await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(errMsg), timeout: 5000 });
            } catch (e) {
              logNs('WARN', `Failed to send ancestry mismatch response to ${originId}: ${e.message}`);
            }
          } else {
            await p2pProtocol.broadcastMessage(errMsg).catch(err => logNs('WARN', 'Failed to broadcast ancestry mismatch response', err.message));
          }
          // Don't send the normal response
          // decrement inflight and return
          syncInflight.set(originId, Math.max(0, (syncInflight.get(originId) || 1) - 1));
          try {
            const totalInflight = Array.from(syncInflight.values()).reduce((a, b) => a + b, 0);
            metricsService.set('sync_inflight_total', totalInflight);
            metricsService.set('sync_inflight_per_peer', syncInflight.get(originId) || 0, { peer: originId });
          } catch (e) {}
          inflightDecremented = true;
          return res.json({ ok: true, result: { processed: true, action: 'request_blocks_sync_rejected', reason: 'ancestry_mismatch' } });
        }
      }

      const respPayload = { requestId: message.id, blocks: slice.map(b => ({ header: b.header, blockHash: b.blockHash })), hasMore: (fromHeight + slice.length) < blocksArr.length, nextFrom: fromHeight + slice.length };
      const respMsg = p2pProtocol.createMessage(MessageType.RESPONSE_BLOCKS_SYNC, respPayload, peerManager.nodeId);

      const targetOriginId = message.originNodeId;
      const originPeer = peerManager.getPeer(targetOriginId);
      if (originPeer) {
        const url = `http://${originPeer.host}:${originPeer.port}/p2p/message`;
          try {
            await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(respMsg), timeout: 5000 });
          } catch (e) {
            logNs('WARN', `Failed to send sync response to ${targetOriginId}: ${e.message}`);
          }
          // decrement inflight for this origin
          if (!inflightDecremented) {
            syncInflight.set(targetOriginId, Math.max(0, (syncInflight.get(targetOriginId) || 1) - 1));
            try {
              const totalInflight = Array.from(syncInflight.values()).reduce((a, b) => a + b, 0);
              metricsService.set('sync_inflight_total', totalInflight);
              metricsService.set('sync_inflight_per_peer', syncInflight.get(targetOriginId) || 0, { peer: targetOriginId });
            } catch (e) {}
          }
      } else {
          await p2pProtocol.broadcastMessage(respMsg).catch(err => logNs('WARN', 'Failed to broadcast sync response', err.message));
          if (!inflightDecremented) {
            syncInflight.set(targetOriginId, Math.max(0, (syncInflight.get(targetOriginId) || 1) - 1));
            try {
              const totalInflight = Array.from(syncInflight.values()).reduce((a, b) => a + b, 0);
              metricsService.set('sync_inflight_total', totalInflight);
              metricsService.set('sync_inflight_per_peer', syncInflight.get(targetOriginId) || 0, { peer: targetOriginId });
            } catch (e) {}
          }
      }
    }

    // Handle incoming sync responses: verify ancestry matches our tip
    if (message.type === MessageType.RESPONSE_BLOCKS_SYNC && result.processed) {
      try {
        const blocks = (message.payload && message.payload.blocks) || [];
        if (blocks.length > 0) {
          const firstPrev = blocks[0].header && blocks[0].header.prevHash;
          const localTip = state.canonicalTipHash || '0'.repeat(64);
          if (firstPrev !== localTip) {
            logNs('WARN', `RESPONSE_BLOCKS_SYNC ancestry mismatch: first prevHash=${firstPrev} does not equal local tip=${localTip}. Rejecting payload from ${message.originNodeId}`);
            try { metricsService.inc('sync_ancestry_mismatch_total', { origin: message.originNodeId || senderIp || 'unknown' }); } catch (e) {}
            // Respond with an error to the sender and mark as processed=false so peers know
            return res.status(400).json({ ok: false, error: 'invalid_ancestry', expectedPrevHash: localTip, foundPrevHash: firstPrev });
          }
        }
      } catch (e) {
        logNs('ERROR', 'Error validating RESPONSE_BLOCKS_SYNC ancestry', e.message);
      }
    }

    return res.json({ ok: true, result });
  } catch (err) {
    logNs('ERROR', 'Error handling P2P message:', err.message);
    return res.status(500).json({ error: 'handle_message_failed', detail: err.message });
  }
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
// Graceful Shutdown
process.on('SIGTERM', () => {
  logNs('SIGTERM received. Shutting down...');
  server.close(() => {
    logNs('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logNs('SIGINT received. Shutting down...');
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

process.on('exit', (code) => {
  logNs(`Process exiting with code: ${code}`);
});

// Export app for E2E testing
export default app;

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { ensureDirInRepoSync, safeJoinRepo } from '../scripts/repoScopedFs.mjs';
import { computeSourcesRoot } from '../sources/index.js';
import { queryAdapter } from '../sources/index.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { PeerManager, P2PProtocol, MessageType, startHTTPSServer } from '../shared/peer-discovery/index.js';
import { MetricsService } from '../shared/peer-discovery/metrics-service.js';
import { defaultLogger } from './logger.js';

const __dirname = process.cwd();

const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
if (!fs.existsSync(DATA_DIR)) ensureDirInRepoSync(DATA_DIR);
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));

const app = express();
const PORT = process.env.PORT || 3000;
const LEARNING_SERVICE_URL = process.env.LEARNING_SERVICE_URL || 'http://localhost:3007/learning';
const LEARNING_REQUEST_TIMEOUT = parseInt(process.env.LEARNING_SERVICE_TIMEOUT || '2500', 10);
const interactionsLogger = defaultLogger;

// Initialize Metrics Service
const metricsService = new MetricsService({
  enabled: true,
  prefix: 'neuroswarm_'
});

// Initialize Peer Discovery
const peerManager = new PeerManager({
  nodeType: 'NS',
  port: PORT,
  bootstrapPeers: process.env.BOOTSTRAP_PEERS || '',
  maxPeers: parseInt(process.env.MAX_PEERS) || 8,
  dataDir: path.join(__dirname, 'data'),
  metricsService: metricsService
});

// Initialize P2P Protocol
const p2pProtocol = new P2PProtocol(peerManager, {
  metricsService: metricsService,
  securityLogger: peerManager.securityLogger // Use the same logger instance
});

function ts() { return new Date().toISOString(); }
logNs(`ns-node starting on port ${PORT}`);
logNs(`Peer discovery enabled | nodeId=${peerManager.nodeId} | bootstrapPeers=${process.env.BOOTSTRAP_PEERS || 'none'}`);

// Periodic peer health check and peer exchange
setInterval(async () => {
  const peers = peerManager.getAllPeers();
  for (const peer of peers) {
    await p2pProtocol.pingPeer(peer);
  }

  // Prune inactive peers
  peerManager.pruneInactivePeers();

  // Send peer list to a random peer (Peer Exchange)
  if (peers.length > 0) {
    const randomPeer = peers[Math.floor(Math.random() * peers.length)];
    await p2pProtocol.sendPeerList(randomPeer);
  }
}, 30000); // Every 30 seconds

app.use(cors());
// Log incoming HTTP requests for connection visibility
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress;
  logNs(`HTTP ${req.method} ${req.url} from ${ip}`);
  next();
});
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Metrics Endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metricsService.getMetrics());
});

// Error handler for malformed JSON bodies
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    logNs('WARN', 'Bad JSON payload in request body', err.message);
    return res.status(400).json({ error: 'bad_json', message: err.message });
  }
  next(err);
});

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function fakeProvenance() {
  return {
    cid: `Qm${Math.random().toString(36).substr(2, 9)}`,
    txSignature: `sig_${Math.random().toString(36).substr(2, 12)}`
  };
}

async function requestLearningSupport(query) {
  if (!LEARNING_SERVICE_URL) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LEARNING_REQUEST_TIMEOUT);
    const response = await fetch(`${LEARNING_SERVICE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`learning service responded ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    logNs('WARN', 'Learning service unavailable', err.message);
    return null;
  }
}

app.post('/chat', async (req, res) => {
  const body = req.body || {};
  const sender = body.sender || 'user';
  const content = body.content || '';
  const auth = req.header('authorization') || '';
  const forwardedFor = req.header('x-forwarded-for') || req.socket.remoteAddress || '';
  const forwardedUser = req.header('x-forwarded-user') || '';

  if (!content) return res.status(400).json({ error: 'content is required' });

  const startTime = Date.now();
  const interactionId = uuidv4();
  const adaptersQueried = [];
  const adapterResponses = {};

  const now = new Date().toISOString();
  const inMsg = { id: uuidv4(), sender, content, timestamp: now };

  let responseContent = '';
  let searchData = null;
  const isQuestion = content.trim().endsWith('?') ||
    content.toLowerCase().startsWith('what ') ||
    content.toLowerCase().startsWith('how ') ||
    content.toLowerCase().startsWith('why ') ||
    content.toLowerCase().startsWith('when ') ||
    content.toLowerCase().startsWith('where ') ||
    content.toLowerCase().startsWith('who ') ||
    content.toLowerCase().startsWith('tell me ') ||
    content.toLowerCase().startsWith('explain ');
  const detectedIntent = isQuestion ? 'question' : 'statement';

  const learningSupport = isQuestion ? await requestLearningSupport(content) : null;
  const recommendedAdapters = Array.isArray(learningSupport?.adapters) ? learningSupport.adapters : [];
  const exemplars = Array.isArray(learningSupport?.exemplars) ? learningSupport.exemplars : [];

  const adapterCandidates = Array.from(new Set([
    ...recommendedAdapters,
    'duckduckgo-search'
  ]));

  if (isQuestion) {
    for (const adapterName of adapterCandidates) {
      adaptersQueried.push(adapterName);
      try {
        logNs(`Question detected, querying adapter ${adapterName} for: "${content}"`);
        const searchResult = await queryAdapter(adapterName, { query: content, maxResults: 3 });
        adapterResponses[adapterName] = searchResult;

        if (searchResult && searchResult.value) {
          searchData = searchResult.value;
          if (searchData.instantAnswer?.text) {
            responseContent = searchData.instantAnswer.text;
            if (searchData.instantAnswer.source) {
              responseContent += `\n\n📚 Source: ${searchData.instantAnswer.source}`;
            }
          } else if (searchData.definition?.text) {
            responseContent = searchData.definition.text;
            if (searchData.definition.source) {
              responseContent += `\n\n📚 Source: ${searchData.definition.source}`;
            }
          } else if (searchData.answer?.text) {
            responseContent = searchData.answer.text;
          } else if (Array.isArray(searchData.results) && searchData.results.length > 0) {
            responseContent = `I found some information about that:\n\n`;
            searchData.results.slice(0, 3).forEach((result, idx) => {
              responseContent += `${idx + 1}. ${result.description}\n`;
            });
            responseContent += `\n🔍 Search performed via ${adapterName}`;
          }

          if (responseContent) {
            logNs(`${adapterName} search successful, found answer: ${responseContent.substring(0, 100)}...`);
            break;
          }
        }
      } catch (err) {
        adapterResponses[adapterName] = { error: err.message };
        logNs(`Adapter ${adapterName} failed: ${err.message}`);
      }
    }

    if (!responseContent) {
      responseContent = `I searched for information about "${content}" but couldn't find a clear answer. Could you try rephrasing your question?`;
    }
  } else {
    responseContent = `Echoing: ${content}`;
  }

  if (exemplars.length > 0) {
    const exemplarText = exemplars.slice(0, 2).map(ex => `• ${ex.user_message} → ${ex.final_reply}`).join('\n');
    responseContent += `\n\n🧠 Related context:\n${exemplarText}`;
  }

  const response = {
    id: uuidv4(),
    sender: 'agent',
    content: responseContent,
    timestamp: new Date().toISOString(),
    searchData,
    interactionId,
    ...fakeProvenance()
  };

  const history = loadHistory();
  const msgHeaders = { authorization: auth, 'x-forwarded-for': forwardedFor, 'x-forwarded-user': forwardedUser };
  history.push({ direction: 'in', ...inMsg, headers: msgHeaders });
  history.push({ direction: 'out', ...response, headers: msgHeaders });
  saveHistory(history);

  interactionsLogger.recordInteraction({
    interaction_id: interactionId,
    timestamp: response.timestamp,
    user_message: content,
    detected_intent: detectedIntent,
    adapters_queried: adaptersQueried,
    adapter_responses: adapterResponses,
    final_reply: responseContent,
    latency_ms: Date.now() - startTime,
    feedback: null
  });

  // Try to publish message to configured gateways in order (primary first)
  const incomingCorrelation = req.header('x-correlation-id') || uuidv4();
  const forwardedHeaders = { authorization: auth, 'x-forwarded-for': forwardedFor, 'x-forwarded-user': forwardedUser, 'x-correlation-id': incomingCorrelation };
  publishToGateways({ id: response.id, sender: response.sender, content: response.content, timestamp: response.timestamp }, forwardedHeaders)
    .catch((err) => {
      logNs('Failed to publish to gateways:', err);
    });

  res.json(response);
});

app.post('/feedback', async (req, res) => {
  const { interaction_id: interactionId, score, correction } = req.body || {};
  if (!interactionId) {
    return res.status(400).json({ error: 'interaction_id is required' });
  }
  if (score !== 1 && score !== -1) {
    return res.status(400).json({ error: 'score must be +1 or -1' });
  }

  try {
    interactionsLogger.recordFeedback({ interaction_id: interactionId, score, correction: correction || null });
  } catch (err) {
    logNs('WARN', 'Failed to persist feedback', err.message);
    return res.status(500).json({ error: 'feedback_persist_failed' });
  }

  if (LEARNING_SERVICE_URL) {
    fetch(`${LEARNING_SERVICE_URL}/reload`, { method: 'POST' }).catch(err => {
      logNs('WARN', 'Unable to notify learning service about feedback', err.message);
    });
  }

  res.json({ ok: true });
});

// Endpoint to manually add to history (for syncing from other services)
app.post('/history/add', (req, res) => {
  const body = req.body || {};
  if (!body.sender || !body.content) return res.status(400).json({ error: 'sender and content required' });

  const history = loadHistory();
  const msg = {
    direction: body.direction || 'in',
    id: body.id || uuidv4(),
    sender: body.sender,
    content: body.content,
    timestamp: body.timestamp || new Date().toISOString(),
    headers: body.headers || {}
  };
  history.push(msg);
  saveHistory(history);
  res.json({ ok: true, id: msg.id });
});

// Peer Discovery Endpoints
app.get('/peers', (req, res) => {
  try {
    const filterType = req.query.type; // Optional: ?type=Gateway or ?type=VP or ?type=NS
    const peers = peerManager.getAllPeers(filterType);
    const nodeInfo = peerManager.getNodeInfo();
    res.json({
      node: nodeInfo,
      peers: peers,
      count: peers.length,
      filter: filterType || 'none'
    });
  } catch (err) {
    console.error('Error getting peers:', err);
    res.status(500).json({ error: 'Failed to get peers', detail: err.message });
    res.status(500).json({ error: 'Failed to add peer', detail: err.message });
  }
});

app.delete('/peers/:peerId', (req, res) => {
  try {
    const { peerId } = req.params;
    const removed = peerManager.removePeer(peerId);

    if (removed) {
      res.json({ ok: true, message: `Removed peer ${peerId}` });
    } else {
      res.status(404).json({ ok: false, message: `Peer ${peerId} not found` });
    }
  } catch (err) {
    console.error('Error removing peer:', err);
    res.status(500).json({ error: 'Failed to remove peer', detail: err.message });
  }
});

// P2P Message Handler
app.post('/p2p/message', async (req, res) => {
  try {
    const message = req.body;
    const senderIp = req.ip || req.socket.remoteAddress;

    if (!message || !message.type || !message.id) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // Handle the message
    const result = await p2pProtocol.handleMessage(message, senderIp);

    // If it's a block or transaction, process it
    if (message.type === MessageType.NEW_BLOCK && result.processed) {
      // Block will be processed by existing block handling logic
      logNs(`Received block from peer: ${message.payload?.header?.height || 'unknown'}`);
    } else if (message.type === MessageType.NEW_TX && result.processed) {
      // Transaction will be forwarded to gateway
      logNs(`Received transaction from peer: ${message.payload?.type || 'unknown'}`);
    }

    res.json({ ok: true, result });
  } catch (err) {
    console.error('Error handling P2P message:', err);
    res.status(500).json({ error: 'Failed to handle message', detail: err.message });
  }
});

// Gateways config
const GATEWAY_CONFIG = loadGatewayConfig();

function loadGatewayConfig() {
  try {
    // Priority: full JSON config in env var GATEWAY_CONFIG (JSON array), else GATEWAY_URLS comma-separated, else default local gateway
    const cfgEnv = process.env.GATEWAY_CONFIG;
    if (cfgEnv) {
      const arr = JSON.parse(cfgEnv);
      return arr.map((item) => ({ url: item.url, auth: item.auth || null, reachable: false, lastError: null }));
    }
    const urls = (process.env.GATEWAY_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
    const objs = urls.length > 0 ? urls.map(u => ({ url: u, auth: null, reachable: false, lastError: null })) : [{ url: 'http://localhost:8080', auth: null, reachable: false, lastError: null }];
    return objs;
  } catch (e) {
    return [{ url: 'http://localhost:8080', auth: null, reachable: false, lastError: String(e) }];
  }
}

function maskAuth(header) {
  if (!header) return '';
  const parts = (header || '').split(' ');
  if (parts.length === 2) return `${parts[0]} ***`;
  return '***';
}

const STATUS_ENABLED = process.env.STATUS === '1' || process.argv.includes('--status');
let blocksVerified = 0;
let sourcesValidCount = 0;
function logNs(...args) {
  const ts = new Date().toISOString();
  console.log(`[NS][${ts}]`, ...args);
}

// Periodic heartbeat for operator/debugging visibility
if (STATUS_ENABLED) {
  setInterval(async () => {
    try {
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
      logNs(`heartbeat | gateways=${gwStatus} validators=${validatorCount} mempool=${mempoolSize || 'unknown'} height=${getCanonicalHeight()} verifiedBlocks=${blocksVerified} sourcesValid=${sourcesValidCount} uptime=${process.uptime().toFixed(0)}s`);
    } catch (e) {
      logNs('Heartbeat error', e.message);
    }
  }, Number(process.env.STATUS_INTERVAL_MS || 60000));
}

async function publishToGateways(message, headers = {}) {
  const correlationId = headers['x-correlation-id'] || uuidv4();
  let lastError = null;
  for (const gw of GATEWAY_CONFIG) {
    const url = gw.url.replace(/\/$/, '') + '/v1/chat';
    try {
      const forwardHeaders = { 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId };
      if (headers.authorization) forwardHeaders['Authorization'] = headers.authorization;
      if (headers['x-forwarded-for']) forwardHeaders['X-Forwarded-For'] = headers['x-forwarded-for'];
      if (headers['x-forwarded-user']) forwardHeaders['X-Forwarded-User'] = headers['x-forwarded-user'];
      if (gw.auth) {
        if (gw.auth.type === 'jwt') forwardHeaders['Authorization'] = `Bearer ${gw.auth.token}`;
        if (gw.auth.type === 'apiKey') forwardHeaders['X-API-Key'] = gw.auth.key;
      }
      const maskedAuth = maskAuth(forwardHeaders['Authorization']);
      logNs(`Publishing message ${message.id} to gateway ${gw.url} correlation=${correlationId} auth=${maskedAuth}`);
      const controller = new AbortController();
      const timeoutMs = Number(process.env.GATEWAY_REQUEST_TIMEOUT_MS || 5000);
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { method: 'POST', headers: forwardHeaders, body: JSON.stringify(message), signal: controller.signal });
      clearTimeout(timeoutHandle);
      if (res.ok) {
        const prev = gw.reachable;
        gw.reachable = true;
        gw.lastError = null;
        if (!prev) logNs(`Connected to gateway ${gw.url}`);
        else logNs(`Gateway ${gw.url} remains reachable`);
        logNs(`Successfully published message ${message.id} to gateway ${gw.url} correlation=${correlationId}`);
        return { gateway: gw.url, status: 'ok' };
      } else {
        gw.reachable = false;
        gw.lastError = `HTTP ${res.status}`;
        lastError = gw.lastError;
      }
    } catch (err) {
      gw.reachable = false;
      gw.lastError = String(err);
      lastError = gw.lastError;
      logNs('ERROR', `Gateway ${gw.url} failed: ${String(err)}`);
      logNs(`Gateway ${gw.url} error: ${String(err).slice(0, 200)}`);
      if (gw.reachable) {
        logNs(`Disconnected from gateway ${gw.url}, error=${String(err).slice(0, 240)}`);
      }
    }
  }
  logNs(`All gateways failed; lastError=${lastError}`);
  throw new Error(`All gateways failed; lastError=${lastError}`);
}

// Debug gateways endpoint
app.get('/debug/gateways', (req, res) => {
  res.json({ gateways: GATEWAY_CONFIG.map(g => ({ url: g.url, reachable: g.reachable, lastError: g.lastError })) });
});

// Peers endpoint: show known gateway peers & validator peers for simple connectivity checks
app.get('/debug/peers', (req, res) => {
  try {
    const peers = {
      gateways: GATEWAY_CONFIG.map(g => ({ url: g.url, reachable: g.reachable, lastError: g.lastError })),
      validators: Array.from(validators.entries()).map(([id, v]) => ({ validatorId: id, stake: v.stake, slashed: !!v.slashed }))
    };
    res.json({ peers });
  } catch (e) {
    res.json({ peers: null, error: e.message });
  }
});

// For tests, return headers recorded in last message
app.get('/debug/last-headers', (req, res) => {
  // read last response in history and surface headers if present
  try {
    const history = loadHistory();
    const last = history[history.length - 1] || {};
    res.json({ lastHeaders: last.headers || null });
  } catch (e) {
    res.json({ lastHeaders: null });
  }
});

// Debugging endpoint: trigger requeue on configured gateways with provided txs
// Guarded behind NS_ALLOW_REQUEUE_SIM env var to avoid accidental exposure in production
app.post('/debug/requeue', async (req, res) => {
  if (process.env.NS_ALLOW_REQUEUE_SIM !== 'true') return res.status(403).json({ error: 'requeue_debug_disabled' });
  const t = req.body && req.body.txs ? req.body.txs : (Array.isArray(req.body) ? req.body : []);
  if (!Array.isArray(t) || t.length === 0) return res.status(400).json({ error: 'txs array required' });
  try {
    const gw = GATEWAY_CONFIG && GATEWAY_CONFIG.length ? GATEWAY_CONFIG[0] : null;
    if (!gw || !gw.url) return res.status(400).json({ error: 'no_gateway_configured' });
    const url = gw.url.replace(/\/$/, '') + '/v1/mempool/requeue';
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txs: t }) });
    const j = await r.json().catch(() => null);
    if (!r.ok) return res.status(400).json({ error: 'gateway_requeue_failed', status: r.status, body: j });
    logNs(`Debug requeue triggered to ${gw.url} for ${t.length} tx(s)`);
    return res.json({ ok: true, requeued: t.length, result: j });
  } catch (e) {
    return res.status(500).json({ error: 'requeue_exception', message: e.message });
  }
});

// Health endpoint
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

app.get('/history', (req, res) => {
  res.json(loadHistory());
});

// Fetch content by CID via producer's vp-node IPFS endpoint and verify payload integrity
app.post('/ipfs/verify', async (req, res) => {
  const { cid, producerUrl } = req.body || {};
  if (!cid || !producerUrl) return res.status(400).json({ error: 'cid and producerUrl required' });
  try {
    const fetchUrl = `${producerUrl.replace(/\/$/, '')}/ipfs/${cid}`;
    const fetched = await fetch(fetchUrl);
    if (!fetched.ok) return res.status(400).json({ error: 'fetch_failed', status: fetched.status });
    const body = await fetched.json();
    const payloadContent = body && body.content ? body.content : null;
    if (!payloadContent) return res.status(400).json({ error: 'invalid_payload' });
    // validate merkle root and txs if possible
    const fetchedHeader = (payloadContent && payloadContent.payload && payloadContent.payload.header) ? payloadContent.payload.header : (payloadContent && payloadContent.header) || {};
    const fetchedTxs = (payloadContent && payloadContent.payload && payloadContent.payload.txs) ? payloadContent.payload.txs : (payloadContent && payloadContent.txs) || [];
    // verify payload signature if present
    const fetchedSigner = payloadContent && payloadContent.signer ? payloadContent.signer : (fetchedHeader && fetchedHeader.validatorId);
    const fetchedPayloadSig = payloadContent && payloadContent.payloadSignature ? payloadContent.payloadSignature : (payloadContent && payloadContent.payload && payloadContent.payload.payloadSignature ? payloadContent.payload.payloadSignature : null);
    const fetchedIds = (fetchedTxs || []).map(tx => txIdFor(tx));
    const fetchedRoot = computeMerkleRoot(fetchedIds);
    const matches = (fetchedRoot === fetchedHeader.merkleRoot);
    // verify signature if present
    let signatureValid = null;
    try {
      const fetchedSigner = payloadContent && payloadContent.signer ? payloadContent.signer : (fetchedHeader && fetchedHeader.validatorId);
      const fetchedPayloadSig = payloadContent && payloadContent.payloadSignature ? payloadContent.payloadSignature : (payloadContent && payloadContent.payload && payloadContent.payload.payloadSignature ? payloadContent.payload.payloadSignature : null);
      if (fetchedPayloadSig) {
        if (!fetchedSigner || !validators.has(fetchedSigner)) return res.status(400).json({ error: 'signer_not_registered' });
        const pub = validators.get(fetchedSigner).publicKey;
        const payloadObj = payloadContent && payloadContent.payload ? payloadContent.payload : { header: fetchedHeader, txs: fetchedTxs };
        const payloadData = canonicalize(payloadObj);
        signatureValid = verifyEd25519(pub, payloadData, fetchedPayloadSig);
      }
    } catch (e) {
      return res.status(500).json({ error: 'signature_verify_exception', message: e.message });
    }
    const sourcesValid = (fetchedHeader && fetchedHeader.sourcesRoot) ? (computeSourcesRoot(fetchedTxs) === fetchedHeader.sourcesRoot) : null;
    const fetchedOrigins = Array.from(new Set((fetchedTxs || []).flatMap(tx => (tx.sources || []).map(s => s.origin || s.adapter || 'unknown'))));
    res.json({ ok: true, matches, signatureValid, sourcesValid, fetchedHeader, fetchedTxs, fetchedOrigins });
  } catch (e) {
    res.status(500).json({ error: 'verify_exception', message: e.message });
  }
});

// Endpoints for validators & PoS
app.post('/validators/register', (req, res) => {
  const { validatorId, stake = 0, publicKey } = req.body || {};
  if (!validatorId || !publicKey) return res.status(400).json({ error: 'validatorId/publicKey required' });
  if (validators.has(validatorId)) return res.status(400).json({ error: 'already registered' });
  validators.set(validatorId, { stake: Number(stake || 0), publicKey, slashed: false });
  totalStake += Number(stake || 0);
  res.json({ ok: true });
});

app.get('/validators', (req, res) => {
  const arr = [];
  for (const [id, v] of validators.entries()) arr.push({ validatorId: id, stake: v.stake, publicKey: v.publicKey, slashed: !!v.slashed, slashedAt: v.slashedAt || null });
  res.json({ validators: arr, totalStake });
});

app.post('/validators/slash', (req, res) => {
  const { validatorId, amount } = req.body || {};
  if (!validatorId || !amount) return res.status(400).json({ error: 'validatorId/amount required' });
  if (!validators.has(validatorId)) return res.status(400).json({ error: 'not found' });
  const v = validators.get(validatorId);
  const slash = Math.min(Number(amount), v.stake);
  v.stake -= slash;
  totalStake -= slash;
  res.json({ ok: true, slashed: slash, newStake: v.stake });
});

// Submit tx to mempool
app.post('/tx', async (req, res) => {
  const tx = req.body || {};
  // Basic validation: require type and fee
  if (!tx.type || typeof tx.fee !== 'number') return res.status(400).json({ error: 'type and fee required' });
  // verify signature if tx.signedBy is validator
  if (tx.signedBy && validators.has(tx.signedBy)) {
    const v = validators.get(tx.signedBy);
    const data = canonicalize({ ...tx, signature: undefined });
    if (!verifyEd25519(v.publicKey, data, tx.signature)) return res.status(400).json({ error: 'invalid signature' });
  }
  // Forward transaction to configured gateway(s) and do not persist in NS mempool
  try {
    let forwarded = [];
    for (const gw of GATEWAY_CONFIG) {
      const url = gw.url.replace(/\/$/, '') + '/v1/tx';
      try {
        const fwd = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': req.header('x-forwarded-for') || req.socket.remoteAddress || '', 'X-Source': 'ns' }, body: JSON.stringify(tx) });
        if (fwd.ok) {
          const j = await fwd.json().catch(() => null);
          forwarded.push({ url: gw.url, resp: j || true });
          logNs(`Forwarded tx to gateway ${gw.url}`);
          // stop on first successful forward
          break;
        } else {
          forwarded.push({ url: gw.url, error: `HTTP ${fwd.status}` });
        }
      } catch (e) {
        forwarded.push({ url: gw.url, error: e.message });
      }
    }
    if (forwarded.length === 0) return res.status(500).json({ error: 'no_gateways_configured' });
    const ok = forwarded.some(f => f.resp);
    if (!ok) return res.status(502).json({ error: 'forward_failed', forwarded });

    // Broadcast transaction to peers
    const txMessage = p2pProtocol.createMessage(
      MessageType.NEW_TX,
      tx,
      peerManager.nodeId
    );
    p2pProtocol.broadcastMessage(txMessage).catch(err => {
      logNs('Failed to broadcast transaction to peers:', err.message);
    });

    return res.json({ ok: true, forwarded });
  } catch (e) {
    return res.status(500).json({ error: 'forward_exception', message: e.message });
  }
});

app.get('/mempool', async (req, res) => {
  // NS does not keep a mempool; proxy to gateway's mempool for compatibility
  try {
    const gw = GATEWAY_CONFIG && GATEWAY_CONFIG.length ? GATEWAY_CONFIG[0] : null;
    if (!gw || !gw.url) return res.json({ mempool: [] });
    const url = gw.url.replace(/\/$/, '') + '/v1/mempool';
    const r = await fetch(url);
    if (!r.ok) return res.status(500).json({ error: 'gateway_mempool_unavailable', status: r.status });
    const j = await r.json();
    return res.json(j);
  } catch (e) {
    return res.status(500).json({ error: 'proxy_failed', message: e.message });
  }
});

// Governance endpoints
const proposals = new Map(); // id -> { title, yes: number, no: number }
app.post('/governance/proposals', (req, res) => {
  const { id, title } = req.body || {};
  if (!id || !title) return res.status(400).json({ error: 'id and title required' });
  if (proposals.has(id)) return res.status(400).json({ error: 'proposal exists' });
  proposals.set(id, { title, yes: 0, no: 0 });
  res.json({ ok: true });
});

app.post('/governance/vote', (req, res) => {
  const { id, validatorId, yes } = req.body || {};
  if (!id || !validatorId) return res.status(400).json({ error: 'id and validatorId required' });
  if (!proposals.has(id)) return res.status(400).json({ error: 'proposal not found' });
  if (!validators.has(validatorId)) return res.status(400).json({ error: 'validator not found' });
  const v = validators.get(validatorId);
  const weight = Number(v.stake || 0);
  const p = proposals.get(id);
  if (yes) p.yes += weight; else p.no += weight;
  proposals.set(id, p);
  res.json({ ok: true, tally: p });
});

app.get('/governance/proposals/:id', (req, res) => {
  const { id } = req.params;
  if (!proposals.has(id)) return res.status(404).json({ error: 'proposal not found' });
  res.json({ proposal: proposals.get(id) });
});


// Endpoint to produce block proposals from validators (vp-node posts here)
app.post('/blocks/produce', (req, res) => {
  const { header, txs, signature } = req.body || {};
  if (!header || !header.validatorId) return res.status(400).json({ error: 'invalid header' });
  if (!validators.has(header.validatorId)) return res.status(400).json({ error: 'unknown validator' });
  const maybeSlashed = validators.get(header.validatorId) && validators.get(header.validatorId).slashed;
  if (maybeSlashed) return res.status(400).json({ error: 'validator_slashed' });
  const v = validators.get(header.validatorId);
  // canonical data excludes signature key entirely
  const { signature: _sigDrop, ...headerNoSig } = header;
  const data = canonicalize(headerNoSig);
  const verified = verifyEd25519(v.publicKey, data, signature);
  if (!verified) {
    return res.status(400).json({ error: 'invalid header signature' });
  }
  // verify merkle root
  const txIds = (txs || []).map(tx => txIdFor(tx));
  const calcRoot = computeMerkleRoot(txIds);
  if (calcRoot !== header.merkleRoot) return res.status(400).json({ error: 'bad merkle root' });
  // verify sourcesRoot if present
  if (header.sourcesRoot) {
    const srcRoot = computeSourcesRoot(txs);
    if (srcRoot !== header.sourcesRoot) {
      logNs('ERROR', 'Bad sources root computed', srcRoot, 'expected', header.sourcesRoot);
      return res.status(400).json({ error: 'bad_sources_root' });
      // sources root matched
      sourcesValidCount += 1;
    }
  }
  // verify prevHash references any known block (or genesis)
  const parentHash = header.prevHash;
  const genesisPrev = '0'.repeat(64);
  if (parentHash !== genesisPrev && !blockMap.has(parentHash)) return res.status(400).json({ error: 'unknown prevHash' });
  // apply block
  // If a payloadCid is provided in the header, attempt to fetch it from the producer
  // for integrity verification before accepting the block.
  const payloadCid = header.payloadCid || header.cid || null;
  if (payloadCid) {
    const producerUrl = req.header('x-producer-url') || null;
    if (!producerUrl) return res.status(400).json({ error: 'producer_url_required_for_payload_cid' });
    (async () => {
      try {
        const fetchUrl = `${producerUrl.replace(/\/$/, '')}/ipfs/${payloadCid}`;
        const fetched = await fetch(fetchUrl, { method: 'GET' });
        if (!fetched.ok) {
          logNs('ERROR', 'Failed to fetch payloadCid from producer', fetchUrl, fetched.status);
          return res.status(400).json({ error: 'payload_cid_fetch_failed', status: fetched.status });
        }
        const body = await fetched.json();
        const payloadContent = body && body.content ? body.content : null;
        if (!payloadContent) return res.status(400).json({ error: 'invalid_payload_content' });
        // Validate the merkleRoot & txs equality
        const fetchedHeader = payloadContent.header || {};
        const fetchedTxs = payloadContent.txs || [];
        const fetchedSigner = payloadContent && payloadContent.signer ? payloadContent.signer : (fetchedHeader && fetchedHeader.validatorId);
        const fetchedPayloadSig = payloadContent && payloadContent.payloadSignature ? payloadContent.payloadSignature : (payloadContent && payloadContent.payload && payloadContent.payload.payloadSignature ? payloadContent.payload.payloadSignature : null);
        const fetchedSourcesRoot = computeSourcesRoot(fetchedTxs);
        if (header.sourcesRoot && fetchedSourcesRoot !== header.sourcesRoot) {
          logNs('ERROR', 'Payload CID sources root mismatch', fetchedSourcesRoot, header.sourcesRoot);
          return res.status(400).json({ error: 'payload_sources_root_mismatch', fetchedSourcesRoot, expected: header.sourcesRoot });
        }
        const fetchedIds = (fetchedTxs || []).map(tx => txIdFor(tx));
        const fetchedRoot = computeMerkleRoot(fetchedIds);
        if (fetchedRoot !== header.merkleRoot) {
          logNs('ERROR', 'Payload CID merkle root mismatch', fetchedRoot, header.merkleRoot);
          return res.status(400).json({ error: 'payload_cid_merkle_mismatch' });
        }
        // verify signature if present
        if (fetchedPayloadSig) {
          try {
            const signerId = fetchedSigner || header.validatorId;
            if (fetchedSigner && header.validatorId && fetchedSigner !== header.validatorId) {
              logNs('ERROR', 'Payload signer mismatch', fetchedSigner, header.validatorId);
              return res.status(400).json({ error: 'payload_signer_mismatch' });
            }
            if (!signerId || !validators.has(signerId)) return res.status(400).json({ error: 'signer_not_registered' });
            const pv = validators.get(signerId);
            const pubKey = pv.publicKey;
            const payloadObj = payloadContent && payloadContent.payload ? payloadContent.payload : { header: fetchedHeader, txs: fetchedTxs };
            const payloadData = canonicalize(payloadObj);
            const sigValid = verifyEd25519(pubKey, payloadData, fetchedPayloadSig);
            if (!sigValid) return res.status(400).json({ error: 'payload_signature_invalid' });
          } catch (e) {
            logNs('ERROR', 'Error verifying payload signature', e.message);
            return res.status(500).json({ error: 'payload_signature_verify_exception', message: e.message });
          }
        }
        // Fetched content matches - proceed to apply block
        header.signature = signature;
        const block = { header, txs };
        const result = applyBlock(block);
        if (!result.ok) return res.status(400).json({ error: result.reason });
        return res.json({ ok: true, blockHash: result.blockHash });
      } catch (e) {
        logNs('ERROR', 'Error fetching payloadCid', e.message);
        return res.status(400).json({ error: 'payload_cid_fetch_exception', message: e.message });
      }
    })();
    return; // early return while we async-verified
  }
  header.signature = signature;
  const block = { header, txs };
  const result = applyBlock(block);
  if (!result.ok) return res.status(400).json({ error: result.reason });

  // Broadcast block to peers
  const blockMessage = p2pProtocol.createMessage(
    MessageType.NEW_BLOCK,
    { header, txs },
    peerManager.nodeId
  );
  p2pProtocol.broadcastMessage(blockMessage).catch(err => {
    logNs('Failed to broadcast block to peers:', err.message);
  });

  res.json({ ok: true, blockHash: result.blockHash });
});

// Debug endpoint: verify header signature (canonicalize used same way as in produce)
app.post('/debug/verifyHeader', (req, res) => {
  const { header, signature, publicKey } = req.body || {};
  if (!header || !signature || !publicKey) return res.status(400).json({ error: 'header/signature/publicKey required' });
  try {
    const data = canonicalize({ ...header, signature: undefined });
    const ok = verifyEd25519(publicKey, data, signature);
    return res.json({ ok, data });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
});

app.get('/blocks/latest', (req, res) => {
  const b = canonicalTipHash ? blockMap.get(canonicalTipHash) : null;
  res.json({ block: b });
});

app.get('/headers/tip', (req, res) => {
  const h = canonicalTipHash ? blockMap.get(canonicalTipHash).header : null;
  res.json({ header: h });
});

app.get('/chain/height', (req, res) => {
  res.json({ height: getCanonicalHeight() });
});

// SPV proof endpoint
app.get('/proof/:txId', (req, res) => {
  const { txId } = req.params;
  if (!txIndex.has(txId)) return res.status(404).json({ error: 'not found' });
  const { blockHash, txIndex: idx } = txIndex.get(txId);
  const block = blockMap.get(blockHash);
  const txIds = block.txs.map(tx => txIdFor(tx));
  const proof = buildMerkleProof(txIds, txId);
  res.json({ proof, blockHeader: block.header, txIndex: idx });
});

// Verify merkle proof POST {txId, proof, blockHeader}
app.post('/verify/proof', (req, res) => {
  const { txId, proof, blockHeader } = req.body || {};
  if (!txId || !proof || !blockHeader) return res.status(400).json({ error: 'txId, proof, blockHeader required' });
  // recompute merkle root
  try {
    let hBuf = Buffer.from(txId, 'hex');
    for (const p of proof) {
      const siblingBuf = Buffer.from(p.sibling, 'hex');
      const combined = p.position === 'left' ? Buffer.concat([siblingBuf, hBuf]) : Buffer.concat([hBuf, siblingBuf]);
      const hh = sha256Hex(combined);
      hBuf = Buffer.from(hh, 'hex');
    }
    if (hBuf.toString('hex') === blockHeader.merkleRoot) return res.json({ ok: true });
    return res.status(400).json({ ok: false, reason: 'merkle_mismatch' });
  } catch (e) {
    return res.status(400).json({ ok: false, reason: 'invalid_proof', message: e.message });
  }
});


// Simple PoS blockchain state and helpers
// NOTE: ns-node no longer persists a mempool - gateway-node is authoritative for pending txs.
// Gateway mempool is queried by validators (vp-node) when producing blocks.
const blockMap = new Map(); // blockHash -> block {header, txs, blockHash, parentHash, cumWeight, snapshot}
const heads = new Set(); // blockHash candidates for chain tip
let canonicalTipHash = null; // hash of current canonical chain tip
const txIndex = new Map();
const validators = new Map(); // validatorId -> { stake: number, publicKey: string, slashed?: boolean, slashedAt?: number }
let totalStake = 0;

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function canonicalize(obj) {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

function txIdFor(tx) {
  const copy = { ...tx };
  delete copy.signature;
  return sha256Hex(Buffer.from(canonicalize(copy), 'utf8'));
}

function verifyEd25519(publicKeyPem, data, sigBase64) {
  try {
    const pubKey = crypto.createPublicKey(publicKeyPem);
    const sig = Buffer.from(sigBase64, 'base64');
    return crypto.verify(null, Buffer.from(data, 'utf8'), pubKey, sig);
  } catch (e) {
    logNs('ERROR', 'ed25519 verify error', e.message);
    return false;
  }
}

// compute merkle root over tx ids (hex strings)
function computeMerkleRoot(txIds) {
  if (!txIds || txIds.length === 0) return sha256Hex('');
  let layer = txIds.map(id => Buffer.from(id, 'hex'));
  while (layer.length > 1) {
    if (layer.length % 2 === 1) layer.push(layer[layer.length - 1]);
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = layer[i + 1];
      const hash = sha256Hex(Buffer.concat([a, b]));
      next.push(Buffer.from(hash, 'hex'));
    }
    layer = next;
  }
  return layer[0].toString('hex');
}

// computeSourcesRoot() is now centralized in `sources/index.js` and imported at the top of this file

async function chooseCanonicalTipAndReorg() {
  // pick head with maximum cumWeight
  let bestHash = null;
  let bestWeight = -1;
  for (const h of heads) {
    const b = blockMap.get(h);
    if (!b) continue;
    if (b.cumWeight > bestWeight) {
      bestWeight = b.cumWeight; bestHash = h;
    }
  }
  if (!bestHash) return;
  if (canonicalTipHash === bestHash) return; // no change
  // New canonical chain tip found: perform reorg from canonicalTipHash to bestHash
  const oldTip = canonicalTipHash;
  canonicalTipHash = bestHash;
  try {
    await performReorg(oldTip, bestHash);
  } catch (e) {
    logNs(`performReorg error: ${e.message}`);
  }
}

function getBlockAncestors(hash) {
  const ancestors = [];
  let curr = hash;
  while (curr && blockMap.has(curr)) {
    ancestors.push(curr);
    curr = blockMap.get(curr).parentHash;
  }
  return ancestors; // from child up to genesis
}

function findCommonAncestor(hashA, hashB) {
  const aAnc = new Set(getBlockAncestors(hashA));
  let curr = hashB;
  while (curr && blockMap.has(curr)) {
    if (aAnc.has(curr)) return curr;
    curr = blockMap.get(curr).parentHash;
  }
  return null;
}

async function performReorg(oldTipHash, newTipHash) {
  if (!newTipHash) return;
  const ancestor = findCommonAncestor(oldTipHash, newTipHash);
  // rollback blocks from old tip down to ancestor (exclusive)
  const rollbackHashes = [];
  if (oldTipHash) {
    let h = oldTipHash;
    while (h && h !== ancestor) {
      if (!blockMap.has(h)) break;
      rollbackHashes.push(h);
      h = blockMap.get(h).parentHash;
    }
  }
  // accumulate apply chain from ancestor's child to new tip
  const applyHashes = [];
  let h = newTipHash;
  while (h && h !== ancestor) {
    if (!blockMap.has(h)) break;
    applyHashes.push(h);
    h = blockMap.get(h).parentHash;
  }
  applyHashes.reverse();
  // rollback: we will restore validator state to ancestor snapshot if ancestor exists, else genesis
  if (ancestor) {
    const ancBlock = blockMap.get(ancestor);
    const snapArr = ancBlock.snapshot && ancBlock.snapshot.validators ? ancBlock.snapshot.validators : [];
    validators.clear();
    for (const [id, v] of snapArr) validators.set(id, { stake: Number(v.stake), publicKey: v.publicKey });
  } else {
    // ancestor is null (genesis): do not clear global validator registrations here.
    // Keep global validators (registrations) as they are; snapshots are used only
    // for branch-local state during reorgs.
  }
  // rebuild txIndex and mempool: collect txs removed by rollback, clear mempool, then replay canonical chain
  txIndex.clear();
  const removedTxIds = new Set();
  if (rollbackHashes.length > 0) {
    for (const rh of rollbackHashes) {
      const rb = blockMap.get(rh);
      if (!rb) continue;
      for (const t of rb.txs) removedTxIds.add(txIdFor(t));
    }
  }
  // NS does not own a mempool; gateway manages pending txs. No local mempool clearing.
  const requeueCandidates = [];
  // replay blocks from genesis up to ancestor (if any)
  const canonicalPath = [];
  if (ancestor) {
    // get ancestors of ancestor to genesis and reverse
    let at = ancestor;
    const ancestorsWithGen = [];
    while (at) { ancestorsWithGen.push(at); at = blockMap.get(at).parentHash; }
    ancestorsWithGen.reverse();
    for (const bh of ancestorsWithGen) canonicalPath.push(bh);
  }
  // append applyHashes
  canonicalPath.push(...applyHashes);
  // reapply state along canonicalPath
  for (const bh of canonicalPath) {
    const b = blockMap.get(bh);
    // process stake/unstake and txIndex
    for (let i = 0; i < b.txs.length; i++) {
      const tx = b.txs[i];
      const id = txIdFor(tx);
      txIndex.set(id, { blockHash: bh, txIndex: i });
      // gateway manages mempool; NS does not delete consumed txs locally
      if (tx.type === 'stake') {
        if (!validators.has(tx.validatorId)) validators.set(tx.validatorId, { stake: 0, publicKey: tx.publicKey || 'unknown' });
        const vv = validators.get(tx.validatorId);
        vv.stake += Number(tx.amount);
        totalStake += Number(tx.amount);
      }
      if (tx.type === 'unstake') {
        if (validators.has(tx.validatorId)) {
          const vv = validators.get(tx.validatorId);
          const amt = Math.min(Number(tx.amount), vv.stake);
          vv.stake -= amt;
          totalStake -= amt;
        }
      }
    }
    // reward validator
    const totalFees = b.txs.reduce((s, tx) => s + Number(tx.fee || 0), 0);
    const baseReward = Number(process.env.BLOCK_REWARD || 10);
    const reward = baseReward + totalFees;
    const vv = validators.get(b.header.validatorId);
    if (vv) { vv.stake += reward; totalStake += reward; }
  }
  // any removed txs that are NOT now part of the canonical chain should be re-added to mempool
  // but NS is lightweight; instead, request gateway to requeue them
  for (const txId of removedTxIds) {
    if (!txIndex.has(txId)) {
      // we don't have original tx data reconstructed here; instead, leave placeholder or skip
      // Attempt to find tx in blocks for data
      let found = null;
      for (const h of rollbackHashes) {
        const rb = blockMap.get(h);
        if (!rb) continue;
        for (const tx of rb.txs) {
          if (txIdFor(tx) === txId) { found = tx; break; }
        }
        if (found) break;
      }
      // gateway manages re-adding any txs post-reorg; NS does not re-add to mempool
      if (found) requeueCandidates.push(found);
    }
  }
  // update heads: remove tip of old chain and add newTip
  if (oldTipHash) {
    // find any heads from old chain that are no longer heads
    // we'll cleanup by recomputing heads as blocks without children
  }
  // refresh heads set (blocks that have no children)
  const childExists = new Set();
  for (const [hsh, bl] of blockMap.entries()) {
    if (bl.parentHash) childExists.add(bl.parentHash);
  }
  heads.clear();
  for (const [hsh] of blockMap.entries()) if (!childExists.has(hsh)) heads.add(hsh);

  // Send requeue request to gateway for any removed txs that we reconstructed
  if (requeueCandidates.length > 0) {
    try {
      const gw = GATEWAY_CONFIG && GATEWAY_CONFIG.length ? GATEWAY_CONFIG[0] : null;
      if (gw && gw.url) {
        const url = gw.url.replace(/\/$/, '') + '/v1/mempool/requeue';
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txs: requeueCandidates }) });
        if (res.ok) {
          const j = await res.json().catch(() => null);
          logNs(`Requeued ${requeueCandidates.length} tx(s) to gateway ${gw.url} response=${JSON.stringify(j)}`);
        } else {
          logNs(`Failed to requeue txs to ${gw.url} status=${res.status}`);
        }
      }
    } catch (e) {
      logNs(`Exception requeue txs to gateway: ${e.message}`);
    }
  }
}

function buildMerkleProof(txIds, targetIdHex) {
  const idx = txIds.indexOf(targetIdHex);
  if (idx === -1) return null;
  let layer = txIds.map(id => Buffer.from(id, 'hex'));
  let index = idx;
  const proof = [];
  while (layer.length > 1) {
    if (layer.length % 2 === 1) layer.push(layer[layer.length - 1]);
    const pairIndex = index ^ 1;
    const sibling = layer[pairIndex];
    proof.push({ sibling: sibling.toString('hex'), position: pairIndex % 2 === 0 ? 'left' : 'right' });
    // compute next layer
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = layer[i + 1];
      const hash = sha256Hex(Buffer.concat([a, b]));
      next.push(Buffer.from(hash, 'hex'));
    }
    index = Math.floor(index / 2);
    layer = next;
  }
  return proof;
}

function chooseValidator(prevHash, slot) {
  // deterministic selection: seed = sha256(prevHash + slot)
  const seed = sha256Hex(Buffer.from(String(prevHash) + String(slot), 'utf8'));
  const seedNum = parseInt(seed.slice(0, 12), 16);
  if (totalStake === 0) return null;
  const r = seedNum % totalStake;
  let acc = 0;
  for (const [id, v] of validators.entries()) {
    acc += Number(v.stake || 0);
    if (r < acc) return id;
  }
  return null;
}

function getCanonicalHeight() {
  let h = canonicalTipHash;
  let height = 0;
  while (h && blockMap.has(h)) {
    height += 1;
    h = blockMap.get(h).parentHash;
  }
  return height;
}

function applyBlock(block) {
  // Verify merkle root
  const txIds = block.txs.map(tx => txIdFor(tx));
  const calcRoot = computeMerkleRoot(txIds);
  if (calcRoot !== block.header.merkleRoot) return { ok: false, reason: 'bad_merkle' };
  // verify validator registration
  const validatorId = block.header.validatorId;
  if (!validators.has(validatorId)) return { ok: false, reason: 'unknown_validator' };
  const v = validators.get(validatorId);
  // verify header signature using ed25519 public key
  // Build canonical header data excluding the signature key entirely to match signing input.
  const { signature: _sigIgnored, ...headerNoSig } = block.header;
  const headerData = canonicalize(headerNoSig);
  const sigPreview = (block.header.signature || '').toString().slice(0, 32);
  logNs('DEBUG', 'Verifying header signature validator=', validatorId, 'sigPreview=', sigPreview);
  const verified = verifyEd25519(v.publicKey, headerData, block.header.signature);
  if (!verified) {
    logNs('DEBUG', 'Signature verification failed headerDataLength=', headerData.length);
    return { ok: false, reason: 'bad_sig' };
  }
  // verify prevHash references a known parent or genesis
  const parentHash = block.header.prevHash;
  const genesisPrev = '0'.repeat(64);
  let parent = null;
  if (parentHash !== genesisPrev) {
    if (!blockMap.has(parentHash)) return { ok: false, reason: 'unknown_parent' };
    parent = blockMap.get(parentHash);
  }
  // determine the slot based on parent height
  const parentHeight = parent ? getBlockAncestors(parentHash).length : 0;
  const slot = parentHeight + 1;
  const eligible = chooseValidator(parentHash, slot);
  if (eligible !== validatorId) {
    logNs('WARN', `Warning: validator ${validatorId} proposed block for slot ${slot} but deterministic selection was ${eligible}; accepting anyway (fork support)`);
    // allow forks: do not reject; accept validly-signed blocks even if not selected
  }
  // compute block hash and parent
  const blockHash = sha256Hex(Buffer.from(canonicalize(block.header), 'utf8'));
  block.blockHash = blockHash;
  block.parentHash = parentHash;
  // compute cumulative weight with respect to parent's snapshot state
  const parentWeight = parent ? parent.cumWeight : 0;
  // compute snapshot base as parent's snapshot if available, else current validators
  const baseSnapArr = parent ? JSON.parse(JSON.stringify(parent.snapshot.validators)) : JSON.parse(JSON.stringify(Array.from(validators.entries())));
  // find validator stake from base snapshot
  let vStake = 0;
  for (const [id, vs] of baseSnapArr) {
    if (id === validatorId) { vStake = Number(vs.stake || 0); break; }
  }
  block.cumWeight = parentWeight + (Number(vStake) || 0);
  // copy snapshot without mutating global state for branch blocks
  const snapshot = { validators: JSON.parse(JSON.stringify(baseSnapArr)) };
  blockMap.set(blockHash, block);
  heads.add(blockHash);
  let totalFees = 0;
  // determine if the block extends the current canonical tip (and therefore should update global state)
  const extendsCanonical = (parentHash === canonicalTipHash);
  const consumedIds = [];
  for (let i = 0; i < block.txs.length; i++) {
    const id = txIdFor(block.txs[i]);
    if (extendsCanonical) {
      txIndex.set(id, { blockHash, txIndex: i });
      consumedIds.push(id);
    }
    totalFees += Number(block.txs[i].fee || 0);
    // process stake/unstake
    const tx = block.txs[i];
    if (tx.type === 'stake' && tx.validatorId && Number(tx.amount)) {
      const target = tx.validatorId;
      if (extendsCanonical) {
        if (!validators.has(target)) validators.set(target, { stake: 0, publicKey: tx.publicKey || 'unknown' });
        const vv = validators.get(target);
        vv.stake += Number(tx.amount);
        totalStake += Number(tx.amount);
      } else {
        // apply to snapshot validators
        const idx = snapshot.validators.findIndex(([id]) => id === target);
        if (idx === -1) snapshot.validators.push([target, { stake: Number(tx.amount), publicKey: tx.publicKey || 'unknown' }]);
        else snapshot.validators[idx][1].stake += Number(tx.amount);
      }
    }
    if (tx.type === 'unstake' && tx.validatorId && Number(tx.amount)) {
      const target = tx.validatorId;
      if (extendsCanonical) {
        if (validators.has(target)) {
          const vv = validators.get(target);
          const amt = Math.min(Number(tx.amount), vv.stake);
          vv.stake -= amt;
          totalStake -= amt;
        }
      } else {
        const idx = snapshot.validators.findIndex(([id]) => id === target);
        if (idx !== -1) {
          const vv = snapshot.validators[idx][1];
          const amt = Math.min(Number(tx.amount), vv.stake);
          vv.stake -= amt;
        }
      }
    }
  }
  // reward validator
  const baseReward = Number(process.env.BLOCK_REWARD || 10);
  const reward = baseReward + totalFees;
  if (extendsCanonical) {
    v.stake += reward;
    totalStake += reward;
  } else {
    // update snapshot validator
    const idx = snapshot.validators.findIndex(([id]) => id === validatorId);
    if (idx !== -1) snapshot.validators[idx][1].stake += reward;
  }
  // If we have consumed txs as part of this accepted canonical block, notify the gateway
  if (consumedIds.length > 0) {
    (async () => {
      try {
        const gw = GATEWAY_CONFIG && GATEWAY_CONFIG.length ? GATEWAY_CONFIG[0] : null;
        if (gw && gw.url) {
          const url = gw.url.replace(/\/$/, '') + '/v1/mempool/consume';
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: consumedIds }) });
          if (res.ok) {
            logNs(`Notified gateway to consume ${consumedIds.length} tx(s)`);
          } else {
            logNs(`Gateway consume call failed status=${res.status} for ${consumedIds.length} tx(s)`);
          }
        }
      } catch (e) { logNs(`Error notifying gateway to consume txs: ${e.message}`); }
    })();
  }
  // If this block extended canonical chain, update the stored snapshot to reflect post-block validators
  if (extendsCanonical) {
    block.snapshot = { validators: JSON.parse(JSON.stringify(Array.from(validators.entries()))) };
  } else {
    block.snapshot = snapshot;
    // detect equivocation: if same validator produced another block with same parentHash
    const equivocations = [];
    for (const [h, bl] of blockMap.entries()) {
      if (bl.parentHash === parentHash && bl.header && bl.header.validatorId === validatorId && bl.blockHash && bl.blockHash !== blockHash) {
        equivocations.push(bl);
      }
    }
    if (equivocations.length > 0) {
      // slash the validator
      const slashPct = Number(process.env.SLASH_PERCENT || 50);
      function doSlash(id) {
        if (!validators.has(id)) return;
        const vv = validators.get(id);
        if (vv.slashed) return; // only once
        const toSlash = Math.min(vv.stake, Math.floor((vv.stake * slashPct) / 100));
        vv.stake -= toSlash;
        totalStake -= toSlash;
        vv.slashed = true;
        vv.slashedAt = Date.now();
        logNs('WARN', `Slashed validator ${id} by ${toSlash} (${slashPct}%) due to equivocation`);
      }
      doSlash(validatorId);
      // also slash any other duplicated equivocation across the network (not typical)
      for (const eq of equivocations) {
        if (eq.header && eq.header.validatorId) doSlash(eq.header.validatorId);
      }
    }
  }
  // After applying, choose new canonical tip and possibly reorg
  chooseCanonicalTipAndReorg();
  return { ok: true, blockHash };
}


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  logNs('NS node started, verifying blocks');
  logNs(`Listening at http://localhost:${PORT}`);
  logNs('Health endpoint available at /health');
  logNs(`Open your browser at http://localhost:${PORT} to start chatting`);

  // Start HTTPS server for encrypted P2P communication
  startHTTPSServer(app, PORT, 'NS', peerManager.nodeId).then(httpsServer => {
    if (httpsServer) {
      logNs(`HTTPS server enabled on port ${PORT + 1}`);
    }
  }).catch(err => {
    logNs(`HTTPS server failed: ${err.message}`);
  });
});

server.on('connection', (socket) => {
  const remote = `${socket.remoteAddress}:${socket.remotePort}`;
  logNs(`Connection from ${remote}`);
  socket.on('close', () => logNs(`Connection closed ${remote}`));
});

// Standardized crash handling: log and exit so the CMD window remains open for diagnostics
process.on('uncaughtException', (err) => {
  try { logNs('ERROR: Node crashed | reason=' + (err && err.message ? err.message : String(err))); } catch (e) { console.error('ERROR: Node crashed', err && err.message ? err.message : String(err)); }
  try { logNs(err && err.stack ? err.stack : err); } catch (e) { console.error(err && err.stack ? err.stack : err); }
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  try { logNs('ERROR: Node crashed | reason=' + (reason && reason.message ? reason.message : String(reason))); } catch (e) { console.error('ERROR: Node crashed', reason); }
  process.exit(1);
});

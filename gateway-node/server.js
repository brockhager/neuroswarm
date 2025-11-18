import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const PORT = process.env.PORT || 8080;

function ts() { return new Date().toISOString(); }
console.log(`[${ts()}] gateway-node starting on port ${PORT}`);
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

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

app.post('/v1/chat', (req, res) => {
  const body = req.body || {};
  const sender = body.sender || 'user';
  const content = body.content || '';
  const auth = req.header('authorization') || '';
  const correlation = req.header('x-correlation-id') || uuidv4();

  if (!content) return res.status(400).json({ error: 'content is required' });

  const now = new Date().toISOString();
  const inMsg = { id: uuidv4(), sender, content, timestamp: now, correlation };
  const response = { id: uuidv4(), sender: 'gateway', content: `forwarded: ${content}`, timestamp: new Date().toISOString() };

  const history = loadHistory();
  const incomingHeaders = { authorization: auth, 'x-forwarded-for': req.header('x-forwarded-for') || null, 'x-forwarded-user': req.header('x-forwarded-user') || null };
  history.push({ direction: 'in', ...inMsg, headers: incomingHeaders });
  history.push({ direction: 'out', ...response, headers: incomingHeaders, gateway: 'self' });
  saveHistory(history);

  function maskAuth(header) {
    if (!header) return '';
    const parts = (header || '').split(' ');
    if (parts.length === 2) return `${parts[0]} ***`;
    return '***';
  }
  const maskedAuth = maskAuth(auth);
  console.log(`[GATEWAY-${process.pid}] Received message ${inMsg.id} correlation=${correlation} from ${sender} auth=${maskedAuth}`);
  return res.json(response);
});

// Gateway mempool ownership: canonical schema and endpoints
const gwMempool = new Map(); // id -> entry
let gwSpamRejected = 0;
// rate limiting map: ip -> { windowStart, count }
const rateMap = new Map();
const RATE_LIMIT = Number(process.env.GATEWAY_RATE_LIMIT || 20); // messages per window
const RATE_WINDOW_MS = Number(process.env.GATEWAY_RATE_WINDOW_MS || 10000);

function createMempoolEntry(tx) {
  const id = crypto.createHash('sha256').update(JSON.stringify({ ...tx, signature: undefined })).digest('hex');
  return { txId: id, type: tx.type, payload: tx, fee: Number(tx.fee || 0), timestamp: Date.now(), status: 'pending' };
}

function checkRateLimit(ip) {
  const now = Date.now();
  const r = rateMap.get(ip) || { windowStart: now, count: 0 };
  if (now - r.windowStart > RATE_WINDOW_MS) { r.windowStart = now; r.count = 0; }
  r.count += 1;
  rateMap.set(ip, r);
  return r.count <= RATE_LIMIT;
}

app.post('/v1/tx', async (req, res) => {
  const tx = req.body || {};
  const remoteIP = req.header('x-forwarded-for') || req.socket.remoteAddress || 'unknown';
  const src = req.header('x-source') || 'client';
  if (!tx.type || typeof tx.fee !== 'number') { gwSpamRejected += 1; logGw(`Rejected tx from ${remoteIP} (${src}) missing type/fee`); return res.status(400).json({ error: 'type and fee required' }); }
  // rate limit
  if (!checkRateLimit(remoteIP)) { gwSpamRejected += 1; logGw(`Rejected tx from ${remoteIP} (${src}) due to rate limit`); return res.status(429).json({ error: 'rate_limited' }); }
  // spam filter: fee
  if (tx.fee < Number(process.env.MIN_FEE || 1)) { gwSpamRejected += 1; logGw(`Rejected tx from ${remoteIP} (${src}) insufficient fee ${tx.fee}`); return res.status(400).json({ error: 'insufficient_fee' }); }
  // duplicate check
  const entry = createMempoolEntry(tx);
  if (gwMempool.has(entry.txId)) { gwSpamRejected += 1; logGw(`Rejected duplicate tx ${entry.txId} from ${remoteIP} (${src})`); return res.status(409).json({ error: 'duplicate' }); }
  // accept
  gwMempool.set(entry.txId, entry);
  logGw(`Accepted tx ${entry.txId} from ${remoteIP} (${src}) type=${entry.type} fee=${entry.fee}`);
  res.json({ ok: true, txId: entry.txId });
});

app.get('/v1/mempool', (req, res) => {
  const arr = [];
  for (const [id, entry] of gwMempool.entries()) arr.push({ id, txId: id, type: entry.type, fee: entry.fee, timestamp: entry.timestamp, status: entry.status, payload: entry.payload });
  res.json({ mempool: arr });
});

// Mempool stats endpoint
app.get('/v1/stats', (req, res) => {
  res.json({ mempoolSize: gwMempool.size, spamRejected: gwSpamRejected, rateLimiters: Array.from(rateMap.keys()).length });
});

// Mark txs as consumed (e.g., when vp-node produces blocks)
app.post('/v1/mempool/consume', (req, res) => {
  const ids = req.body && (req.body.ids || req.body) || [];
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  let removed = 0;
  for (const id of ids) {
    if (gwMempool.has(id)) { gwMempool.delete(id); removed += 1; logGw(`Consumed tx ${id}`); }
  }
  res.json({ ok: true, removed });
});

app.get('/debug/last-message', (req, res) => {
  try {
    const history = loadHistory();
    const last = history[history.length - 1] || null;
    res.json({ last });
  } catch (e) {
    res.json({ last: null });
  }
});

// Peers endpoint: report ns-node url and its health
app.get('/debug/peers', async (req, res) => {
  try {
    const ns = NS_NODE_URL || null;
    let nsOk = false;
    if (ns) nsOk = await checkNsNodeHealth(ns, 1);
    res.json({ peers: { nsNode: ns, nsOk }, mempoolSize: gwMempool.size });
  } catch (e) {
    res.json({ peers: null, error: e.message });
  }
});

app.get('/history', (req, res) => {
  res.json(loadHistory());
});

app.get('/', (req, res) => {
  res.send('<html><body><h1>Gateway Node</h1></body></html>');
});

// Health endpoint for the gateway
let GW_VERSION = '0.1.0';
try {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pj = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    GW_VERSION = pj.version || GW_VERSION;
  }
} catch (e) {
  // ignore
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: GW_VERSION, uptime: process.uptime() });
});

async function pingUrl(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function checkNsNodeHealth(nsUrl, maxRetries = 5) {
  const healthUrl = nsUrl.replace(/\/$/, '') + '/health';
  let attempt = 0;
  let delay = 500;
  while (attempt < maxRetries) {
    attempt++;
    console.log(`[GATEWAY] Checking ns-node health attempt ${attempt} -> ${healthUrl}`);
    const ok = await pingUrl(healthUrl);
    if (ok) return true;
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2; // exponential backoff
  }
  return false;
}

const NS_NODE_URL = process.env.NS_NODE_URL || null;
const NS_CHECK_RETRIES = Number(process.env.NS_CHECK_RETRIES || 5);
const NS_CHECK_INITIAL_DELAY_MS = Number(process.env.NS_CHECK_INITIAL_DELAY_MS || 500);
const NS_CHECK_MAX_DELAY_MS = Number(process.env.NS_CHECK_MAX_DELAY_MS || 30000);
const NS_CHECK_EXIT_ON_FAIL = (process.env.NS_CHECK_EXIT_ON_FAIL === 'true');
let nsReachable = false;
const STATUS_ENABLED = process.env.STATUS === '1' || process.argv.includes('--status');
function logGw(...args) { const ts = new Date().toISOString(); console.log(`[GATEWAY] [${ts}]`, ...args); }

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function startServer() {
  if (NS_NODE_URL) {
    // Attempt a quick initial check, but do not exit on failure: start the server and retry
    nsReachable = await checkNsNodeHealth(NS_NODE_URL, 1);
    if (!nsReachable) {
      console.warn(`[GATEWAY] ns-node ${NS_NODE_URL} is unreachable initially; starting gateway and retrying with backoff (retries=${NS_CHECK_RETRIES}).`);
    } else {
      logGw(`Connected to ns-node ${NS_NODE_URL}`);
    }
  }
  const server = app.listen(PORT, () => {
      console.log(`[${ts()}] Listening at http://localhost:${PORT}`);
      console.log(`[${ts()}] Health endpoint available at /health`);
    });

  server.on('connection', (socket) => {
    const remote = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[${ts()}] Connection from ${remote}`);
    socket.on('close', () => console.log(`[${ts()}] Connection closed ${remote}`));
  });

  // If ns not reachable, retry in background using exponential backoff
  if (NS_NODE_URL && !nsReachable) {
    (async () => {
      let attempt = 0;
      let delay = NS_CHECK_INITIAL_DELAY_MS;
      while (attempt < NS_CHECK_RETRIES && !nsReachable) {
        attempt += 1;
        console.log(`[GATEWAY] Retry ${attempt}/${NS_CHECK_RETRIES} to check ns-node ${NS_NODE_URL} after ${delay}ms...`);
        await sleep(delay);
        const prev = nsReachable;
        nsReachable = await checkNsNodeHealth(NS_NODE_URL, 1);
        if (!prev && nsReachable) {
          logGw(`Connected to ns-node ${NS_NODE_URL} on retry ${attempt}`);
        }
        if (prev && !nsReachable) {
          logGw(`Disconnected from ns-node ${NS_NODE_URL} on retry ${attempt}`);
        }
        if (nsReachable) {
          logGw(`ns-node ${NS_NODE_URL} is now reachable`);
          break;
        }
        delay = Math.min(delay * 2, NS_CHECK_MAX_DELAY_MS);
      }
      if (!nsReachable) {
        const msg = `[GATEWAY] ns-node ${NS_NODE_URL} still unreachable after ${NS_CHECK_RETRIES} attempts.`;
        if (NS_CHECK_EXIT_ON_FAIL) {
          console.error(msg, 'Exiting due to NS_CHECK_EXIT_ON_FAIL=true');
          process.exit(1);
        } else {
          console.warn(msg, 'Continuing with degraded functionality.');
        }
      }
    })();
  }

// Periodic heartbeat status logs
if (STATUS_ENABLED) {
  setInterval(() => {
    try {
      const mempoolSize = gwMempool ? gwMempool.size : 0;
      logGw(`Heartbeat: ns=${NS_NODE_URL} nsReachable=${nsReachable} mempoolSize=${mempoolSize}`);
    } catch (e) { console.error('[GATEWAY] Heartbeat error', e.message); }
  }, Number(process.env.STATUS_INTERVAL_MS || 30000));
}
}

startServer();

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 8080;
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

// Minimal gateway mempool admission + forward /v1/tx to ns-node
const gwMempool = new Map();
app.post('/v1/tx', async (req, res) => {
  const tx = req.body || {};
  if (!tx.type || typeof tx.fee !== 'number') return res.status(400).json({ error: 'type and fee required' });
  // simple admission: fee >= 1
  if (tx.fee < Number(process.env.MIN_FEE || 1)) return res.status(400).json({ error: 'insufficient_fee' });
  // Quick CID reachability check if CID present
  if (tx.cid) {
    try {
      const c = await fetch(String(tx.cid));
      if (!c.ok) console.warn('CID not reachable: ', tx.cid);
    } catch(e) {
      console.warn('CID check error', e.message);
    }
  }
  // add to local mempool and forward to ns-node
  const id = require('crypto').createHash('sha256').update(JSON.stringify({ ...tx, signature: undefined })).digest('hex');
  gwMempool.set(id, tx);
  // forward to ns-node if configured
  const NS_NODE_URL = process.env.NS_NODE_URL || 'http://localhost:3000';
  try {
    const fwd = await fetch(NS_NODE_URL + '/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx) });
    const j = await fwd.json();
    res.json({ ok: true, fwd: j });
  } catch (e) {
    res.status(500).json({ error: 'forward_failed', message: e.message });
  }
});

app.get('/v1/mempool', (req, res) => {
  const arr = [];
  for (const [id, tx] of gwMempool.entries()) arr.push({ id, tx });
  res.json({ mempool: arr });
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

app.get('/history', (req, res) => {
  res.json(loadHistory());
});

app.get('/', (req, res) => {
  res.send('<html><body><h1>Gateway Node</h1></body></html>');
});

// Health endpoint for the gateway
let GW_VERSION = 'dev';
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
async function startServer() {
  if (NS_NODE_URL) {
    const ok = await checkNsNodeHealth(NS_NODE_URL, Number(process.env.NS_CHECK_RETRIES || 5));
    if (!ok) {
      console.error(`[GATEWAY] ns-node ${NS_NODE_URL} is unreachable after retries - exiting`);
      process.exit(1);
    }
  }
  app.listen(PORT, () => {
    console.log(`Gateway node listening on http://localhost:${PORT}`);
  });
}

startServer();

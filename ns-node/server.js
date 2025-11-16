import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.post('/chat', (req, res) => {
  const body = req.body || {};
  const sender = body.sender || 'user';
  const content = body.content || '';
  const auth = req.header('authorization') || '';

  if (!content) return res.status(400).json({ error: 'content is required' });

  const now = new Date().toISOString();
  const inMsg = { id: uuidv4(), sender, content, timestamp: now };

  // Simple echo agent: respond with an echoed content
  const response = {
    id: uuidv4(),
    sender: 'agent',
    content: `Echoing: ${content}`,
    timestamp: new Date().toISOString(),
    ...fakeProvenance()
  };

  const history = loadHistory();
  history.push({ direction: 'in', ...inMsg, headers: { authorization: auth } });
  history.push({ direction: 'out', ...response, headers: { authorization: auth } });
  saveHistory(history);

  // Try to publish message to configured gateways in order (primary first)
  publishToGateways({ id: response.id, sender: response.sender, content: response.content, timestamp: response.timestamp })
    .catch((err) => {
      console.error('Failed to publish to gateways:', err);
    });

  res.json(response);
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
    const objs = urls.length > 0 ? urls.map(u => ({ url: u, auth: null, reachable: false, lastError: null })) : [{ url: 'http://localhost:3000', auth: null, reachable: false, lastError: null }];
    return objs;
  } catch (e) {
    return [{ url: 'http://localhost:3000', auth: null, reachable: false, lastError: String(e) }];
  }
}

async function publishToGateways(message) {
  const correlationId = uuidv4();
  let lastError = null;
  for (const gw of GATEWAY_CONFIG) {
    const url = gw.url.replace(/\/$/, '') + '/v1/chat';
    try {
      const headers = { 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId };
      if (gw.auth) {
        if (gw.auth.type === 'jwt') headers['Authorization'] = `Bearer ${gw.auth.token}`;
        if (gw.auth.type === 'apiKey') headers['X-API-Key'] = gw.auth.key;
      }
      console.log(`[NS-NODE] Publishing message ${message.id} to gateway ${gw.url} correlation=${correlationId}`);
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(message) });
      if (res.ok) {
        gw.reachable = true;
        gw.lastError = null;
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
      console.error(`[NS-NODE] Gateway ${gw.url} failed: ${err}`);
    }
  }
  throw new Error(`All gateways failed; lastError=${lastError}`);
}

// Debug gateways endpoint
app.get('/debug/gateways', (req, res) => {
  res.json({ gateways: GATEWAY_CONFIG.map(g => ({ url: g.url, reachable: g.reachable, lastError: g.lastError })) });
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

app.get('/history', (req, res) => {
  res.json(loadHistory());
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('ns-node local server started on http://localhost:' + PORT);
  console.log('Open your browser at http://localhost:' + PORT + ' to start chatting');
});

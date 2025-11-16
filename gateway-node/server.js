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
  history.push({ direction: 'in', ...inMsg, headers: { authorization: auth } });
  history.push({ direction: 'out', ...response, headers: { authorization: auth }, gateway: 'self' });
  saveHistory(history);

  console.log(`[GATEWAY-${process.pid}] Received message ${inMsg.id} correlation=${correlation} from ${sender}`);
  return res.json(response);
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

app.listen(PORT, () => {
  console.log(`Gateway node listening on http://localhost:${PORT}`);
});

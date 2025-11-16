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
  history.push({ direction: 'in', ...inMsg });
  history.push({ direction: 'out', ...response });
  saveHistory(history);

  res.json(response);
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

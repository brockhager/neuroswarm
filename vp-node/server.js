import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import express from 'express';

const NS_URL = process.env.NS_NODE_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 4000;
const VAL_ID = process.env.VALIDATOR_ID || 'val-' + uuidv4();
let PRIVATE_KEY_PEM = process.env.VALIDATOR_PRIVATE_KEY || null;
let PUBLIC_KEY_PEM = process.env.VALIDATOR_PUBLIC_KEY || null;
const INTERVAL_MS = Number(process.env.VP_INTERVAL_MS || 3000);
const MAX_TX = Number(process.env.VP_MAX_TX || 100);

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const STATUS_ENABLED = process.env.STATUS === '1' || process.argv.includes('--status');
function ts() { return new Date().toISOString(); }
console.log(`[${ts()}] vp-node starting on port ${PORT}`);
if (STATUS_ENABLED) console.log(`[${ts()}] vp-node heartbeat enabled (interval ${Number(process.env.STATUS_INTERVAL_MS || 30000)}ms)`);
function logVp(...args) { const _ts = new Date().toISOString(); console.log(`[${_ts}] [VP-NODE]`, ...args); }
let lastProduceSuccess = null;
let nsReachable = false;

async function pingNsHealth() {
  try {
    const res = await fetch(NS_URL + '/health');
    return res.ok;
  } catch (e) {
    return false;
  }
}

if (STATUS_ENABLED) {
  // periodic heartbeat
  setInterval(async () => {
    try {
      const nsOk = await pingNsHealth();
      nsReachable = nsOk;
      logVp(`Heartbeat: ns=${NS_URL} nsReachable=${nsOk} lastProduceSuccess=${lastProduceSuccess} validator=${VAL_ID}`);
    } catch (e) { console.error('[VP-NODE] Heartbeat error', e.message); }
  }, Number(process.env.STATUS_INTERVAL_MS || 30000));
}

function canonicalize(obj) {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

function signEd25519PrivateKey(privateKeyPem, data) {
  const priv = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(data, 'utf8'), priv);
  return sig.toString('base64');
}

function txIdFor(tx) {
  const copy = { ...tx };
  delete copy.signature;
  return crypto.createHash('sha256').update(canonicalize(copy)).digest('hex');
}

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

async function register() {
  if (!PRIVATE_KEY_PEM) {
    // generate key pair
    const keypair = crypto.generateKeyPairSync('ed25519');
    PRIVATE_KEY_PEM = keypair.privateKey.export({ type: 'pkcs8', format: 'pem' });
    PUBLIC_KEY_PEM = keypair.publicKey.export({ type: 'spki', format: 'pem' });
  } else if (!PUBLIC_KEY_PEM) {
    // compute public from private
    const priv = crypto.createPrivateKey(PRIVATE_KEY_PEM);
    const pub = crypto.createPublicKey(priv);
    PUBLIC_KEY_PEM = pub.export({ type: 'spki', format: 'pem' });
  }
  try {
    const res = await fetch(NS_URL + '/validators/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ validatorId: VAL_ID, publicKey: PUBLIC_KEY_PEM, stake: Number(process.env.INIT_STAKE || 10) }) });
    const j = await res.json();
    logVp('register:', j);
  } catch (e) {
    console.error('[VP-NODE] register error', e.message);
  }
}

function pickValidator(validators, slot, prevHash) {
  // pick using deterministic seed based on slot and last header
  if (!validators || validators.length === 0) return null;
  const total = validators.reduce((s, v) => s + Number(v.stake || 0), 0);
  if (total === 0) return null;
  // seed from prevHash+slot
  const seed = Number('0x' + sha256Hex(String(prevHash) + String(slot)).slice(0, 12));
  const r = seed % total;
  let acc = 0;
  for (const v of validators) {
    acc += Number(v.stake || 0);
    if (r < acc) return v;
  }
  return validators[validators.length - 1];
}

async function produceLoop() {
  try {
    const m = await fetch(NS_URL + '/mempool');
    const mp = await m.json();
    const txs = (mp.mempool || []).slice(0, MAX_TX).map(entry => entry.tx);

    const head = await (await fetch(NS_URL + '/headers/tip')).json();
    const prev = head.header || null;
    const heightResp = await (await fetch(NS_URL + '/chain/height')).json();
    const slot = (heightResp.height || 0) + 1;
    const validatorsResp = await (await fetch(NS_URL + '/validators')).json();
    const prevHash = prev ? sha256Hex(canonicalize(prev)) : '0'.repeat(64);
    const chosen = await pickValidator(validatorsResp.validators, slot, prevHash);
    if (!chosen) {
      console.log('no eligible validator');
      return;
    }
    if (chosen.validatorId !== VAL_ID) {
      // not our turn
      return;
    }
    const txIds = txs.map(tx => txIdFor(tx));
    const merkleRoot = computeMerkleRoot(txIds);
    const header = { version: 1, prevHash: prev ? sha256Hex(canonicalize(prev)) : '0'.repeat(64), merkleRoot, timestamp: Date.now(), validatorId: VAL_ID, stakeWeight: Number(chosen.stake || 0) };
    const headerData = canonicalize(header);
    const sig = signEd25519PrivateKey(PRIVATE_KEY_PEM, headerData);
    const res = await fetch(NS_URL + '/blocks/produce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ header, txs, signature: sig }) });
    const j = await res.json();
    if (j && j.ok) {
      logVp('produce ok:', j);
      lastProduceSuccess = true;
    } else {
      console.warn('[VP-NODE] produce failed:', j);
      lastProduceSuccess = false;
    }
    // Optionally pin any tx.cid to IPFS pinning endpoint
    const IPFS_PIN = process.env.IPFS_PIN_URL;
    if (IPFS_PIN) {
      for (const tx of txs) {
        if (tx.cid) {
          try {
            await fetch(IPFS_PIN + '/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid: tx.cid }) });
            console.log('pinned', tx.cid);
          } catch (e) {
            console.warn('pin error', e.message);
          }
        }
      }
    }
  } catch (e) {
    console.error('[VP-NODE] vp err', e.message);
    logVp(`Error in produceLoop: ${e.message.slice(0,200)}`);
    lastProduceSuccess = false;
  }
}

async function main() {
  await register();
  setInterval(produceLoop, INTERVAL_MS);
}

// Health endpoint for VP (consistency with other nodes)
let VP_VERSION = '0.1.0';
try {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pj = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    VP_VERSION = pj.version || VP_VERSION;
  }
} catch (e) {
  // ignore
}
import express from 'express';
const app = express();
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VP_VERSION, uptime: process.uptime() });
});

const server = app.listen(PORT, () => {
  console.log(`[${ts()}] Listening at http://localhost:${PORT}`);
  console.log(`[${ts()}] Health endpoint available at /health`);
});

server.on('connection', (socket) => {
  const remote = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[${ts()}] Connection from ${remote}`);
  socket.on('close', () => console.log(`[${ts()}] Connection closed ${remote}`));
});

main();

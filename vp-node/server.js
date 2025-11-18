import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { computeSourcesRoot } from '../sources/index.js';
import { create as ipfsHttpClient } from 'ipfs-http-client';

const NS_URL = process.env.NS_NODE_URL || 'http://localhost:3000';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
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
let ipfs = null;
let ipfsPeer = null;
let ipfsConnected = false;

async function pingNsHealth() {
  try {
    const res = await fetch(NS_URL + '/health');
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function pingGateway() {
  try {
    const res = await fetch(GATEWAY_URL + '/health');
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function initIpfs() {
  const ipfsApi = process.env.IPFS_API || 'http://localhost:5001';
  try {
    // ipfs-http-client v59 uses create()
    ipfs = ipfsHttpClient({ url: ipfsApi });
    const id = await ipfs.id();
    ipfsPeer = id && id.id ? id.id : null;
    ipfsConnected = !!ipfsPeer;
    if (ipfsConnected) logVp(`vp-node connected to IPFS peer ${ipfsPeer}`);
  } catch (e) {
    ipfsConnected = false;
    console.warn('[VP-NODE] IPFS not available at', ipfsApi, '-', e.message);
  }
}

if (STATUS_ENABLED) {
  // periodic heartbeat
  setInterval(async () => {
    try {
      const nsOk = await pingNsHealth();
      nsReachable = nsOk;
      const gwOk = await pingGateway();
      logVp(`Heartbeat: ns=${NS_URL} nsReachable=${nsOk} gateway=${GATEWAY_URL} gatewayOk=${gwOk} lastProduceSuccess=${lastProduceSuccess} validator=${VAL_ID}`);
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

function signPayload(privateKeyPem, payloadObj) {
  const data = canonicalize(payloadObj);
  return signEd25519PrivateKey(privateKeyPem, data);
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

// computeSourcesRoot is provided by /sources/index.js so the algorithm is shared between VP and NS

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
    const m = await fetch(GATEWAY_URL + '/v1/mempool');
    const mp = await m.json();
    // mp.mempool elements: { txId, payload }
    const txs = (mp.mempool || []).slice(0, MAX_TX).map(entry => entry.payload || entry.tx || {});

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
    const sourcesRoot = computeSourcesRoot(txs);
    // Build header and payload; optionally add payload CID if IPFS is available
    const header = { version: 1, prevHash: prev ? sha256Hex(canonicalize(prev)) : '0'.repeat(64), merkleRoot, sourcesRoot, timestamp: Date.now(), validatorId: VAL_ID, stakeWeight: Number(chosen.stake || 0) };
    const payload = { header: { ...header }, txs };
    let payloadCid = null;
    if (ipfsConnected && ipfs) {
      try {
        // Sign the payload before adding to IPFS so that NS can verify payload origin
        const signer = VAL_ID;
        const payloadToSign = { header: { ...header }, txs };
        const payloadSig = PRIVATE_KEY_PEM ? signPayload(PRIVATE_KEY_PEM, payloadToSign) : null;
        const ipfsContent = { payload: payloadToSign, signer, payloadSignature: payloadSig, txSources: txs.map(tx => tx.sources || []) };
        const addRes = await ipfs.add(JSON.stringify(ipfsContent));
        payloadCid = addRes.cid ? addRes.cid.toString() : addRes.toString();
        header.payloadCid = payloadCid;
        const origins = new Set();
        for (const tx of txs) {
          if (tx.sources && Array.isArray(tx.sources)) for (const s of tx.sources) origins.add(s.origin || s.adapter || 'unknown');
        }
        logVp(`Produced block ${slot}, CID: ${payloadCid} signer=${signer} sourcesRoot=${sourcesRoot} txs=${txIds.length} origins=${Array.from(origins).join(',') || 'none'}`);
      } catch (e) {
        console.warn('[VP-NODE] IPFS add failed:', e.message);
        payloadCid = null;
      }
    } else {
      // Not connected to IPFS - just log and continue
      logVp('IPFS not connected - producing block without payload CID');
    }
    const headerData = canonicalize(header);
    const sig = signEd25519PrivateKey(PRIVATE_KEY_PEM, headerData);
    const producerUrl = process.env.VP_PUBLISH_URL || `http://localhost:${PORT}`;
    const res = await fetch(NS_URL + '/blocks/produce', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Producer-Url': producerUrl }, body: JSON.stringify({ header, txs, signature: sig }) });
    const j = await res.json();
    if (j && j.ok) {
      logVp('produce ok:', j);
      lastProduceSuccess = true;
      // after producing a block, notify gateway to remove consumed txs
      try {
        const consume = await fetch(GATEWAY_URL + '/v1/mempool/consume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: txIds }) });
        if (consume.ok) {
          logVp(`Notified gateway to consume ${txIds.length} tx(s)`);
        } else {
          logVp(`Gateway consume call failed: status ${consume.status}`);
        }
      } catch (e) {
        logVp('Error notifying gateway for consume:', e.message);
      }
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
  await initIpfs();
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
app.use(express.json());
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VP_VERSION, uptime: process.uptime(), ipfsPeer: ipfsPeer || null });
});

// IPFS endpoints
app.get('/ipfs/:cid', async (req, res) => {
  const cid = req.params.cid;
  if (!cid) return res.status(400).json({ error: 'cid required' });
  if (!ipfsConnected || !ipfs) return res.status(503).json({ error: 'ipfs_unavailable' });
  try {
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks);
    const text = buf.toString('utf8');
    try { const json = JSON.parse(text); return res.json({ cid, content: json }); } catch (e) { return res.send(text); }
  } catch (e) {
    return res.status(500).json({ error: 'ipfs_read_failed', message: e.message });
  }
});

app.post('/ipfs', async (req, res) => {
  if (!ipfsConnected || !ipfs) return res.status(503).json({ error: 'ipfs_unavailable' });
  const payload = req.body;
  if (!payload) return res.status(400).json({ error: 'payload required' });
  try {
    const addRes = await ipfs.add(JSON.stringify(payload));
    const cid = addRes.cid ? addRes.cid.toString() : addRes.toString();
    res.json({ ok: true, cid });
  } catch (e) {
    res.status(500).json({ error: 'ipfs_add_failed', message: e.message });
  }
});

// Add validator proofs to IPFS (e.g., slashing proofs)
app.post('/proofs', async (req, res) => {
  if (!ipfsConnected || !ipfs) return res.status(503).json({ error: 'ipfs_unavailable' });
  const proof = req.body;
  if (!proof) return res.status(400).json({ error: 'proof required' });
  try {
    const addRes = await ipfs.add(JSON.stringify(proof));
    const cid = addRes.cid ? addRes.cid.toString() : addRes.toString();
    res.json({ ok: true, cid });
  } catch (e) {
    res.status(500).json({ error: 'ipfs_add_failed', message: e.message });
  }
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

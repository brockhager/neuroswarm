import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { computeSourcesRoot } from '../sources/index.js';
import { deterministicSortEntries, computeMerkleRootFromTxs } from './src/producer-core.mjs';
import { PeerManager, P2PProtocol, MessageType, startHTTPSServer } from '../shared/peer-discovery/index.js';
import { CritiqueProcessor } from './src/critique-processor.mjs';
import QueueConsumer from './queue-consumer.js';
// ipfs-http-client is an optional runtime dependency. Dynamically import it
// inside initIpfs so the server can start without IPFS being installed.

const NS_URL = (process.env.NS_NODE_URL || 'http://localhost:3000').trim();
const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://localhost:8080').trim();
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
function logVp(...args) { const _ts = new Date().toISOString(); console.log(`[VP][${_ts}]`, ...args); }
logVp(`vp-node starting on port ${PORT}`);
logVp(`NS_URL=${NS_URL} | GATEWAY_URL=${GATEWAY_URL}`);
if (STATUS_ENABLED) logVp(`vp-node heartbeat enabled (interval ${Number(process.env.STATUS_INTERVAL_MS || 60000)}ms)`);

// Peer discovery objects will be initialized when the server is started directly
let peerManager = null;
let p2pProtocol = null;

// CN-08-B: Critique processor for REQUEST_REVIEW handling
let critiqueProcessor = null;

let lastProduceSuccess = null;
let nsReachable = false;
let ipfs = null;
let ipfsPeer = null;
let ipfsConnected = false;

// Idempotency store for confirmations from NS (prevents replayed SETTLED callbacks)
import IdempotencyStore from '../shared/idempotency-store.ts';
import { PublicKeyRegistry } from '../shared/key-management.ts';
import { getCanonicalPayloadHash, verifySignature, hexToBuffer } from '../shared/crypto-utils.ts';
const vpIdempotencyStore = new IdempotencyStore();

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
    // Dynamically import ipfs-http-client so we can gracefully handle the
    // case where it's not installed in the environment (e.g. lightweight
    // dev setups that don't need IPFS).
    const { create: ipfsHttpClient } = await import('ipfs-http-client');
    // ipfs-http-client v59 uses create()
    ipfs = ipfsHttpClient({ url: ipfsApi });
    const id = await ipfs.id();
    ipfsPeer = id && id.id ? id.id : null;
    ipfsConnected = !!ipfsPeer;
    if (ipfsConnected) logVp(`vp-node connected to IPFS peer ${ipfsPeer}`);
  } catch (e) {
    ipfsConnected = false;
    logVp('IPFS not available at', ipfsApi, '-', e.message);
  }
}

let blocksProduced = 0;
let lastPayloadCid = null;
if (STATUS_ENABLED) {
  // periodic heartbeat
  setInterval(async () => {
    try {
      const nsOk = await pingNsHealth();
      nsReachable = nsOk;
      const gwOk = await pingGateway();
      logVp(`heartbeat | ns=${NS_URL} nsReachable=${nsOk} gateway=${GATEWAY_URL} gatewayOk=${gwOk} lastProduceSuccess=${lastProduceSuccess} validator=${VAL_ID} blocksProduced=${blocksProduced} lastPayloadCid=${lastPayloadCid || 'none'} uptime=${process.uptime().toFixed(0)}s`);
    } catch (e) { logVp('Heartbeat error', e.message); }
  }, Number(process.env.STATUS_INTERVAL_MS || 60000));
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
    logVp('register error', e.message);
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

export async function getNSDesignatedProducer(slot) {
  try {
    const res = await fetch(NS_URL + `/chain/producer/${slot}`);
    if (!res.ok) return null;
    const j = await res.json();
    return j && j.producerId ? j.producerId : null;
  } catch (e) {
    logVp('WARN', 'Failed to fetch designated producer from NS:', e.message);
    return null;
  }
}

export async function produceLoop() {
  try {
    const m = await fetch(GATEWAY_URL + '/v1/mempool');
    let mp = { mempool: [] };
    try { mp = await m.json(); } catch (e) { logVp('WARN', 'Failed to parse mempool JSON from gateway:', e.message); }
    // mp.mempool elements: { txId, payload }
    const txs = (mp.mempool || []).slice(0, MAX_TX).map(entry => entry.payload || entry.tx || {});

    // NOTE: REQUEST_REVIEW processing moved below — critiques MUST be generated by the
    // canonical producer (producer-only). We will only create & sign ARTIFACT_CRITIQUE
    // transactions after confirming this node is the designated producer for the slot.

    let head = null;
    try {
      const headRes = await fetch(NS_URL + '/headers/tip');
      if (headRes.ok) {
        head = await headRes.json();
      }
    } catch (e) {
      // Silently handle - empty blockchain is normal on startup
    }
    const prev = head && head.header ? head.header : null;
    let heightResp = { height: 0 };
    try { heightResp = await (await fetch(NS_URL + '/chain/height')).json(); } catch (e) { logVp('WARN', 'Failed to parse height JSON from NS:', e.message); }
    const slot = (heightResp.height || 0) + 1;
    let validatorsResp = { validators: [] };
    try { validatorsResp = await (await fetch(NS_URL + '/validators')).json(); } catch (e) { logVp('WARN', 'Failed to parse validators JSON from NS:', e.message); }
    const prevHash = prev ? sha256Hex(canonicalize(prev)) : '0'.repeat(64);
    // Check with NS for the canonical designated producer for this height
    const designated = await getNSDesignatedProducer(slot);
    if (designated) {
      if (designated !== VAL_ID) {
        // Not our turn — don't attempt to produce
        logVp(`skip produce: height=${slot} designated=${designated} me=${VAL_ID}`);
        return;
      }
      // else: designated matches our VAL_ID -> proceed
    } else {
      // No designated producer (no eligible validators) — conservative behavior: skip producing
      logVp(`skip produce: height=${slot} no designated producer returned from NS`);
      return;
    }
    const chosen = await pickValidator(validatorsResp.validators, slot, prevHash);
    if (!chosen) {
      logVp('no eligible validator');
      return;
    }
    if (chosen.validatorId !== VAL_ID) {
      // not our turn
      return;
    }

    // CN-08-B + CN-08-C: Only the canonical producer should generate ARTIFACT_CRITIQUE txs.
    // Process REQUEST_REVIEW entries, synthesize critiques via CritiqueProcessor and sign them
    // for inclusion in the block payload. This prevents non-producers from issuing critique txs.
    if (critiqueProcessor) {
      for (const tx of txs.slice()) { // iterate over a copy because we may append
        if (tx.type === 'REQUEST_REVIEW') {
          logVp(`[CN-08-B] (producer-only) Processing REQUEST_REVIEW for artifact ${tx.artifact_id}`);
          try {
            const critiquePayload = await critiqueProcessor.generateCritique(tx, await critiqueProcessor.fetchArtifactContent(tx.artifact_id, GATEWAY_URL));
            if (!critiquePayload) {
              logVp('[CN-08-B] Critique generation returned null/empty — skipping');
              continue;
            }
            let critiqueTx = critiqueProcessor.createCritiqueTx(critiquePayload);
            // Attach provenance and sign the transaction using our validator key
            critiqueTx.signedBy = VAL_ID;
            critiqueTx.publicKey = PUBLIC_KEY_PEM || undefined;
            critiqueTx.timestamp = Date.now();
            critiqueTx.signature = PRIVATE_KEY_PEM ? signPayload(PRIVATE_KEY_PEM, critiqueTx) : null;

            // Add to local block candidate set so the current produce includes this tx
            txs.push(critiqueTx);

            // Gossip a copy of the signed tx into the gateway mempool for network visibility
            try {
              const gossipRes = await fetch(GATEWAY_URL + '/v1/mempool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tx: critiqueTx })
              });
              if (gossipRes.ok) logVp(`[CN-08-B] Gossiped signed ARTIFACT_CRITIQUE for ${tx.artifact_id} to mempool`);
              else logVp(`[CN-08-B] Failed to gossip signed ARTIFACT_CRITIQUE: HTTP ${gossipRes.status}`);
            } catch (e) {
              logVp('[CN-08-B] Gossip attempt failed', e.message);
            }
          } catch (error) {
            logVp(`[CN-08-B] Error producing critique for REQUEST_REVIEW: ${error.message}`);
          }
        }
      }
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
        logVp('IPFS add failed:', e.message);
        payloadCid = null;
      }
    } else {
      // Not connected to IPFS - just log and continue
      logVp('IPFS not connected - producing block without payload CID');
    }
    const headerData = canonicalize(header);
    // If private key not configured for this VP instance (e.g. unit tests)
    // allow producing without a signature (tests / dev harnesses skip verification).
    const sig = PRIVATE_KEY_PEM ? signEd25519PrivateKey(PRIVATE_KEY_PEM, headerData) : null;
    const producerUrl = process.env.VP_PUBLISH_URL || `http://localhost:${PORT}`;
    const res = await fetch(NS_URL + '/blocks/produce', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Producer-Url': producerUrl }, body: JSON.stringify({ header, txs, signature: sig }) });
    let j = null;
    try { j = await res.json(); } catch (e) { logVp('WARN', 'Failed to parse JSON from NS /blocks/produce response:', e.message); j = null; }
    if (j && j.ok) {
      lastProduceSuccess = true;
      blocksProduced += 1;
      lastPayloadCid = payloadCid || null;
      logVp(`produced block #${slot} | payloadCid=${payloadCid || 'none'} | txs=${txIds.length}`);
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
      logVp('produce failed:', j);
      lastProduceSuccess = false;
    }
    // Optionally pin any tx.cid to IPFS pinning endpoint
    const IPFS_PIN = process.env.IPFS_PIN_URL;
    if (IPFS_PIN) {
      for (const tx of txs) {
        if (tx.cid) {
          try {
            await fetch(IPFS_PIN + '/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid: tx.cid }) });
            logVp('pinned', tx.cid);
          } catch (e) {
            logVp('pin error', e.message);
          }
        }
      }
    }
  } catch (e) {
    logVp('vp err', e.message);
    logVp(`Error in produceLoop: ${e.message.slice(0, 200)}`);
    lastProduceSuccess = false;
  }
}

// Test helper: allow injection of a critiqueProcessor in tests
export function __setCritiqueProcessorForTest(proc) {
  critiqueProcessor = proc;
}

async function main() {
  await initIpfs();
  await register();

  // CN-08-B: Initialize CritiqueProcessor if GEMINI_API_KEY is set
  if (process.env.GEMINI_API_KEY) {
    try {
      critiqueProcessor = new CritiqueProcessor({
        geminiApiKey: process.env.GEMINI_API_KEY,
        validatorId: VAL_ID,
        logFn: logVp,
      });
      logVp('[CN-08-B] CritiqueProcessor initialized with Gemini API');
    } catch (error) {
      logVp('[CN-08-B] Failed to initialize CritiqueProcessor:', error.message);
      logVp('[CN-08-B] REQUEST_REVIEW transactions will be ignored');
    }
  } else {
    logVp('[CN-08-B] GEMINI_API_KEY not set - REQUEST_REVIEW transactions will be ignored');
  }

  setInterval(produceLoop, INTERVAL_MS);
  logVp('VP production loop initialized');

  // CN-13-A: Start Queue Consumer
  try {
    const consumer = new QueueConsumer();
    consumer.start();
    logVp('[CN-13-A] QueueConsumer started');
  } catch (err) {
    logVp('ERROR: Failed to start QueueConsumer:', err.message);
  }
}

// Health endpoint for VP (consistency with other nodes)
let VP_VERSION = '0.1.0';
try {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pj = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      VP_VERSION = pj.version || VP_VERSION;
    } catch (e) {
      logVp('WARN', 'Failed to parse package.json for version:', e.message);
    }
  }
} catch (e) {
  logVp('WARN', 'Failed to read package.json due to error:', e.message);
}
const app = express();
app.use(express.json());

// Error handler for malformed JSON bodies (Express throws on body parse failures)
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    logVp('WARN', 'Bad JSON payload in request body', err.message);
    return res.status(400).json({ error: 'bad_json', message: err.message });
  }
  next(err);
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VP_VERSION, uptime: process.uptime(), ipfsPeer: ipfsPeer || null });
});

// Receive settlement confirmations from NS-Node and mark claim SETTLED
app.post('/api/v1/ledger/confirm-reward-settlement', async (req, res) => {
  try {
    const { claimId, txHash, signature, timestamp, sender } = req.body || {};
    if (!claimId || !txHash) return res.status(400).json({ error: 'claimId and txHash required' });

    // Phase 5: Confirmation authentication — verify NS signature on confirmation payload
    if (!signature) return res.status(400).json({ error: 'signature required' });

    const nsIdentity = sender || process.env.NS_NODE_ID || 'NS-PRIMARY';
    const registry = new PublicKeyRegistry();

    // Support multiple active public keys during rotation (e.g., env override: REGISTRY_PUBKEY_NS_PRIMARY="<hex1>,<hex2>")
    const publicKeys = await registry.getPublicKeys(nsIdentity);
    if (!publicKeys || publicKeys.length === 0) return res.status(403).json({ error: 'unknown_sender', message: `unknown sender ${nsIdentity}` });

    // Verify signature against any active public key
    const sigBuf = hexToBuffer(signature);
    const payloadToVerify = { claimId, txHash, timestamp, sender: nsIdentity };
    const payloadHash = getCanonicalPayloadHash(payloadToVerify);
    // (sigBuf already computed above)

    let verified = false;
    for (const pk of publicKeys) {
      if (await verifySignature(pk, payloadHash, sigBuf)) {
        verified = true;
        break;
      }
    }

    if (!verified) return res.status(401).json({ error: 'invalid_signature', message: 'signature verification failed' });

    // Idempotency header support: if provided, reject duplicate confirmations
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || req.headers['Idempotency-key'];

    if (idempotencyKey) {
      // If this key was already used by the VP (processorNode === 'VP-Node'), treat as duplicate
      const existing = await vpIdempotencyStore.isKeyProcessed(String(idempotencyKey));
      if (existing && existing.processorNode === 'VP-Node') return res.status(409).json({ error: 'duplicate_confirmation', message: 'Idempotency key already used' });
    }

    // Lazy import to avoid circular deps in tests
    // Try both .js and .ts paths so tests that import sources directly work in different environments
    const svcModule = await import('./reward-claims-db-service.js').catch(() => import('./reward-claims-db-service.ts'));
    const { markRewardClaimSettled } = svcModule;
    await markRewardClaimSettled(claimId, txHash);

    // Only mark idempotency key after we've successfully applied the settlement
    if (idempotencyKey) {
      try {
        await vpIdempotencyStore.recordKey({ idempotencyKey: String(idempotencyKey), claimId, txHash, recordedAt: new Date().toISOString(), processorNode: 'VP-Node' });
      } catch (e) {
        // If recordKey fails because key already exists, it's safe to proceed — we've already prevented duplicate VP processing above.
        console.warn('Failed to record idempotency key:', e instanceof Error ? e.message : String(e));
      }
    }

    return res.status(200).json({ ok: true, message: 'Claim marked as SETTLED' });
  } catch (e) {
    logVp('ERROR confirming reward settlement', e.message);
    return res.status(500).json({ error: 'internal_error', message: e.message });
  }
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
    try {
      const json = JSON.parse(text);
      return res.json({ cid, content: json });
    } catch (e) {
      // Malformed JSON - log and return raw text (do not crash)
      logVp(`Bad JSON from IPFS cid=${cid} | length=${text ? text.length : 0} | error=${e.message}`);
      return res.send(text);
    }
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

// Test / Produce endpoint for integration / developer flows
// Accepts an optional body { txs: [ ... ] } and returns a produced header + txs
app.post('/v1/blocks/produce', async (req, res) => {
  try {
    let txs = null;
    if (req.body && Array.isArray(req.body.txs)) txs = req.body.txs;
    // If no txs provided, try to fetch from gateway
    if (!txs) {
      try {
        const m = await fetch(GATEWAY_URL + '/v1/mempool');
        const mp = await m.json();
        txs = (mp && mp.mempool) ? (mp.mempool || []).map(e => e.payload || e.tx || {}) : [];
      } catch (e) {
        txs = [];
      }
    }

    // Apply deterministic ordering
    const sorted = deterministicSortEntries(txs || []);

    // compute merkle and sources root
    const merkleRoot = computeMerkleRootFromTxs(sorted);
    const sourcesRoot = computeSourcesRoot(sorted);

    // header fields per contracts/VPBlockHeader.json
    const header = {
      version: '1.0.0',
      chainId: process.env.CHAIN_ID || 'neuroswarm-testnet',
      height: Number(req.body.height || 0),
      producerId: VAL_ID,
      prevHash: req.body.prevHash || '0'.repeat(64),
      payloadCid: null,
      sourcesRoot,
      merkleRoot,
      timestamp: Date.now(),
      slot: Number(req.body.slot || 0),
      txCount: sorted.length
    };

    // compute payload CID:
    // - if IPFS available, add to IPFS and set CID
    // - otherwise use a deterministic fallback payloadCid based on header+txs
    if (ipfsConnected && ipfs) {
      try {
        const addRes = await ipfs.add(JSON.stringify({ header, txs: sorted }));
        header.payloadCid = addRes.cid ? addRes.cid.toString() : addRes.toString();
      } catch (e) {
        // ignore
      }
    } else {
      // Not connected to IPFS - produce a deterministic fallback payloadCid so header.payloadCid is a string
      const fallbackPayload = sha256Hex(Buffer.from(canonicalize({ header, txs }), 'utf8'));
      header.payloadCid = `cid:fallback:${fallbackPayload}`;
      logVp('IPFS not connected - using fallback payloadCid', header.payloadCid);
    }

    // ensure keypair exists (tests may import server without running register())
    if (!PRIVATE_KEY_PEM) {
      const keypair = crypto.generateKeyPairSync('ed25519');
      PRIVATE_KEY_PEM = keypair.privateKey.export({ type: 'pkcs8', format: 'pem' });
      PUBLIC_KEY_PEM = keypair.publicKey.export({ type: 'spki', format: 'pem' });
    }
    // sign header deterministically
    const headerData = canonicalize(header);
    const signature = signEd25519PrivateKey(PRIVATE_KEY_PEM, headerData);

    // attach signature for contract verification
    const signedHeader = { ...header, signature };

    return res.json({ ok: true, header: signedHeader, txs: sorted, publicKey: PUBLIC_KEY_PEM });
  } catch (e) {
    console.error('Produce route error', e && e.message);
    return res.status(500).json({ ok: false, error: e && e.message });
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

// Peer Discovery Endpoints
app.get('/peers', (req, res) => {
  try {
    const filterType = req.query.type;
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
  }
});

app.post('/peers/add', (req, res) => {
  try {
    const { host, port, nodeType } = req.body;

    if (!host || !port) {
      return res.status(400).json({ error: 'host and port required' });
    }

    const added = peerManager.addPeer({
      host,
      port: parseInt(port),
      nodeType: nodeType || 'NS',
      source: 'api'
    });

    if (added) {
      res.json({ ok: true, message: `Added peer ${host}:${port} (type: ${nodeType || 'NS'})` });
    } else {
      res.json({ ok: false, message: `Peer ${host}:${port} already exists or max peers reached` });
    }
  } catch (err) {
    console.error('Error adding peer:', err);
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

    const result = await p2pProtocol.handleMessage(message, senderIp);
    res.json({ ok: true, result });
  } catch (err) {
    console.error('Error handling P2P message:', err);
    res.status(500).json({ error: 'Failed to handle message', detail: err.message });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Initialize Peer Discovery for VP Node when starting as standalone
  peerManager = new PeerManager({
    nodeType: 'VP',
    port: PORT,
    bootstrapPeers: process.env.BOOTSTRAP_PEERS || '',
    maxPeers: parseInt(process.env.MAX_PEERS) || 8,
    dataDir: path.join(process.cwd(), 'data')
  });
  p2pProtocol = new P2PProtocol(peerManager);
  logVp(`Peer discovery enabled | nodeId=${peerManager.nodeId} | nodeType=VP | bootstrapPeers=${process.env.BOOTSTRAP_PEERS || 'none'}`);

  const server = app.listen(PORT, () => {
    logVp('VP node started, producing blocks');
    logVp(`Listening at http://localhost:${PORT}`);
    logVp('Health endpoint available at /health');

    // Start HTTPS server for encrypted P2P communication
    startHTTPSServer(app, PORT, 'VP', peerManager.nodeId).then(httpsServer => {
      if (httpsServer) {
        logVp(`HTTPS server enabled on port ${PORT + 1}`);
      }
    }).catch(err => {
      logVp(`HTTPS server failed: ${err.message}`);
    });
  });

  server.on('connection', (socket) => {
    const remote = `${socket.remoteAddress}:${socket.remotePort}`;
    logVp(`Connection from ${remote}`);
    socket.on('close', () => logVp(`Connection closed ${remote}`));
  });

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

  // start main loop only when running as a standalone server
  main();
}

// Standardized crash handling: log and exit so the CMD window remains open for diagnostics
process.on('uncaughtException', (err) => {
  try { logVp('ERROR: Node crashed | reason=' + (err && err.message ? err.message : String(err))); } catch (e) { console.error('ERROR: Node crashed', err && err.message ? err.message : String(err)); }
  try { logVp(err && err.stack ? err.stack : err); } catch (e) { console.error(err && err.stack ? err.stack : err); }
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  try { logVp('ERROR: Node crashed | reason=' + (reason && reason.message ? reason.message : String(reason))); } catch (e) { console.error('ERROR: Node crashed', reason); }
  process.exit(1);
});

// export the express app for tests
export { app };

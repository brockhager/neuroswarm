import crypto from 'crypto';

// deterministic canonicalization (simple stable JSON)
export function canonicalize(obj) {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

export function txIdFor(tx) {
  const copy = { ...tx };
  // Exclude signature fields if present
  delete copy.signature;
  delete copy.sig;
  // use canonicalize for deterministic serialization
  return crypto.createHash('sha256').update(canonicalize(copy)).digest('hex');
}

export function deterministicSortEntries(entries) {
  // sorts in-place; returns new array copy
  const copy = (entries || []).slice();
  copy.sort((a, b) => {
    // priority: lower is higher priority
    const apr = Number.isFinite(a.priority) ? a.priority : Number.MAX_SAFE_INTEGER;
    const bpr = Number.isFinite(b.priority) ? b.priority : Number.MAX_SAFE_INTEGER;
    if (apr !== bpr) return apr - bpr;

    // fee: higher fee first
    const af = Number.isFinite(a.fee) ? a.fee : 0;
    const bf = Number.isFinite(b.fee) ? b.fee : 0;
    if (af !== bf) return bf - af;

    // timestamp: earlier first
    const at = Number.isFinite(a.timestamp) ? a.timestamp : 0;
    const bt = Number.isFinite(b.timestamp) ? b.timestamp : 0;
    if (at !== bt) return at - bt;

    // fallback: id or txId lexicographic
    const aid = a.id || a.txId || txIdFor(a) || '';
    const bid = b.id || b.txId || txIdFor(b) || '';
    if (aid < bid) return -1;
    if (aid > bid) return 1;
    return 0;
  });
  return copy;
}

export function computeMerkleRootFromTxs(txs) {
  if (!txs || txs.length === 0) return sha256Hex('');
  const ids = txs.map(tx => txIdFor(tx));
  let layer = ids.map(id => Buffer.from(id, 'hex'));
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

// Key generation helpers (small wrappers for tests and runtime loading)
export function generateEd25519KeypairPem() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
  return { privateKeyPem: privPem, publicKeyPem: pubPem };
}

// Deterministic header signing and verification for VP
export function signHeaderWithPrivateKey(privateKeyPem, headerObj) {
  if (!privateKeyPem) throw new Error('private key required');
  const data = canonicalize(headerObj);
  const priv = crypto.createPrivateKey(privateKeyPem);
  const sigBuf = crypto.sign(null, Buffer.from(data, 'utf8'), priv);
  return sigBuf.toString('base64');
}

export function verifyHeaderSignature(publicKeyPem, headerObj, signatureBase64) {
  if (!publicKeyPem) throw new Error('public key required');
  const data = canonicalize(headerObj);
  const pub = crypto.createPublicKey(publicKeyPem);
  const sigBuf = Buffer.from(signatureBase64 || '', 'base64');
  // For Ed25519, algorithm param is null
  return crypto.verify(null, Buffer.from(data, 'utf8'), pub, sigBuf);
}

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export default {
  canonicalize,
  txIdFor,
  deterministicSortEntries,
  computeMerkleRootFromTxs
};

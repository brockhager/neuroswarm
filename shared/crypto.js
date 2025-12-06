import crypto from 'crypto';

// Lightweight, shared crypto helpers used by NS/VP for signing & verification.
// This is intentionally small / mock-friendly to make local tests deterministic.

export function sha256Hex(buf) {
  return crypto.createHash('sha256').update(typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf).digest('hex');
}

export function canonicalize(obj) {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).filter(k => typeof obj[k] !== 'undefined').sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

export function txIdFor(tx) {
  const copy = { ...tx };
  delete copy.signature;
  return sha256Hex(Buffer.from(canonicalize(copy), 'utf8'));
}

export function signEd25519PrivateKey(privateKeyPem, data) {
  const priv = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(data, 'utf8'), priv);
  return sig.toString('base64');
}

export function verifyEd25519(publicKeyPem, data, sigBase64) {
  try {
    const pubKey = crypto.createPublicKey(publicKeyPem);
    const sig = Buffer.from(sigBase64, 'base64');
    return crypto.verify(null, Buffer.from(data, 'utf8'), pubKey, sig);
  } catch (e) {
    return false;
  }
}

export default { canonicalize, txIdFor, signEd25519PrivateKey, verifyEd25519, sha256Hex };

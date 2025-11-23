import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const NS_URL = process.env.NS_NODE_URL || 'http://localhost:3000';

function canonicalize(obj) {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

function sha256Hex(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return { ok: false, error: 'non-json', body: text, status: res.status }; }
}

function signEd25519PrivateKey(privateKeyPem, data) {
  const priv = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(data, 'utf8'), priv);
  return sig.toString('base64');
}

async function main() {
  // Generate a keypair and register
  const keypair = crypto.generateKeyPairSync('ed25519');
  const priv = keypair.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const pub = keypair.publicKey.export({ type: 'spki', format: 'pem' });

  const regJson = await fetchJson(NS_URL + '/validators/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ validatorId: 'smoke-signer', publicKey: pub, stake: 1 }) });
  console.log('register res (debug)', regJson);

  const tip = await fetchJson(NS_URL + '/headers/tip');
  const prev = tip.header || null;
  const prevHash = prev ? sha256Hex(canonicalize(prev)) : '0'.repeat(64);
  const chainHeight = await fetchJson(NS_URL + '/chain/height');
  const slot = (chainHeight.height || 0) + 1;

  const header = { version: 1, prevHash, merkleRoot: sha256Hex(''), timestamp: Date.now(), validatorId: 'smoke-signer', stakeWeight: 1 };
  const headerData = canonicalize(header);
  const signature = signEd25519PrivateKey(priv, headerData);

  const heightBefore = (await fetchJson(NS_URL + '/chain/height')).height || 0;
  const resp = await fetchJson(NS_URL + '/blocks/produce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ header, txs: [], signature }) });
  console.log('produce response', JSON.stringify(resp, null, 2));
  if (!resp.ok) process.exitCode = 2;
  const heightAfter = (await fetchJson(NS_URL + '/chain/height')).height || 0;
  console.log('height_before', heightBefore, 'height_after', heightAfter);
  if (heightAfter <= heightBefore) {
    console.error('Block not accepted (height not increased)');
    process.exitCode = 3;
  }
}

main().catch(e => { console.error('smokeProduce err', e.message); process.exitCode = 1; });

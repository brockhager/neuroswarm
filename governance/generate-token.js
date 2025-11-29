import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Look for a private key in governance/secrets or admin-node/secrets (fallback)
const candidatePaths = [
  path.join(__dirname, 'secrets', 'founder.jwt.key'),
  path.join(__dirname, '..', 'admin-node', 'secrets', 'founder.jwt.key'),
  path.join(__dirname, '..', 'admin-node', 'secrets', 'admin-node.jwt.key')
];

let privateKey = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    privateKey = fs.readFileSync(p, 'utf8');
    console.log('Using private key:', p);
    break;
  }
}
if (!privateKey) {
  console.error('No founder private key found in governance/secrets or admin-node/secrets; cannot generate token');
  process.exit(2);
}

// Create a test token (admin user)
const payload = {
  id: 'test-admin',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
};

// Minimal RS256 JWT builder to avoid external dependency in this helper script
function base64UrlEncode(bufOrStr) {
  const s = Buffer.isBuffer(bufOrStr) ? bufOrStr.toString('base64') : Buffer.from(String(bufOrStr)).toString('base64');
  return s.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

const header = { alg: 'RS256', typ: 'JWT' };
const headerB = base64UrlEncode(JSON.stringify(header));
const payloadB = base64UrlEncode(JSON.stringify(payload));
const signingInput = headerB + '.' + payloadB;

const signer = crypto.createSign('RSA-SHA256');
signer.update(signingInput);
signer.end();
const signature = signer.sign(privateKey);
const signatureB = base64UrlEncode(signature);
const token = signingInput + '.' + signatureB;

console.log('Test JWT Token:');
console.log(token);
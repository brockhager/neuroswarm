import jwt from 'jsonwebtoken';
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

const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

console.log('Test JWT Token:');
console.log(token);
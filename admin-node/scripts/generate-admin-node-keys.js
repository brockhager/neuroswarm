// generate-admin-node-keys.js
// Run with: node scripts/generate-admin-node-keys.js

import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import path from 'path';

// repoScopedFs.cjs is intentionally CommonJS; import dynamically
const repoFs = await import('../../scripts/repoScopedFs.cjs');
const { ensureDirInRepoSync, safeJoinRepo } = repoFs.default || repoFs;

// Ensure secrets directory exists
const secretsDir = path.join(__dirname, '..', 'secrets');
if (!fs.existsSync(secretsDir)) {
  ensureDirInRepoSync(secretsDir);
}

// Decide whether to overwrite existing keys
const force = process.argv.includes('--force') || process.env.OVERWRITE_KEYS === 'true';

const privPath = path.join(secretsDir, 'admin-node.jwt.key');
const pubPath = path.join(secretsDir, 'admin-node.jwt.pub');

if (!force && fs.existsSync(privPath) && fs.existsSync(pubPath)) {
  console.log('Admin keys already exist; skipping generation (use --force or set OVERWRITE_KEYS=true to overwrite)');
} else {
  // Generate RSA key pair
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  // Export private key in PKCS#1 PEM (for JWT signing)
  const privatePem = privateKey.export({
    type: 'pkcs1',
    format: 'pem',
  });
  fs.writeFileSync(privPath, privatePem);

  // Export public key in SPKI PEM (for JWT verification)
  const publicPem = publicKey.export({
    type: 'spki',
    format: 'pem',
  });
  fs.writeFileSync(pubPath, publicPem);

  console.log('Generated admin-node key pair');
}

console.log('✅ Admin Node key pair generated:');
console.log(`- Private key: ${path.join(secretsDir, 'admin-node.jwt.key')}`);
console.log(`- Public key:  ${path.join(secretsDir, 'admin-node.jwt.pub')}`);

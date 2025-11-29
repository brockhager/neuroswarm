// generate-all-keys.js
// Run with: node scripts/generate-all-keys.js

import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import path from 'path';

const repoFs = await import('../../scripts/repoScopedFs.cjs');
const { ensureDirInRepoSync } = repoFs.default || repoFs;

// Ensure secrets directory exists
const secretsDir = path.join(__dirname, '..', 'secrets');
if (!fs.existsSync(secretsDir)) {
  ensureDirInRepoSync(secretsDir);
}

// Helper to write key files
function writeKeyPair(name, privateType, publicType) {
  const priv = path.join(secretsDir, `${name}.key`);
  const pub = path.join(secretsDir, `${name}.pub`);
  const force = process.argv.includes('--force') || process.env.OVERWRITE_KEYS === 'true';

  if (!force && fs.existsSync(priv) && fs.existsSync(pub)) {
    console.log(`Skipping ${name} key pair generation (files already exist): ${priv}, ${pub}`);
    return;
  }

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const privatePem = privateKey.export({ type: privateType, format: 'pem' });
  const publicPem = publicKey.export({ type: publicType, format: 'pem' });

  fs.writeFileSync(priv, privatePem);
  fs.writeFileSync(pub, publicPem);

  console.log(`✅ ${name} key pair generated:`);
  console.log(`- Private: ${priv}`);
  console.log(`- Public:  ${pub}`);
}

// 1. Founder key pair (used for governance signing)
writeKeyPair('founder.jwt', 'pkcs1', 'spki');

// 2. Admin Node key pair (used for JWT signing)
writeKeyPair('admin-node.jwt', 'pkcs1', 'spki');

// 3. Verification anchor (redundant copy of founder public key for distribution)
// Copy founder public key to admin-node.jwt.pub only if admin-node.jwt.pub doesn't already exist or if --force
try {
  const src = path.join(secretsDir, 'founder.jwt.pub');
  const dest = path.join(secretsDir, 'admin-node.jwt.pub');
  const forceCopy = process.argv.includes('--force') || process.env.OVERWRITE_KEYS === 'true';
  if (!fs.existsSync(src)) {
    console.warn('Founder public key not present, cannot copy for verification use');
  } else if (!forceCopy && fs.existsSync(dest)) {
    console.log('admin-node.jwt.pub already exists; skipping copy (use --force to overwrite)');
  } else {
    fs.copyFileSync(src, dest);
    console.log('🔁 Copied founder public key to admin-node.jwt.pub for verification use.');
  }
} catch (e) {
  console.warn('Failed copying founder pub key:', e.message);
}

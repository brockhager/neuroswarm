// generate-all-keys.js
// Run with: node scripts/generate-all-keys.js

const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');
const { ensureDirInRepoSync } = require('../../scripts/repoScopedFs.cjs');

// Ensure secrets directory exists
const secretsDir = path.join(__dirname, '..', 'secrets');
if (!fs.existsSync(secretsDir)) {
  ensureDirInRepoSync(secretsDir);
}

// Helper to write key files
function writeKeyPair(name, privateType, publicType) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const privatePem = privateKey.export({ type: privateType, format: 'pem' });
  const publicPem = publicKey.export({ type: publicType, format: 'pem' });

  fs.writeFileSync(path.join(secretsDir, `${name}.key`), privatePem);
  fs.writeFileSync(path.join(secretsDir, `${name}.pub`), publicPem);

  console.log(`✅ ${name} key pair generated:`);
  console.log(`- Private: ${path.join(secretsDir, `${name}.key`)}`);
  console.log(`- Public:  ${path.join(secretsDir, `${name}.pub`)}`);
}

// 1. Founder key pair (used for governance signing)
writeKeyPair('founder.jwt', 'pkcs1', 'spki');

// 2. Admin Node key pair (used for JWT signing)
writeKeyPair('admin-node.jwt', 'pkcs1', 'spki');

// 3. Verification anchor (redundant copy of founder public key for distribution)
fs.copyFileSync(
  path.join(secretsDir, 'founder.jwt.pub'),
  path.join(secretsDir, 'admin-node.jwt.pub')
);
console.log('🔁 Copied founder public key to admin-node.jwt.pub for verification use.');

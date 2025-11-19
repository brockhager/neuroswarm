#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureDirInRepoSync } = require('../../scripts/repoScopedFs.cjs');
const { generateKeyPairSync } = require('crypto');

const secretsDir = path.join(__dirname, '..', 'secrets');
if (!fs.existsSync(secretsDir)) ensureDirInRepoSync(secretsDir);

function writeKeyPair(prefix) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  fs.writeFileSync(path.join(secretsDir, `${prefix}.jwt.key`), privateKey);
  fs.writeFileSync(path.join(secretsDir, `${prefix}.jwt.pub`), publicKey);
}

writeKeyPair('founder');
writeKeyPair('admin-node');

console.log('JWT keypairs generated under secrets/');
process.exit(0);

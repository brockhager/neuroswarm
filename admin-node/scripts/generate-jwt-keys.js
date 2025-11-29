#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { generateKeyPairSync } from 'crypto';

const repoFs = await import('../../scripts/repoScopedFs.cjs');
const { ensureDirInRepoSync } = repoFs.default || repoFs;

const secretsDir = path.join(__dirname, '..', 'secrets');
if (!fs.existsSync(secretsDir)) ensureDirInRepoSync(secretsDir);

function writeKeyPair(prefix) {
  const priv = path.join(secretsDir, `${prefix}.jwt.key`);
  const pub = path.join(secretsDir, `${prefix}.jwt.pub`);
  const force = process.argv.includes('--force') || process.env.OVERWRITE_KEYS === 'true';

  if (!force && fs.existsSync(priv) && fs.existsSync(pub)) {
    console.log(`Skipping ${prefix} keys (already exist): ${priv}, ${pub}`);
    return;
  }

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  fs.writeFileSync(priv, privateKey);
  fs.writeFileSync(pub, publicKey);
  console.log(`Wrote ${prefix} keys: ${priv}, ${pub}`);
}

writeKeyPair('founder');
writeKeyPair('admin-node');

console.log('JWT keypairs generated under secrets/');
process.exit(0);

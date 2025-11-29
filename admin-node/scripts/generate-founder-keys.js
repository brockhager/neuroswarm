// generate-founder-keys.js
// Run with: node scripts/generate-founder-keys.js

import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import path from 'path';

const repoFs = await import('../../scripts/repoScopedFs.cjs');
const { ensureDirInRepoSync } = repoFs.default || repoFs;

// Ensure secrets directory exists
const secretsDir = path.join(__dirname, '..', 'secrets');
if (!fs.existsSync(secretsDir)) { ensureDirInRepoSync(secretsDir); }

const force = process.argv.includes('--force') || process.env.OVERWRITE_KEYS === 'true';

const privPath = path.join(secretsDir, 'founder.jwt.key');
const pubPath = path.join(secretsDir, 'founder.jwt.pub');

if (!force && fs.existsSync(privPath) && fs.existsSync(pubPath)) {
  console.log('Founder keys already exist; skipping generation (use --force or set OVERWRITE_KEYS=true to overwrite)');
} else {
  // Generate RSA key pair
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  // Export private key in PKCS#1 PEM (for signing)
  const privatePem = privateKey.export({
    type: 'pkcs1',
    format: 'pem',
  });
  fs.writeFileSync(privPath, privatePem);

  // Export public key in SPKI PEM (for verification)
  const publicPem = publicKey.export({
    type: 'spki',
    format: 'pem',
  });
  fs.writeFileSync(pubPath, publicPem);

  console.log('✅ Founder key pair generated:');
  console.log(`- Private key: ${privPath}`);
  console.log(`- Public key:  ${pubPath}`);
}

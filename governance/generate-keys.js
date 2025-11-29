import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
const repoFs = await import('../scripts/repoScopedFs.cjs');
const { ensureDirInRepoSync } = repoFs.default || repoFs;

const force = process.argv.includes('--force') || process.env.OVERWRITE_KEYS === 'true';

// Generate founder key pair
const founderKeys = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Generate admin-node private key
const adminKeys = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Write keys to files
const secretsDir = path.join(__dirname, 'secrets');

if (!fs.existsSync(secretsDir)) {
  ensureDirInRepoSync(secretsDir);
}

const founderPriv = path.join(secretsDir, 'founder.jwt.key');
const founderPub = path.join(secretsDir, 'founder.jwt.pub');
const adminPriv = path.join(secretsDir, 'admin-node.jwt.key');

if (!force && fs.existsSync(founderPriv) && fs.existsSync(founderPub) && fs.existsSync(adminPriv)) {
  console.log('JWT key files already exist under governance/secrets — skipping generation (use --force to overwrite)');
} else {
  fs.writeFileSync(founderPriv, founderKeys.privateKey);
  fs.writeFileSync(founderPub, founderKeys.publicKey);
  fs.writeFileSync(adminPriv, adminKeys.privateKey);
  console.log('JWT keys generated successfully (governance/secrets).');
}

console.log('Done.');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ensureDirInRepoSync } = require('../scripts/repoScopedFs.cjs');

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

fs.writeFileSync(path.join(secretsDir, 'founder.jwt.key'), founderKeys.privateKey);
fs.writeFileSync(path.join(secretsDir, 'founder.jwt.pub'), founderKeys.publicKey);
fs.writeFileSync(path.join(secretsDir, 'admin-node.jwt.key'), adminKeys.privateKey);

console.log('JWT keys generated successfully!');
console.log('Files created:');
console.log('- secrets/founder.jwt.key (private)');
console.log('- secrets/founder.jwt.pub (public)');
console.log('- secrets/admin-node.jwt.key (private)');
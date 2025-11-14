// generate-admin-node-keys.js
// Run with: node scripts/generate-admin-node-keys.js

const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');

// Ensure secrets directory exists
const secretsDir = path.join(__dirname, '..', 'secrets');
if (!fs.existsSync(secretsDir)) {
  fs.mkdirSync(secretsDir);
}

// Generate RSA key pair
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

// Export private key in PKCS#1 PEM (for JWT signing)
const privatePem = privateKey.export({
  type: 'pkcs1',
  format: 'pem',
});
fs.writeFileSync(path.join(secretsDir, 'admin-node.jwt.key'), privatePem);

// Export public key in SPKI PEM (for JWT verification)
const publicPem = publicKey.export({
  type: 'spki',
  format: 'pem',
});
fs.writeFileSync(path.join(secretsDir, 'admin-node.jwt.pub'), publicPem);

console.log('✅ Admin Node key pair generated:');
console.log(`- Private key: ${path.join(secretsDir, 'admin-node.jwt.key')}`);
console.log(`- Public key:  ${path.join(secretsDir, 'admin-node.jwt.pub')}`);

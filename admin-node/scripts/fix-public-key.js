// fix-public-key.js
const fs = require('fs');
const { generateKeyPairSync } = require('crypto');

// Load your existing private key
const privatePem = fs.readFileSync('secrets/admin-node.jwt.key', 'utf8');
const privateKey = require('crypto').createPrivateKey(privatePem);

// Export public key in SPKI PEM (BEGIN PUBLIC KEY)
const publicPem = privateKey.export({ type: 'spki', format: 'pem' });
fs.writeFileSync('secrets/admin-node.jwt.pub', publicPem);

console.log('✅ Public key re-exported in SPKI format: secrets/admin-node.jwt.pub');

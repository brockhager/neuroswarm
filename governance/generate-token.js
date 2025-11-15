const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load private key
const privateKey = fs.readFileSync(path.join(__dirname, 'secrets', 'founder.jwt.key'), 'utf8');

// Create a test token (admin user)
const payload = {
  id: 'test-admin',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
};

const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

console.log('Test JWT Token:');
console.log(token);
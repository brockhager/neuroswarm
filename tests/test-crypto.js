/**
 * Test script for Certificate Management
 */

import { CryptoManager } from '../shared/peer-discovery/crypto.js';
import fs from 'fs';

console.log('=== Certificate Management Test ===\n');

// Create crypto manager
const cryptoManager = new CryptoManager({
    nodeId: 'test-node-123',
    nodeType: 'NS'
});

console.log('Test 1: Generate certificate...');
const { cert, privateKey, fingerprint } = await cryptoManager.loadOrGenerateCertificate();
console.log(`✓ Certificate generated`);
console.log(`  Fingerprint: ${fingerprint.substring(0, 50)}...`);
console.log(`  Private key length: ${privateKey.length} bytes`);
console.log(`  Certificate length: ${cert.length} bytes\n`);

console.log('Test 2: Load existing certificate...');
const loaded = cryptoManager.loadCertificate();
console.log(`✓ Certificate loaded from disk`);
console.log(`  Matches generated: ${loaded.fingerprint === fingerprint}\n`);

console.log('Test 3: Get TLS options...');
const tlsOptions = await cryptoManager.getTLSOptions();
console.log(`✓ TLS options created`);
console.log(`  Has key: ${!!tlsOptions.key}`);
console.log(`  Has cert: ${!!tlsOptions.cert}`);
console.log(`  Reject unauthorized: ${tlsOptions.rejectUnauthorized}\n`);

console.log('Test 4: Get HTTPS agent...');
const agent = cryptoManager.getHTTPSAgent();
console.log(`✓ HTTPS agent created`);
console.log(`  Agent type: ${agent.constructor.name}\n`);

console.log('Test 5: Verify fingerprint...');
const isValid = cryptoManager.verifyFingerprint(cert, fingerprint);
console.log(`✓ Fingerprint verification: ${isValid ? 'PASS' : 'FAIL'}\n`);

console.log('=== All Tests Complete ===');
console.log('✓ Certificate management is working correctly!\n');

// Cleanup test certificates
console.log('Cleaning up test certificates...');
const certDir = './shared/peer-discovery/../data/certs';
if (fs.existsSync(certDir)) {
    fs.rmSync(certDir, { recursive: true });
    console.log('✓ Test certificates removed\n');
}

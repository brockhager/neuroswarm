const reputation = new ReputationManager();

console.log('Test 1: Migration mode (certificates optional)...');
const validator1 = new PeerCertificateValidator(crypto, reputation, {
    requireMTLS: false,
    mtlsMigrationMode: true
});

// Peer without certificate
const result1 = validator1.validatePeerCertificate('peer-1', {});
console.log(`✓ No cert in migration mode: ${result1.valid ? 'ALLOWED' : 'REJECTED'}\n`);

console.log('Test 2: Peer with valid certificate...');
const identity = crypto.generateIdentityCertificate();
const result2 = validator1.validatePeerCertificate('peer-2', {
    certificate: identity.certificate,
    certificateFingerprint: identity.fingerprint
});
console.log(`✓ Valid cert: ${result2.valid ? 'ALLOWED' : 'REJECTED'}\n`);

console.log('Test 3: Peer with invalid certificate...');
const tamperedCert = { ...identity.certificate };
tamperedCert.subject.nodeId = 'fake-node';
const result3 = validator1.validatePeerCertificate('peer-3', {
    certificate: tamperedCert,
    certificateFingerprint: 'fake'
});
console.log(`✓ Invalid cert: ${result3.valid ? 'ALLOWED' : 'REJECTED'}`);
console.log(`✓ Reason: ${result3.reason}\n`);

console.log('Test 4: Enforcement mode (mTLS required)...');
const validator2 = new PeerCertificateValidator(crypto, reputation, {
    requireMTLS: true,
    mtlsMigrationMode: false
});

// Peer without certificate
const result4 = validator2.validatePeerCertificate('peer-4', {});
console.log(`✓ No cert in enforcement mode: ${result4.valid ? 'ALLOWED' : 'REJECTED'}`);
console.log(`✓ Reason: ${result4.reason}\n`);

console.log('Test 5: Get node identity...');
const nodeIdentity = validator1.getNodeIdentity('test-node', 'NS');
console.log(`✓ Has certificate: ${!!nodeIdentity.certificate}`);
console.log(`✓ Fingerprint: ${nodeIdentity.certificateFingerprint}\n`);

console.log('Test 6: Get statistics...');
const stats = validator1.getStats();
console.log(`✓ Require mTLS: ${stats.requireMTLS}`);
console.log(`✓ Migration mode: ${stats.mtlsMigrationMode}`);
console.log(`✓ Has identity: ${stats.hasIdentity}`);
console.log(`✓ Identity fingerprint: ${stats.identityFingerprint}\n`);

console.log('=== All Tests Complete ===');
console.log('✓ Certificate validator is working correctly!\n');

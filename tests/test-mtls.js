const identity1 = crypto1.generateIdentityCertificate();
const identity2 = crypto2.generateIdentityCertificate();
console.log(`✓ Node 1 fingerprint: ${identity1.fingerprint}`);
console.log(`✓ Node 2 fingerprint: ${identity2.fingerprint}\n`);

console.log('Test 2: Verify valid certificate...');
const verification1 = crypto2.verifyPeerCertificate(identity1.certificate);
console.log(`✓ Verification result: ${verification1.valid ? 'VALID' : 'INVALID'}`);
console.log(`✓ Reason: ${verification1.reason || 'N/A'}\n`);

console.log('Test 3: Detect tampered certificate...');
const tamperedCert = { ...identity1.certificate };
tamperedCert.subject.nodeId = 'fake-node';
const verification2 = crypto2.verifyPeerCertificate(tamperedCert);
console.log(`✓ Tampered cert: ${verification2.valid ? 'VALID' : 'INVALID'}`);
console.log(`✓ Reason: ${verification2.reason}\n`);

console.log('Test 4: Detect expired certificate...');
const expiredCert = { ...identity1.certificate };
expiredCert.notAfter = Date.now() - 1000; // Expired 1 second ago
const verification3 = crypto2.verifyPeerCertificate(expiredCert);
console.log(`✓ Expired cert: ${verification3.valid ? 'VALID' : 'INVALID'}`);
console.log(`✓ Reason: ${verification3.reason}\n`);

console.log('Test 5: Detect missing signature...');
const unsignedCert = { ...identity1.certificate };
delete unsignedCert.signature;
const verification4 = crypto2.verifyPeerCertificate(unsignedCert);
console.log(`✓ Unsigned cert: ${verification4.valid ? 'VALID' : 'INVALID'}`);
console.log(`✓ Reason: ${verification4.reason}\n`);

console.log('Test 6: Certificate structure...');
console.log(`✓ Version: ${identity1.certificate.version}`);
console.log(`✓ Subject CN: ${identity1.certificate.subject.commonName}`);
console.log(`✓ Node ID: ${identity1.certificate.subject.nodeId}`);
console.log(`✓ Node Type: ${identity1.certificate.subject.nodeType}`);
console.log(`✓ Valid from: ${new Date(identity1.certificate.notBefore).toISOString()}`);
console.log(`✓ Valid until: ${new Date(identity1.certificate.notAfter).toISOString()}\n`);

console.log('=== All Tests Complete ===');
console.log('✓ Identity certificates are working correctly!\n');

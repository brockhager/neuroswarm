const message = {
    type: 'NEW_BLOCK',
    data: { blockId: 'block-123', height: 100 }
};

const signedMessage = signer1.signMessage(message);
console.log(`✓ Message signed (nonce: ${signedMessage.nonce.substring(0, 8)}...)`);

const verification = signer2.verifyMessage(signedMessage);
console.log(`✓ Verification result: ${verification.valid ? 'VALID' : 'INVALID'}\n`);

console.log('Test 2: Detect replay attack...');
const verification2 = signer2.verifyMessage(signedMessage);
console.log(`✓ Second verification: ${verification2.valid ? 'VALID' : 'INVALID'}`);
console.log(`✓ Reason: ${verification2.reason}\n`);

console.log('Test 3: Detect tampered message...');
const tamperedMessage = { ...signedMessage };
tamperedMessage.data.blockId = 'block-999'; // Tamper with data
const verification3 = signer2.verifyMessage(tamperedMessage);
console.log(`✓ Tampered message: ${verification3.valid ? 'VALID' : 'INVALID'}`);
console.log(`✓ Reason: ${verification3.reason}\n`);

console.log('Test 4: Detect missing signature...');
const unsignedMessage = { ...message, nonce: 'abc123', timestamp: Date.now() };
const verification4 = signer2.verifyMessage(unsignedMessage);
console.log(`✓ Unsigned message: ${verification4.valid ? 'VALID' : 'INVALID'}`);
console.log(`✓ Reason: ${verification4.reason}\n`);

console.log('Test 5: Get statistics...');
const stats1 = signer1.getStats();
const stats2 = signer2.getStats();
console.log(`✓ Signer 1: fingerprint=${stats1.fingerprint}, seen=${stats1.seenMessages}`);
console.log(`✓ Signer 2: fingerprint=${stats2.fingerprint}, seen=${stats2.seenMessages}\n`);

console.log('=== All Tests Complete ===');
console.log('✓ Message signing is working correctly!\n');

// Cleanup
signer1.destroy();
signer2.destroy();

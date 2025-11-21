// Clean up
if (fs.existsSync(TEST_LOG_FILE)) {
    fs.unlinkSync(TEST_LOG_FILE);
}

// Setup components
const crypto = new CryptoManager({ nodeId: 'test-node', nodeType: 'NS' });
const logger = new SecurityLogger({
    timelineFile: TEST_LOG_FILE,
    contributorId: 'test-node',
    enableSnapshots: false
});

const peerManager = new PeerManager({
    nodeId: 'test-node',
    crypto: crypto,
    securityLogger: logger,
    requireMTLS: true // Enable mTLS to test cert logging
});

const p2p = new P2PProtocol(peerManager, {
    securityLogger: logger,
    enableRateLimiting: true,
    messagesPerSec: 1 // Low limit to trigger violation
});

// Test 1: Certificate Failure Logging
console.log('Test 1: Certificate Failure Logging...');
peerManager.addPeer({
    host: 'localhost',
    port: 3001,
    // No certificate provided -> Should fail in enforcement mode
});

// Test 2: Rate Limit Logging
console.log('Test 2: Rate Limit Logging...');
const msg = p2p.createMessage(MessageType.PING, {}, 'peer-1');
// Send 2 messages to trigger limit (limit is 1/sec)
await p2p.handleMessage(msg, 'peer-1');
await p2p.handleMessage(msg, 'peer-1');

// Test 3: Signature Failure Logging
console.log('Test 3: Signature Failure Logging...');
const signedMsg = p2p.createMessage(MessageType.NEW_BLOCK, { data: 'block' }, 'peer-2');
signedMsg.signature = 'invalid-signature'; // Force invalid signature
await p2p.handleMessage(signedMsg, 'peer-2');

// Verify Log File
console.log('\nVerifying log file...');
if (fs.existsSync(TEST_LOG_FILE)) {
    const content = fs.readFileSync(TEST_LOG_FILE, 'utf8');
    const lines = content.trim().split('\n');

    console.log(`✓ Log file contains ${lines.length} entries`);

    const events = lines.map(line => JSON.parse(line));

    const certEvent = events.find(e => e.eventType === 'MISSING_CERTIFICATE' || e.eventType === 'INVALID_CERTIFICATE');
    console.log(`✓ Certificate Event: ${certEvent ? 'FOUND' : 'MISSING'} (${certEvent?.eventType})`);

    const rateEvent = events.find(e => e.eventType === 'RATE_LIMIT_EXCEEDED');
    console.log(`✓ Rate Limit Event: ${rateEvent ? 'FOUND' : 'MISSING'}`);

    const sigEvent = events.find(e => e.eventType === 'INVALID_SIGNATURE');
    console.log(`✓ Signature Event: ${sigEvent ? 'FOUND' : 'MISSING'}`);

    // Clean up
    fs.unlinkSync(TEST_LOG_FILE);
} else {
    console.error('❌ Log file not found');
}

console.log('\n=== Integration Test Complete ===');

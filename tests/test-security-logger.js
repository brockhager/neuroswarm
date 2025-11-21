if (fs.existsSync(TEST_FILE)) {
    fs.unlinkSync(TEST_FILE);
}

// Initialize logger
const logger = new SecurityLogger({
    timelineFile: TEST_FILE,
    contributorId: 'test-node-1',
    enableSnapshots: false // Disable auto snapshots for test
});

console.log('Test 1: Log security event (HIGH severity)...');
logger.logSecurityEvent('INVALID_SIGNATURE', 'peer-123', {
    messageType: 'NEW_BLOCK',
    reason: 'Signature verification failed'
});

console.log('Test 2: Log security event (MEDIUM severity)...');
logger.logSecurityEvent('RATE_LIMIT_EXCEEDED', 'peer-456', {
    limit: 10,
    actual: 15
});

console.log('Test 3: Log security snapshot...');
logger.logSecuritySnapshot({
    totalPeers: 10,
    bannedPeers: 1,
    invalidSignatures: 5
});

// Verify file contents
console.log('\nVerifying log file content...');

if (fs.existsSync(TEST_FILE)) {
    const content = fs.readFileSync(TEST_FILE, 'utf8');
    const lines = content.trim().split('\n');

    console.log(`✓ File created with ${lines.length} entries`);

    const event1 = JSON.parse(lines[0]);
    console.log(`✓ Entry 1: ${event1.eventType} (${event1.severity})`);

    const event2 = JSON.parse(lines[1]);
    console.log(`✓ Entry 2: ${event2.eventType} (${event2.severity})`);

    const snapshot = JSON.parse(lines[2]);
    console.log(`✓ Entry 3: ${snapshot.type} (Stats: ${JSON.stringify(snapshot.stats)})`);

    // Clean up
    fs.unlinkSync(TEST_FILE);
    console.log('\n✓ Test file cleaned up');
} else {
    console.error('❌ Test file was not created');
}

console.log('\n=== All Tests Complete ===');

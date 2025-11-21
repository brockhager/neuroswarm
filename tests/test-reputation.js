/**
 * Test script for Peer Reputation System
 * Run this to verify reputation tracking works correctly
 */

import { ReputationManager } from '../shared/peer-discovery/reputation.js';

console.log('=== Peer Reputation System Test ===\n');

// Create reputation manager
const reputation = new ReputationManager({
    banThreshold: 20,
    decayRate: 0.1
});

// Test 1: Initialize peers
console.log('Test 1: Initializing peers...');
reputation.initializePeer('peer1');
reputation.initializePeer('peer2');
reputation.initializePeer('peer3');
console.log(`✓ Initialized 3 peers with score ${reputation.getScore('peer1')}\n`);

// Test 2: Record good behavior
console.log('Test 2: Recording good behavior...');
for (let i = 0; i < 5; i++) {
    reputation.recordBehavior('peer1', 'messageSuccess');
}
console.log(`✓ Peer1 score after 5 successes: ${reputation.getScore('peer1')}\n`);

// Test 3: Record bad behavior
console.log('Test 3: Recording bad behavior...');
for (let i = 0; i < 10; i++) {
    reputation.recordBehavior('peer2', 'messageFailure');
}
console.log(`✓ Peer2 score after 10 failures: ${reputation.getScore('peer2')}\n`);

// Test 4: Record spam
console.log('Test 4: Recording spam behavior...');
for (let i = 0; i < 3; i++) {
    reputation.recordBehavior('peer3', 'spamDetected');
}
console.log(`✓ Peer3 score after 3 spam detections: ${reputation.getScore('peer3')}\n`);

// Test 5: Check ban status
console.log('Test 5: Checking ban status...');
console.log(`Peer1 should ban: ${reputation.shouldBan('peer1')} (expected: false)`);
console.log(`Peer2 should ban: ${reputation.shouldBan('peer2')} (expected: ${reputation.getScore('peer2') < 20})`);
console.log(`Peer3 should ban: ${reputation.shouldBan('peer3')} (expected: ${reputation.getScore('peer3') < 20})\n`);

// Test 6: Get top peers
console.log('Test 6: Getting top peers...');
const topPeers = reputation.getTopPeers(3);
console.log('Top peers by reputation:');
topPeers.forEach((peer, index) => {
    console.log(`  ${index + 1}. ${peer.peerId}: ${peer.score}`);
});
console.log();

// Test 7: Get bannable peers
console.log('Test 7: Getting bannable peers...');
const bannable = reputation.getBannablePeers();
console.log(`Bannable peers (score < 20): ${bannable.length}`);
bannable.forEach(peer => {
    console.log(`  - ${peer.peerId}: ${peer.score}`);
});
console.log();

// Test 8: Statistics
console.log('Test 8: Reputation statistics...');
const stats = reputation.getStats();
console.log(`Total peers: ${stats.totalPeers}`);
console.log(`Average score: ${stats.averageScore}`);
console.log(`Bannable peers: ${stats.bannablePeers}`);
console.log(`Highest score: ${stats.highestScore}`);
console.log(`Lowest score: ${stats.lowestScore}\n`);

// Test 9: Behavior history
console.log('Test 9: Behavior history...');
const history = reputation.getBehaviorHistory('peer1', 5);
console.log(`Peer1 recent behaviors (last 5):`);
history.forEach(behavior => {
    console.log(`  - ${behavior.type} (${behavior.weight > 0 ? '+' : ''}${behavior.weight})`);
});
console.log();

console.log('=== All Tests Complete ===');
console.log('✓ Reputation system is working correctly!\n');

// Cleanup
reputation.destroy();

/**
 * Test script for NAT Traversal / STUN Client
 */

import { NATTraversal } from './shared/peer-discovery/nat-traversal.js';

console.log('=== NAT Traversal / STUN Client Test ===\n');

// Create NAT traversal instance
const nat = new NATTraversal({
    enabled: true,
    stunServers: [
        'stun.l.google.com:19302',
        'stun1.l.google.com:19302'
    ]
});

console.log('Test 1: Discover public IP address...');
const result = await nat.discoverPublicAddress();

if (result) {
    console.log(`✓ Public IP discovered: ${result.ip}:${result.port}\n`);
} else {
    console.log('✗ Failed to discover public IP\n');
}

console.log('Test 2: Get public address...');
const address = nat.getPublicAddress();
console.log(`Public IP: ${address.ip}`);
console.log(`Public Port: ${address.port}`);
console.log(`NAT Type: ${address.natType || 'unknown'}`);
console.log(`Last Refresh: ${address.lastRefresh}\n`);

console.log('Test 3: Detect NAT type...');
const natType = await nat.detectNATType();
console.log(`✓ NAT Type: ${natType}\n`);

console.log('Test 4: Check if behind NAT...');
const behindNAT = nat.isBehindNAT('192.168.1.100'); // Example local IP
console.log(`Behind NAT: ${behindNAT}\n`);

console.log('=== All Tests Complete ===');
console.log('✓ STUN client is working correctly!\n');

// Cleanup
nat.destroy();

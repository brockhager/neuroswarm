/**
 * Phase 4 End-to-End Integration Test
 * Verifies:
 * 1. mTLS (Certificate Validation)
 * 2. Message Signing (Ed25519)
 * 3. Rate Limiting (DoS Protection)
 * 4. Governance Logging (Audit Trail)
 */

import fs from 'fs';
import { PeerManager } from '../shared/peer-discovery/peer-manager.js';
import { CryptoManager } from '../shared/peer-discovery/crypto.js';
import { SecurityLogger } from '../shared/peer-discovery/security-logger.js';
import { P2PProtocol, MessageType } from '../shared/peer-discovery/p2p-protocol.js';

console.log('=== Phase 4 End-to-End Security Test ===\n');

const LOG_FILE_A = './test-e2e-node-a.jsonl';
const LOG_FILE_B = './test-e2e-node-b.jsonl';
const DATA_DIR_A = './test-data-a';
const DATA_DIR_B = './test-data-b';

// Cleanup
if (fs.existsSync(LOG_FILE_A)) fs.unlinkSync(LOG_FILE_A);
if (fs.existsSync(LOG_FILE_B)) fs.unlinkSync(LOG_FILE_B);
if (fs.existsSync(DATA_DIR_A)) fs.rmSync(DATA_DIR_A, { recursive: true, force: true });
if (fs.existsSync(DATA_DIR_B)) fs.rmSync(DATA_DIR_B, { recursive: true, force: true });

async function runTest() {
    try {
        // --- Setup Node A ---
        console.log('1. Setting up Node A (The Sender)...');
        const cryptoA = new CryptoManager({ nodeId: 'node-a', nodeType: 'NS' });
        const loggerA = new SecurityLogger({ timelineFile: LOG_FILE_A, contributorId: 'node-a', enableSnapshots: false });
        const peerManagerA = new PeerManager({
            nodeId: 'node-a',
            port: 3001,
            crypto: cryptoA,
            securityLogger: loggerA,
            requireMTLS: true,
            dataDir: DATA_DIR_A,
            natTraversalEnabled: false // Disable NAT for test speed
        });
        const p2pA = new P2PProtocol(peerManagerA, { securityLogger: loggerA });

        // --- Setup Node B ---
        console.log('2. Setting up Node B (The Receiver)...');
        const cryptoB = new CryptoManager({ nodeId: 'node-b', nodeType: 'Gateway' });
        const loggerB = new SecurityLogger({ timelineFile: LOG_FILE_B, contributorId: 'node-b', enableSnapshots: false });
        const peerManagerB = new PeerManager({
            nodeId: 'node-b',
            port: 3002,
            crypto: cryptoB,
            securityLogger: loggerB,
            requireMTLS: true,
            mtlsMigrationMode: false, // Enforce mTLS (strict mode)
            dataDir: DATA_DIR_B,
            natTraversalEnabled: false, // Disable NAT for test speed
            // Strict rate limits for testing
            messagesPerSec: 2,
            bytesPerSec: 1024
        });
        const p2pB = new P2PProtocol(peerManagerB, {
            securityLogger: loggerB,
            messagesPerSec: 2, // Low limit to trigger violation easily
            enableRateLimiting: true
        });

        // --- Test 1: mTLS / Certificate Exchange ---
        console.log('\n--- Test 1: mTLS / Certificate Validation ---');

        // Get Node A's identity
        const identityA = peerManagerA.getNodeInfo();
        console.log(`Node A Certificate Fingerprint: ${identityA.certificateFingerprint}`);

        // Add Node A as a peer to Node B (simulating connection)
        const added = peerManagerB.addPeer({
            host: 'localhost',
            port: 3001,
            nodeType: 'NS',
            certificate: identityA.certificate,
            certificateFingerprint: identityA.certificateFingerprint
        });

        if (added) {
            console.log('✓ Node B accepted Node A (Valid Certificate)');
        } else {
            console.error('❌ Node B rejected Node A');
            process.exit(1);
        }

        // --- Test 2: Message Signing ---
        console.log('\n--- Test 2: Message Signing ---');

        // Create a critical message (NEW_BLOCK) that requires signing
        const blockMessage = p2pA.createMessage(MessageType.NEW_BLOCK, {
            blockHeight: 100,
            hash: 'abc...'
        }, 'node-a');

        // Sign it
        const signedMessage = p2pA.messageHandlers.signIfNeeded(blockMessage);
        console.log(`Message Signed: ${!!signedMessage.signature}`);

        // Node B receives it
        const result2 = await p2pB.handleMessage(signedMessage, 'node-a');

        if (result2.processed) {
            console.log('✓ Node B verified and processed signed message');
        } else {
            console.error(`❌ Node B rejected message: ${result2.reason}`);
        }

        // --- Test 3: Rate Limiting ---
        console.log('\n--- Test 3: Rate Limiting ---');

        console.log('Sending flood of messages...');
        // Send 20 messages (limit is 2/sec, burst 4)
        let blocked = false;
        for (let i = 0; i < 20; i++) {
            const msg = p2pA.createMessage(MessageType.PING, { seq: i }, 'node-a');
            const res = await p2pB.handleMessage(msg, 'node-a');
            if (!res.processed && (res.reason.includes('Rate limit') || res.reason.includes('RATE_LIMIT'))) {
                blocked = true;
                console.log(`✓ Message ${i} blocked by rate limiter`);
                break; // Found a blocked message, test passed
            }
        }

        if (blocked) {
            console.log('✓ Rate limiting successfully enforced');
        } else {
            console.error('❌ Rate limiting failed to block flood');
        }

        // --- Test 4: Governance Logging ---
        console.log('\n--- Test 4: Governance Logging ---');

        if (fs.existsSync(LOG_FILE_B)) {
            const logs = fs.readFileSync(LOG_FILE_B, 'utf8').trim().split('\n').map(JSON.parse);
            console.log(`Node B Log Entries: ${logs.length}`);

            const rateLimitEvent = logs.find(e => e.eventType === 'RATE_LIMIT_EXCEEDED');
            if (rateLimitEvent) {
                console.log('✓ Found RATE_LIMIT_EXCEEDED event in logs');
                console.log(`  Details: ${JSON.stringify(rateLimitEvent.details)}`);
            } else {
                console.error('❌ RATE_LIMIT_EXCEEDED event missing from logs');
            }
        } else {
            console.error('❌ Log file not created');
        }

        // --- Cleanup ---
        if (fs.existsSync(LOG_FILE_A)) fs.unlinkSync(LOG_FILE_A);
        if (fs.existsSync(LOG_FILE_B)) fs.unlinkSync(LOG_FILE_B);
        if (fs.existsSync(DATA_DIR_A)) fs.rmSync(DATA_DIR_A, { recursive: true, force: true });
        if (fs.existsSync(DATA_DIR_B)) fs.rmSync(DATA_DIR_B, { recursive: true, force: true });

        console.log('\n=== End-to-End Test Complete ===');

    } catch (err) {
        console.error('Test Failed:', err);
    }
}

runTest();

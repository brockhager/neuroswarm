
import { P2PProtocol, MessageType } from './shared/peer-discovery/p2p-protocol.js';
import { ConsensusManager } from './shared/peer-discovery/consensus-manager.js';

// Mock PeerManager
class MockPeerManager {
    constructor(nodeId) {
        this.nodeId = nodeId;
        this.peers = [];
        this.reputation = {
            getScore: () => 100,
            recordBehavior: () => { },
            slashPeer: () => console.log('Peer slashed')
        };
    }

    getAllPeers() {
        return this.peers;
    }

    addPeer(peer) {
        this.peers.push(peer);
    }

    updatePeerHealth() { }
}

// Mock Server for receiving messages
import http from 'http';

const PORT = 3010;
let receivedMessages = [];

const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        if (req.url === '/p2p/message') {
            const msg = JSON.parse(body);
            receivedMessages.push(msg);
            res.writeHead(200);
            res.end();
        }
    });
});

server.listen(PORT, async () => {
    console.log(`🧪 Starting Performance Test on port ${PORT}...`);

    try {
        // Setup P2P Protocol
        const peerManager = new MockPeerManager('node-test');
        peerManager.addPeer({ id: 'peer-1', host: 'localhost', port: PORT });

        const p2p = new P2PProtocol(peerManager, {
            enableBatching: true,
            batchInterval: 500, // Wait 500ms to collect batch
            maxBatchSize: 10,
            enableCompression: true,
            compressionThreshold: 100 // Compress small messages for testing
        });

        // --- Test 1: Message Batching ---
        console.log('\n--- Testing Message Batching ---');
        receivedMessages = []; // Clear buffer

        // Send 5 small messages quickly
        for (let i = 0; i < 5; i++) {
            await p2p.broadcastMessage(p2p.createMessage(MessageType.NEW_TX, { value: i }, 'node-test'));
        }

        console.log('Sent 5 messages. Waiting for batch flush...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (receivedMessages.length === 1 && receivedMessages[0].type === MessageType.BATCH) {
            console.log('✅ Batching working: Received 1 BATCH message containing 5 sub-messages');
            console.log(`   Batch payload size: ${receivedMessages[0].payload.length}`);
        } else {
            console.error('❌ Batching failed:', receivedMessages);
        }

        // --- Test 2: Compression ---
        console.log('\n--- Testing Compression ---');
        receivedMessages = [];

        // Create a large message
        const largePayload = 'A'.repeat(1000);
        const largeMsg = p2p.createMessage(MessageType.NEW_BLOCK, { data: largePayload }, 'node-test');

        await p2p.broadcastMessage(largeMsg);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 500));

        const lastMsg = receivedMessages[0];
        if (lastMsg && lastMsg.compressed) {
            console.log('✅ Compression working: Message received with compressed flag');
            console.log(`   Compressed data length: ${lastMsg.data.length}`);

            // Verify decompression
            const processed = await p2p.handleMessage(lastMsg);

            if (processed.processed) {
                if (processed.payload && processed.payload.data === largePayload) {
                    console.log('✅ Decompression successful: Payload matches original');
                } else {
                    console.error('❌ Decompression failed: Payload mismatch or missing');
                }
            } else {
                console.error(`❌ Message processing failed: ${processed.reason}`);
            }
        } else {
            console.error('❌ Compression failed: Message not compressed', lastMsg);
        }

        // --- Test 3: Parallel Validation ---
        console.log('\n--- Testing Parallel Validation ---');

        const consensus = new ConsensusManager({
            reputationManager: peerManager.reputation
        });

        const votes = [];
        for (let i = 0; i < 10; i++) {
            votes.push({
                blockHash: '0xBLOCK123',
                blockHeight: 100,
                signature: `sig-${i}`
            });
        }

        const start = Date.now();
        const results = await consensus.handleVoteBatch(votes, 'peer-batch-tester');
        const duration = Date.now() - start;

        if (results.length === 10 && results.every(r => r.valid || r.ignored)) {
            console.log(`✅ Parallel validation successful: Processed 10 votes in ${duration}ms`);
        } else {
            console.error('❌ Parallel validation failed', results);
        }

        console.log('\n🎉 Performance Tests Complete!');

    } catch (err) {
        console.error('Test failed with error:', err);
    } finally {
        console.log('Cleaning up...');
        server.close();
        setTimeout(() => process.exit(0), 100);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

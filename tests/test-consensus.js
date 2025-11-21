/**
 * Test Script for Consensus Finality
 * Verifies voting, quorum, and fork choice logic
 */

import { ConsensusManager } from './shared/peer-discovery/consensus-manager.js';
import { ForkChoice } from './shared/peer-discovery/fork-choice.js';
import { ReputationManager } from './shared/peer-discovery/reputation.js';

// Mock MessageSigner
const mockSigner = {
    verifyMessage: () => ({ valid: true })
};

async function runTest() {
    console.log('🧪 Starting Consensus Finality Test...\n');

    // 1. Setup
    const reputation = new ReputationManager();
    const consensus = new ConsensusManager({
        reputationManager: reputation,
        messageSigner: mockSigner,
        quorumThreshold: 0.6, // 60% for test
        minParticipants: 3
    });
    const forkChoice = new ForkChoice({ consensusManager: consensus });

    // Initialize peers with reputation
    reputation.initializePeer('peer1'); // Score 50
    reputation.initializePeer('peer2'); // Score 50
    reputation.initializePeer('peer3'); // Score 50

    // Boost peer1 reputation
    reputation.scores.set('peer1', 80);

    console.log('--- Initial State ---');
    console.log('Peer1 Score:', reputation.getScore('peer1'));
    console.log('Peer2 Score:', reputation.getScore('peer2'));
    console.log('Peer3 Score:', reputation.getScore('peer3'));
    console.log('Total Network Rep (approx):', consensus.getTotalNetworkReputation());

    // 2. Test Voting & Quorum
    console.log('\n--- Testing Voting ---');
    const blockHash = 'block_abc123';
    const blockHeight = 100;

    // Vote 1 (Peer 2)
    consensus.handleVote({
        blockHash,
        blockHeight,
        signature: 'sig2'
    }, 'peer2');

    console.log('Is Finalized (1 vote)?', consensus.isFinalized(blockHash)); // Should be false

    // Vote 2 (Peer 3)
    consensus.handleVote({
        blockHash,
        blockHeight,
        signature: 'sig3'
    }, 'peer3');

    console.log('Is Finalized (2 votes)?', consensus.isFinalized(blockHash)); // Should be false (50+50 = 100 / ~330 < 0.6)

    // Vote 3 (Peer 1 - High Rep)
    consensus.handleVote({
        blockHash,
        blockHeight,
        signature: 'sig1'
    }, 'peer1');

    console.log('Is Finalized (3 votes)?', consensus.isFinalized(blockHash)); // Should be true (100+80 = 180 / ~330 > 0.5? Wait, total is 50+50+80+100(self) = 280. 180/280 = 0.64 > 0.6)

    if (consensus.isFinalized(blockHash)) {
        console.log('✅ Block Finalized successfully!');
    } else {
        console.error('❌ Block failed to finalize');
    }

    // 3. Test Fork Choice
    console.log('\n--- Testing Fork Choice ---');

    const candidates = [
        { hash: 'block_old', height: 90 },
        { hash: 'block_fork_a', height: 105 }, // Higher but maybe invalid if we had ancestry
        { hash: 'block_fork_b', height: 102 },
        { hash: blockHash, height: 100 } // Finalized one
    ];

    // Since blockHash is finalized at height 100, any valid head must be > 100
    // ForkChoice basic logic just picks highest for now, but respects finality check

    const head = forkChoice.getHead(candidates);
    console.log('Selected Head:', head);

    if (head && head.height >= 100) {
        console.log('✅ Fork Choice selected valid head');
    } else {
        console.error('❌ Fork Choice failed');
    }

    // Cleanup
    reputation.destroy();
    console.log('\nTest Complete.');
}

runTest().catch(console.error);

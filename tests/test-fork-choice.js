/**
 * Test Script for Phase 9: Consensus Finality & Fork Resolution
 * Verifies reorg limits, ancestry checks, and slashing conditions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ForkChoice } from './shared/peer-discovery/fork-choice.js';
import { ConsensusManager } from './shared/peer-discovery/consensus-manager.js';
import { SecurityLogger } from './shared/peer-discovery/security-logger.js';
import { ReputationManager } from './shared/peer-discovery/reputation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
    console.log('🧪 Starting Fork Choice & Finality Test...\n');

    const testDir = path.join(__dirname, 'test-data-fork');
    const timelineFile = path.join(testDir, 'governance-timeline.jsonl');

    // Cleanup
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // 1. Setup Components
    const securityLogger = new SecurityLogger({
        enabled: true,
        dataDir: testDir,
        timelineFile: timelineFile,
        mockAnchoring: true
    });

    const reputationManager = new ReputationManager();
    const consensusManager = new ConsensusManager({
        reputationManager,
        securityLogger,
        quorumThreshold: 0.67, // High threshold to prevent immediate finalization
        minParticipants: 2 // Need 2 peers minimum
    });

    const forkChoice = new ForkChoice({
        consensusManager,
        maxReorgDepth: 5 // Small depth for testing
    });

    // 2. Test Ancestry Verification
    console.log('--- Testing Ancestry Verification ---');
    const finalizedHead = { hash: '0xGENESIS', height: 0 };

    const validBlock = { hash: '0xBLOCK1', height: 1, previousHash: '0xGENESIS' };
    const invalidBlock = { hash: '0xBAD', height: 1, previousHash: '0xUNKNOWN' };

    const isAncestryValid = forkChoice.verifyAncestry(validBlock, finalizedHead);
    const isAncestryInvalid = forkChoice.verifyAncestry(invalidBlock, finalizedHead);

    console.log(`Valid Ancestry Check: ${isAncestryValid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Invalid Ancestry Check: ${!isAncestryInvalid ? '✅ PASS' : '❌ FAIL'}`);

    // 3. Test Reorg Depth Limit
    console.log('\n--- Testing Reorg Depth Limit ---');
    const currentHead = { hash: '0xHEAD', height: 100 };
    const safeReorg = { hash: '0xSAFE', height: 98 }; // Depth 2
    const deepReorg = { hash: '0xDEEP', height: 90 }; // Depth 10 > 5

    const isSafe = forkChoice.isReorgSafe(currentHead, safeReorg);
    const isDeepSafe = forkChoice.isReorgSafe(currentHead, deepReorg);

    console.log(`Safe Reorg Check: ${isSafe ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Deep Reorg Check: ${!isDeepSafe ? '✅ PASS' : '❌ FAIL'}`);

    // 4. Test Slashing Condition (Double Voting)
    console.log('\n--- Testing Slashing Condition ---');
    const peerId = 'peer-evil';
    reputationManager.initializePeer(peerId);

    // Vote 1
    consensusManager.handleVote({
        blockHash: '0xBLOCK_A',
        blockHeight: 50,
        signature: 'sig1'
    }, peerId);

    // Vote 2 (Same height, different hash)
    consensusManager.handleVote({
        blockHash: '0xBLOCK_B',
        blockHeight: 50,
        signature: 'sig2'
    }, peerId);

    // Verify Slashing Log
    await new Promise(resolve => setTimeout(resolve, 500));

    if (fs.existsSync(timelineFile)) {
        const content = fs.readFileSync(timelineFile, 'utf8');
        if (content.includes('SLASHING_OFFENSE') && content.includes('DOUBLE_VOTE')) {
            console.log('✅ Slashing event logged successfully');
        } else {
            console.error('❌ Slashing event NOT found');
            console.log(content);
        }
    } else {
        console.error('❌ Timeline file missing');
    }

    // Check Reputation Slash
    const score = reputationManager.getScore(peerId);
    console.log(`Peer Score after slashing: ${score} (Expected: 0)`);
    if (score === 0) {
        console.log('✅ Peer slashed successfully');
    } else {
        console.error('❌ Peer score not reduced enough');
    }

    console.log('\n🎉 Phase 9 Test Complete!');
}

runTest().catch(console.error);

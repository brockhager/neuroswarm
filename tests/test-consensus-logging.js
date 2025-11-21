/**
 * Test Script for Phase 8: Governance Logging & Anchoring
 * Verifies that consensus events (Finality, Quorum) are logged to the timeline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SecurityLogger } from './shared/peer-discovery/security-logger.js';
import { ConsensusManager } from './shared/peer-discovery/consensus-manager.js';
import { ReputationManager } from './shared/peer-discovery/reputation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
    console.log('🧪 Starting Governance Logging Test...\n');

    const testDir = path.join(__dirname, 'test-data-gov');
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
        reputationManager: reputationManager,
        securityLogger: securityLogger,
        quorumThreshold: 0.1, // Low threshold for easy testing
        minParticipants: 1
    });

    // 2. Simulate Consensus Activity
    console.log('Simulating consensus voting...');

    const blockHash = '0x' + 'a'.repeat(64);
    const blockHeight = 100;
    const peerId = 'peer-1';

    // Initialize peer reputation so they have weight
    reputationManager.initializePeer(peerId);

    // Cast a vote
    // This should trigger quorum check -> pass -> finalize -> log events
    const vote = {
        blockHash,
        blockHeight,
        signature: 'mock-sig'
    };

    consensusManager.handleVote(vote, peerId);

    // 3. Verify Log File
    console.log('\nVerifying timeline log...');

    // Wait a moment for async file writes (though appendFileSync is sync)
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!fs.existsSync(timelineFile)) {
        console.error('❌ Timeline file not created');
        return;
    }

    const content = fs.readFileSync(timelineFile, 'utf8');
    const lines = content.trim().split('\n').map(line => JSON.parse(line));

    let foundQuorum = false;
    let foundFinality = false;

    for (const event of lines) {
        if (event.type === 'SECURITY_EVENT') {
            if (event.eventType === 'CONSENSUS_QUORUM') {
                console.log('✅ Found CONSENSUS_QUORUM event');
                foundQuorum = true;
            }
            if (event.eventType === 'CONSENSUS_FINALITY') {
                console.log('✅ Found CONSENSUS_FINALITY event');
                foundFinality = true;
            }
        }
    }

    if (foundQuorum && foundFinality) {
        console.log('\n✅ SUCCESS: All consensus events logged correctly.');
    } else {
        console.error('\n❌ FAILURE: Missing events.');
        console.log('Log content:', content);
    }

    // Cleanup
    // fs.rmSync(testDir, { recursive: true, force: true });
}

runTest().catch(console.error);

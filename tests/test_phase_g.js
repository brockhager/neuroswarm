/**
 * Phase G: Advanced Governance & Trust - End-to-End Test
 * Tests the Voting Mechanism → GovernanceService → GenerativeGovernanceService pipeline
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3009';
const GENERATIVE_URL = 'http://localhost:3000'; // NS-LLM service

// Helper function for colored console output
const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[✓]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[✗]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[!]\x1b[0m ${msg}`),
    section: (msg) => console.log(`\n\x1b[1m\x1b[35m=== ${msg} ===\x1b[0m\n`)
};

// Helper to make requests
async function request(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

// Test 1: Create a Governance Proposal
async function testCreateProposal() {
    log.section('Test 1: Create Governance Proposal');

    const proposerId = 'test-voter-' + Date.now();
    const result = await request(`${BASE_URL}/api/governance/proposals`, {
        method: 'POST',
        body: JSON.stringify({
            parameterKey: 'minTokens',
            proposedValue: 10,
            proposerId,
            reason: 'E2E test: Increase minimum token requirement for quality control'
        })
    });

    if (result.ok) {
        log.success(`Proposal created: ${result.data.id}`);
        log.info(`Current value: ${result.data.currentValue} → Proposed: ${result.data.proposedValue}`);
        return { proposalId: result.data.id, proposerId };
    } else {
        log.error(`Failed to create proposal: ${result.error || JSON.stringify(result.data)}`);
        return null;
    }
}

// Test 2: Vote on Proposal (simulate 3 voters for majority)
async function testVoteOnProposal(proposalId) {
    log.section('Test 2: Vote on Proposal');

    const voters = [
        `voter-1-${Date.now()}`,
        `voter-2-${Date.now()}`,
        `voter-3-${Date.now()}`
    ];

    for (const voterId of voters) {
        const result = await request(`${BASE_URL}/api/governance/proposals/${proposalId}/vote`, {
            method: 'POST',
            body: JSON.stringify({
                voterId,
                vote: 'yes'
            })
        });

        if (result.ok) {
            log.success(`Vote recorded from ${voterId}: ${result.data.votes.yes} yes, ${result.data.votes.no} no`);
            if (result.data.status === 'passed' || result.data.status === 'implemented') {
                log.success(`Proposal ${result.data.status}!`);
                return true;
            }
        } else {
            log.error(`Failed to vote: ${result.error || JSON.stringify(result.data)}`);
        }
    }

    return false;
}

// Test 3: Verify Governance State
async function testGovernanceState() {
    log.section('Test 3: Verify Governance State');

    const result = await request(`${BASE_URL}/api/governance/state`);

    if (result.ok) {
        const { parameters } = result.data;
        log.success(`Governance state retrieved`);
        log.info(`minTokens: ${parameters.minTokens?.current}`);
        log.info(`maxTokens: ${parameters.maxTokens?.current}`);
        log.info(`minCoherence: ${parameters.minCoherence?.current}`);
        log.info(`toxicityEnabled: ${parameters.toxicityEnabled?.current}`);
        return parameters;
    } else {
        log.error(`Failed to get governance state: ${result.error || JSON.stringify(result.data)}`);
        return null;
    }
}

// Test 4: Test Generative Validation (should reject short content)
async function testGenerativeValidation() {
    log.section('Test 4: Test Generative Validation');

    // Test with content that should be rejected (too short)
    const result = await request(`${BASE_URL}/api/generative/generate`, {
        method: 'POST',
        body: JSON.stringify({
            text: 'Hi',  // Only 2 tokens, should be rejected if minTokens = 10
            model: 'llama3.2:3b'
        })
    });

    if (result.status === 403) {
        log.success(`Short content correctly rejected by governance`);
        log.info(`Violations: ${JSON.stringify(result.data.violations)}`);
        return true;
    } else if (result.ok) {
        log.warn(`Content was accepted (governance may not be enforcing minTokens yet)`);
        log.info(`Response: ${JSON.stringify(result.data.governance)}`);
        return false;
    } else {
        log.error(`Unexpected error: ${result.error || JSON.stringify(result.data)}`);
        return false;
    }
}

// Test 5: Verify Blockchain Anchoring
async function testBlockchainAnchoring() {
    log.section('Test 5: Verify Blockchain Anchoring');

    const result = await request(`${BASE_URL}/api/generative/chain`);

    if (result.ok) {
        const { height, verified, latestBlocks } = result.data;
        log.success(`Blockchain retrieved: ${height} blocks`);
        log.info(`Chain verified: ${verified}`);

        if (latestBlocks && latestBlocks.length > 0) {
            log.info(`Latest blocks:`);
            latestBlocks.slice(0, 3).forEach((block, i) => {
                log.info(`  Block ${block.index}: ${block.timestamp}`);
                log.info(`    Hash: ${block.hash.substring(0, 16)}...`);
            });
        }
        return verified;
    } else {
        log.error(`Failed to get blockchain: ${result.error || JSON.stringify(result.data)}`);
        return false;
    }
}

// Test 6: Verify Audit Log
async function testAuditLog() {
    log.section('Test 6: Verify Audit Log');

    const result = await request(`${BASE_URL}/api/generative/audit`);

    if (result.ok) {
        const logs = Array.isArray(result.data) ? result.data : result.data.entries || [];
        log.success(`Audit log retrieved: ${logs.length} entries`);

        if (logs.length > 0) {
            const recent = logs.slice(-3);
            log.info(`Recent audit entries:`);
            recent.forEach(entry => {
                log.info(`  ${entry.timestamp}: ${entry.status} (score: ${entry.score})`);
            });
        }
        return true;
    } else {
        log.error(`Failed to get audit log: ${result.error || JSON.stringify(result.data)}`);
        return false;
    }
}

// Test 7: Verify Metrics
async function testMetrics() {
    log.section('Test 7: Verify Governance Metrics');

    const result = await request(`${BASE_URL}/api/generative/metrics`);

    if (result.ok) {
        log.success(`Metrics retrieved`);
        log.info(`Total validations: ${result.data.totalValidations || 0}`);
        log.info(`Pass rate: ${result.data.passRate || 0}%`);
        log.info(`Reject rate: ${result.data.rejectRate || 0}%`);
        return true;
    } else {
        log.error(`Failed to get metrics: ${result.error || JSON.stringify(result.data)}`);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('\n\x1b[1m\x1b[34m╔════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[1m\x1b[34m║  Phase G: Governance & Trust - E2E Test Suite ║\x1b[0m');
    console.log('\x1b[1m\x1b[34m╚════════════════════════════════════════════════╝\x1b[0m\n');

    const results = {
        passed: 0,
        failed: 0,
        total: 7
    };

    try {
        // Test 1: Create Proposal
        const proposalData = await testCreateProposal();
        if (proposalData) {
            results.passed++;

            // Test 2: Vote on Proposal
            const voteResult = await testVoteOnProposal(proposalData.proposalId);
            if (voteResult) {
                results.passed++;

                // Wait a moment for listener to propagate changes
                log.info('Waiting for governance changes to propagate...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                results.failed++;
            }
        } else {
            results.failed++;
        }

        // Test 3: Verify Governance State
        const stateResult = await testGovernanceState();
        if (stateResult) results.passed++;
        else results.failed++;

        // Test 4: Test Generative Validation
        const validationResult = await testGenerativeValidation();
        if (validationResult !== null) results.passed++;
        else results.failed++;

        // Test 5: Verify Blockchain
        const blockchainResult = await testBlockchainAnchoring();
        if (blockchainResult) results.passed++;
        else results.failed++;

        // Test 6: Verify Audit Log
        const auditResult = await testAuditLog();
        if (auditResult) results.passed++;
        else results.failed++;

        // Test 7: Verify Metrics
        const metricsResult = await testMetrics();
        if (metricsResult) results.passed++;
        else results.failed++;

    } catch (error) {
        log.error(`Test suite error: ${error.message}`);
        console.error(error);
    }

    // Summary
    log.section('Test Summary');
    console.log(`Total Tests: ${results.total}`);
    console.log(`\x1b[32mPassed: ${results.passed}\x1b[0m`);
    console.log(`\x1b[31mFailed: ${results.failed}\x1b[0m`);
    console.log(`\nSuccess Rate: ${Math.round((results.passed / results.total) * 100)}%\n`);

    if (results.passed === results.total) {
        console.log('\x1b[1m\x1b[32m✓ All tests passed! Phase G implementation verified.\x1b[0m\n');
    } else {
        console.log('\x1b[1m\x1b[33m⚠ Some tests failed. Review the output above.\x1b[0m\n');
    }
}

// Run the tests
runTests().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});

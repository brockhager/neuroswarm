// Quick test of Phase G voting mechanism
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3009';

async function testVoting() {
    console.log('🧪 Testing Phase G Voting Mechanism\n');

    // Step 1: Create a proposal
    console.log('1️⃣ Creating proposal to change minTokens to 10...');
    const proposalRes = await fetch(`${BASE_URL}/api/governance/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            parameterKey: 'minTokens',
            proposedValue: 10,
            proposerId: 'test-user-' + Date.now(),
            reason: 'Testing Phase G voting mechanism'
        })
    });
    const proposal = await proposalRes.json();
    console.log(`✅ Proposal created: ${proposal.id}`);
    console.log(`   Current: ${proposal.currentValue} → Proposed: ${proposal.proposedValue}\n`);

    // Step 2: Vote (need 3 votes for majority)
    console.log('2️⃣ Casting 3 votes...');
    for (let i = 1; i <= 3; i++) {
        const voteRes = await fetch(`${BASE_URL}/api/governance/proposals/${proposal.id}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                voterId: `voter-${i}-${Date.now()}`,
                vote: 'yes'
            })
        });
        const voteResult = await voteRes.json();
        console.log(`   Vote ${i}: ${voteResult.votes.yes} yes, ${voteResult.votes.no} no (status: ${voteResult.status})`);
    }

    // Step 3: Check governance state
    console.log('\n3️⃣ Checking governance state...');
    const stateRes = await fetch(`${BASE_URL}/api/governance/state`);
    const state = await stateRes.json();
    console.log(`✅ minTokens is now: ${state.parameters.minTokens.current}`);

    // Step 4: Test generative validation
    console.log('\n4️⃣ Testing generative validation with short text...');
    const genRes = await fetch(`${BASE_URL}/api/generative/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: 'Hi',  // Only 1-2 tokens, should be rejected if minTokens = 10
            model: 'llama3.2:3b'
        })
    });

    if (genRes.status === 403) {
        const error = await genRes.json();
        console.log(`✅ Short content correctly rejected!`);
        console.log(`   Violations: ${JSON.stringify(error.violations, null, 2)}`);
    } else {
        console.log(`⚠️  Content was not rejected (status: ${genRes.status})`);
    }

    // Step 5: Check blockchain
    console.log('\n5️⃣ Checking blockchain anchor...');
    const chainRes = await fetch(`${BASE_URL}/api/generative/chain`);
    const chain = await chainRes.json();
    console.log(`✅ Blockchain: ${chain.height} blocks, verified: ${chain.verified}`);

    console.log('\n✨ Phase G voting mechanism test complete!');
}

testVoting().catch(console.error);

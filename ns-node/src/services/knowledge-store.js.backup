import { storeKnowledge, queryKnowledge, checkIPFSStatus } from '../ns-node/src/services/knowledge-store.js';

async function testHeliaStorage() {
    console.log('Testing Helia IPFS Knowledge Storage\n');

    // 1. Check Helia status
    console.log('1. Starting Helia node...');
    const status = await checkIPFSStatus();
    console.log(`   Status: ${status.ok ? '✓' : '✗'} ${status.message}\n`);

    if (!status.ok) {
        console.log('⚠️  Helia failed to start. Check logs.\n');
        return;
    }

    // 2. Store knowledge
    console.log('2. Storing test knowledge...');
    const cid = await storeKnowledge({
        question: 'when was peru independent?',
        answer: 'Peru declared independence on July 28, 1821.',
        source: 'web-search',
        confidence: 0.95,
        nodeId: 'test-node-1'
    });

    if (cid) {
        console.log(`   ✓ Stored with CID: ${cid}\n`);
    } else {
        console.log(`   ✗ Failed to store\n`);
        return;
    }

    // 3. Query knowledge
    console.log('3. Querying stored knowledge...');
    const knowledge = await queryKnowledge('when was peru independent?');

    if (knowledge) {
        console.log(`   ✓ Retrieved answer: ${knowledge.answer}`);
        console.log(`   Confidence: ${knowledge.confidence}`);
        console.log(`   Source: ${knowledge.source}`);
        console.log(`   Expires: ${knowledge.expiresAt}\n`);
    } else {
        console.log(`   ✗ Not found\n`);
    }

    console.log('✅ Test complete! (Press Ctrl+C to exit as Helia node keeps running)');
}

testHeliaStorage().catch(console.error);

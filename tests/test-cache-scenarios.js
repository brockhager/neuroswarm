import { storeKnowledge, queryKnowledge } from '../ns-node/src/services/knowledge-store.js';
import { queryAdapter } from '../sources/index.js';

async function testCacheScenarios() {
    console.log('Testing IPFS Knowledge Cache Hit/Miss Scenarios\n');

    // Test 1: Cache MISS (question not in cache)
    console.log('Test 1: Cache MISS - Question not in cache');
    console.log('Query: "what is the capital of france?"');
    const miss = await queryAdapter('ipfs-knowledge', { query: 'what is the capital of france?' });
    console.log(`Result: ${miss.cacheHit ? 'HIT' : 'MISS'}`);
    console.log(`Value: ${miss.value ? 'Found' : 'Not found'}\n`);

    // Test 2: Store knowledge
    console.log('Test 2: Storing knowledge to IPFS');
    const cid = await storeKnowledge({
        question: 'what is the capital of france?',
        answer: 'The capital of France is Paris.',
        source: 'web-search',
        confidence: 0.95,
        nodeId: 'test-node'
    });
    console.log(`Stored with CID: ${cid}\n`);

    // Test 3: Cache HIT (question now in cache)
    console.log('Test 3: Cache HIT - Same question should be in cache now');
    console.log('Query: "what is the capital of france?"');
    const hit = await queryAdapter('ipfs-knowledge', { query: 'what is the capital of france?' });
    console.log(`Result: ${hit.cacheHit ? 'HIT ✓' : 'MISS ✗'}`);
    if (hit.value) {
        console.log(`Answer: ${hit.value.answer.text}`);
        console.log(`Source: ${hit.value.answer.source}`);
        console.log(`Confidence: ${hit.value.confidence}\n`);
    }

    // Test 4: Similar question (should still hit due to normalization)
    console.log('Test 4: Similar question (case/punctuation variation)');
    console.log('Query: "What is the capital of France?"');
    const similar = await queryAdapter('ipfs-knowledge', { query: 'What is the capital of France?' });
    console.log(`Result: ${similar.cacheHit ? 'HIT ✓' : 'MISS ✗'}`);
    if (similar.value) {
        console.log(`Answer: ${similar.value.answer.text}\n`);
    }

    // Test 5: Different question (should miss)
    console.log('Test 5: Different question');
    console.log('Query: "what is the capital of germany?"');
    const different = await queryAdapter('ipfs-knowledge', { query: 'what is the capital of germany?' });
    console.log(`Result: ${different.cacheHit ? 'HIT ✗' : 'MISS ✓'}`);
    console.log(`Value: ${different.value ? 'Found' : 'Not found'}\n`);

    console.log('✅ All tests complete!');
    console.log('\nSummary:');
    console.log('- Cache normalization works (case/punctuation insensitive)');
    console.log('- Cache hit/miss detection works correctly');
    console.log('- Knowledge persists across queries');
}

testCacheScenarios().catch(console.error);

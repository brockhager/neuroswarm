import { storeKnowledge, queryKnowledge } from '../ns-node/src/services/knowledge-store.js';
import { queryAdapter } from '../sources/index.js';

async function testSemanticSearch() {
    console.log('Testing Semantic Search with Keywords and Metadata\n');

    // Test 1: Store knowledge with keywords
    console.log('Test 1: Storing knowledge with metadata');
    const cid = await storeKnowledge({
        question: 'What is the capital city of France?',
        answer: 'The capital of France is Paris.',
        source: 'web-search',
        confidence: 0.95,
        nodeId: 'test-node'
    });
    console.log(`Stored with CID: ${cid}\n`);

    // Test 2: Exact match (should work as before)
    console.log('Test 2: Exact match');
    console.log('Query: "what is the capital city of france?"');
    const exact = await queryKnowledge('what is the capital city of france?');
    console.log(`Result: ${exact ? 'FOUND ✓' : 'NOT FOUND ✗'}`);
    if (exact) console.log(`Answer: ${exact.answer}\n`);

    // Test 3: Keyword match (different phrasing, same keywords)
    console.log('Test 3: Keyword match - different phrasing');
    console.log('Query: "capital france" (missing words, but has key terms)');
    const keyword1 = await queryKnowledge('capital france');
    console.log(`Result: ${keyword1 ? 'FOUND ✓' : 'NOT FOUND ✗'}`);
    if (keyword1) {
        console.log(`Answer: ${keyword1.answer}`);
        console.log(`Keywords matched: ${keyword1.keywords.join(', ')}\n`);
    }

    // Test 4: Semantic match (completely different phrasing)
    console.log('Test 4: Semantic match - rephrased question');
    console.log('Query: "france capital city" (different word order)');
    const keyword2 = await queryKnowledge('france capital city');
    console.log(`Result: ${keyword2 ? 'FOUND ✓' : 'NOT FOUND ✗'}`);
    if (keyword2) {
        console.log(`Answer: ${keyword2.answer}`);
        console.log(`Categories: ${keyword2.categories.join(', ')}\n`);
    }

    // Test 5: Partial keyword match
    console.log('Test 5: Partial keyword match');
    console.log('Query: "what city is the capital of france?"');
    const partial = await queryKnowledge('what city is the capital of france?');
    console.log(`Result: ${partial ? 'FOUND ✓' : 'NOT FOUND ✗'}`);
    if (partial) console.log(`Answer: ${partial.answer}\n`);

    // Test 6: No match (completely different topic)
    console.log('Test 6: No match - different topic');
    console.log('Query: "what is the speed of light?"');
    const nomatch = await queryKnowledge('what is the speed of light?');
    console.log(`Result: ${nomatch ? 'FOUND ✗' : 'NOT FOUND ✓'}\n`);

    console.log('✅ Semantic search test complete!');
    console.log('\nEnhancements:');
    console.log('- Keyword extraction removes stop words');
    console.log('- Topic categorization (geography, history, science, etc.)');
    console.log('- Fuzzy matching finds answers with 2+ matching keywords');
    console.log('- Works even with different word order or phrasing');
}

testSemanticSearch().catch(console.error);

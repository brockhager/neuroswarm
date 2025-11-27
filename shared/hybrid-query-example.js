/**
 * Hybrid Query Example
 * 
 * Demonstrates Retrieval-Augmented Generation (RAG) using the hybrid query system.
 */

const fetch = require('node-fetch');

const NS_NODE_URL = 'http://localhost:3009';

async function main() {
    console.log('=== Hybrid Query (RAG) Example ===\n');

    // Step 1: Add documents to the knowledge base
    console.log('1. Adding documents to knowledge base...');

    const documents = [
        {
            id: 'doc1',
            text: 'NeuroSwarm is a decentralized AI network that uses blockchain technology for consensus.',
            metadata: { category: 'overview' }
        },
        {
            id: 'doc2',
            text: 'The NS-LLM backend provides embedding and text generation capabilities using ONNX Runtime.',
            metadata: { category: 'technical' }
        },
        {
            id: 'doc3',
            text: 'Phase C introduced a client library with retry logic, circuit breaker, and metrics collection.',
            metadata: { category: 'features' }
        },
        {
            id: 'doc4',
            text: 'The hybrid query system combines vector search with text generation for intelligent responses.',
            metadata: { category: 'features' }
        }
    ];

    for (const doc of documents) {
        try {
            const response = await fetch(`${NS_NODE_URL}/api/hybrid/add-document`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(doc)
            });

            const result = await response.json();
            console.log(`   ✓ Added document: ${doc.id}`);
        } catch (error) {
            console.log(`   ✗ Failed to add ${doc.id}: ${error.message}`);
        }
    }

    console.log('');

    // Step 2: Check index stats
    console.log('2. Checking index statistics...');
    try {
        const response = await fetch(`${NS_NODE_URL}/api/hybrid/stats`);
        const stats = await response.json();
        console.log(`   Documents indexed: ${stats.documentCount}`);
        console.log(`   Embedding dimension: ${stats.dimension}`);
        console.log(`   Memory usage: ~${Math.round(stats.memoryUsage / 1024)}KB\n`);
    } catch (error) {
        console.log(`   ✗ Failed to get stats: ${error.message}\n`);
    }

    // Step 3: Perform hybrid queries
    console.log('3. Performing hybrid queries...\n');

    const queries = [
        'What is NeuroSwarm?',
        'Tell me about the NS-LLM backend',
        'What features were added in Phase C?'
    ];

    for (const query of queries) {
        console.log(`   Query: "${query}"`);

        try {
            const response = await fetch(`${NS_NODE_URL}/api/hybrid/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    topK: 2,
                    maxTokens: 50
                })
            });

            const result = await response.json();

            console.log(`   Response: "${result.text}"`);
            console.log(`   Score: ${(result.score.combined * 100).toFixed(1)}% (coherence: ${(result.score.coherence * 100).toFixed(1)}%, relevance: ${(result.score.relevance * 100).toFixed(1)}%)`);
            console.log(`   Sources: ${result.sources.length} documents retrieved`);
            result.sources.forEach((source, i) => {
                console.log(`     [${i + 1}] ${source.id} (score: ${(source.score * 100).toFixed(1)}%)`);
            });
            console.log(`   Metrics: ${result.metrics.totalTime}ms total (embed: ${result.metrics.embeddingTime}ms, retrieve: ${result.metrics.retrievalTime}ms, generate: ${result.metrics.generationTime}ms, score: ${result.metrics.scoringTime}ms)`);
            console.log('');
        } catch (error) {
            console.log(`   ✗ Query failed: ${error.message}\n`);
        }
    }

    console.log('=== Example Complete ===');
}

// Run example
main().catch(console.error);

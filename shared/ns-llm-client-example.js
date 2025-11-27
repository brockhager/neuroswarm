/**
 * NS-LLM Client - Example Usage
 * 
 * Demonstrates how to use the NS-LLM client library
 */

const nsLlm = require('./ns-llm-client');

async function main() {
    console.log('=== NS-LLM Client Example ===\n');

    // 1. Check backend health
    console.log('1. Checking backend health...');
    const healthy = await nsLlm.isHealthy();
    console.log(`   Backend healthy: ${healthy}\n`);

    if (!healthy) {
        console.log('   ⚠️  Backend not available. Make sure NS-LLM is running on http://127.0.0.1:5555');
        return;
    }

    // 2. Generate embedding
    console.log('2. Generating embedding...');
    try {
        const embedding = await nsLlm.embed('Hello, world!', { timeout: 5000 });
        console.log(`   ✓ Embedding generated (${embedding.length} dimensions)`);
        console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);
    } catch (error) {
        console.log(`   ✗ Embedding failed: ${error.message}\n`);
    }

    // 3. Generate text
    console.log('3. Generating text...');
    try {
        const result = await nsLlm.generate('The quick brown fox', {
            maxTokens: 10,
            timeout: 30000
        });
        console.log(`   ✓ Text generated:`);
        console.log(`   "${result.text}"`);
        console.log(`   Tokens generated: ${result.tokens_generated}\n`);
    } catch (error) {
        console.log(`   ✗ Generation failed: ${error.message}\n`);
    }

    // 4. Show metrics
    console.log('4. Client metrics:');
    const metrics = nsLlm.getMetrics();
    console.log(`   Total requests: ${metrics.totalRequests}`);
    console.log(`   Successful: ${metrics.successfulRequests}`);
    console.log(`   Failed: ${metrics.failedRequests}`);
    console.log(`   Retried: ${metrics.retriedRequests}`);
    console.log(`   Success rate: ${metrics.successRate}`);
    console.log(`   Average latency: ${Math.round(metrics.averageLatency)}ms`);
    console.log(`   Circuit breaker: ${metrics.circuitBreakerState}`);
    console.log(`   Circuit breaker trips: ${metrics.circuitBreakerTrips}\n`);

    // 5. Test retry logic (simulate failure)
    console.log('5. Testing retry logic with invalid endpoint...');
    const { NSLLMClient } = require('./ns-llm-client');
    const testClient = new NSLLMClient({
        baseUrl: 'http://127.0.0.1:9999', // Invalid port
        maxRetries: 2,
        retryDelay: 50
    });

    try {
        await testClient.embed('test');
    } catch (error) {
        console.log(`   ✓ Retry logic working (expected failure): ${error.message}`);
        const testMetrics = testClient.getMetrics();
        console.log(`   Retried requests: ${testMetrics.retriedRequests}\n`);
    }

    // 6. Test circuit breaker
    console.log('6. Testing circuit breaker...');
    const cbClient = new NSLLMClient({
        baseUrl: 'http://127.0.0.1:9999',
        maxRetries: 1,
        retryDelay: 10,
        circuitBreakerThreshold: 3
    });

    for (let i = 0; i < 5; i++) {
        try {
            await cbClient.embed('test');
        } catch (error) {
            const cbMetrics = cbClient.getMetrics();
            console.log(`   Attempt ${i + 1}: ${cbMetrics.circuitBreakerState} (failures: ${cbClient.failureCount})`);
        }
    }
    console.log('   ✓ Circuit breaker opened after threshold\n');

    console.log('=== Example Complete ===');

    // Clean up
    nsLlm.close();
    testClient.close();
    cbClient.close();
}

// Run example
main().catch(console.error);

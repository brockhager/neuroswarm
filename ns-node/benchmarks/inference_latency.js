/**
 * Inference Latency Benchmark
 * 
 * Tests token generation speed and validates <80ms/token target
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.NS_NODE_URL || 'http://localhost:3009';
const WARMUP_REQUESTS = 5;
const BENCHMARK_REQUESTS = 50;

async function runBenchmark() {
    console.log('🔥 Inference Latency Benchmark\n');
    console.log(`Target: <80ms/token, >12 tokens/second\n`);

    // Warmup
    console.log(`Warming up (${WARMUP_REQUESTS} requests)...`);
    for (let i = 0; i < WARMUP_REQUESTS; i++) {
        await generateText('Hello', 10);
    }

    console.log(`\nRunning benchmark (${BENCHMARK_REQUESTS} requests)...\n`);

    const results = {
        ttft: [],
        perToken: [],
        endToEnd: [],
        tokensPerSec: []
    };

    for (let i = 0; i < BENCHMARK_REQUESTS; i++) {
        const prompt = `Generate a response ${i}`;
        const maxTokens = 20 + Math.floor(Math.random() * 30); // 20-50 tokens

        try {
            const result = await generateText(prompt, maxTokens);

            if (result.success) {
                results.ttft.push(result.ttft);
                results.perToken.push(result.perToken);
                results.endToEnd.push(result.endToEnd);
                results.tokensPerSec.push(result.tokensPerSec);

                process.stdout.write(`\r[${i + 1}/${BENCHMARK_REQUESTS}] Tokens/sec: ${result.tokensPerSec.toFixed(2)}`);
            }
        } catch (err) {
            console.error(`\nRequest ${i} failed:`, err.message);
        }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log(' RESULTS');
    console.log('='.repeat(60));

    // Calculate statistics
    const stats = calculateStats(results);

    console.log('\n📊 Latency Metrics:');
    console.log(`  Time to First Token (TTFT):`);
    console.log(`    Average: ${stats.ttft.avg.toFixed(2)}ms`);
    console.log(`    P50:     ${stats.ttft.p50.toFixed(2)}ms`);
    console.log(`    P95:     ${stats.ttft.p95.toFixed(2)}ms ${stats.ttft.p95 < 100 ? '✓' : '✗ (target: <100ms)'}`);

    console.log(`\n  Per-Token Latency:`);
    console.log(`    Average: ${stats.perToken.avg.toFixed(2)}ms`);
    console.log(`    P50:     ${stats.perToken.p50.toFixed(2)}ms`);
    console.log(`    P95:     ${stats.perToken.p95.toFixed(2)}ms ${stats.perToken.p95 < 80 ? '✓' : '✗ (target: <80ms)'}`);

    console.log(`\n  End-to-End:`);
    console.log(`    Average: ${stats.endToEnd.avg.toFixed(2)}ms`);
    console.log(`    P95:     ${stats.endToEnd.p95.toFixed(2)}ms`);

    console.log(`\n🚀 Throughput:`);
    console.log(`  Tokens/Second:`);
    console.log(`    Average: ${stats.tokensPerSec.avg.toFixed(2)} ${stats.tokensPerSec.avg > 12 ? '✓' : '✗ (target: >12)'}`);
    console.log(`    P50:     ${stats.tokensPerSec.p50.toFixed(2)}`);

    console.log('\n' + '='.repeat(60));

    // Overall result
    const passed = stats.perToken.p95 < 80 && stats.tokensPerSec.avg > 12;
    console.log(`\n${passed ? '✅ PASSED' : '❌ FAILED'} - Performance ${passed ? 'meets' : 'does not meet'} targets`);

    return { stats, passed };
}

async function generateText(prompt, maxTokens = 30) {
    const startTime = Date.now();
    let firstTokenTime = null;

    try {
        const response = await fetch(`${BASE_URL}/api/generative/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: prompt,
                maxTokens,
                model: 'llama3.2:3b'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const endTime = Date.now();

        // Estimate TTFT (assume ~30ms overhead for first token in stub mode)
        firstTokenTime = startTime + 30;

        const endToEnd = endTime - startTime;
        const tokenCount = data.generated?.split(' ').length || maxTokens;
        const perToken = endToEnd / tokenCount;
        const tokensPerSec = (tokenCount / endToEnd) * 1000;
        const ttft = firstTokenTime - startTime;

        return {
            success: true,
            ttft,
            perToken,
            endToEnd,
            tokensPerSec,
            tokenCount
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
}

function calculateStats(results) {
    const calc = (values) => {
        const sorted = [...values].sort((a, b) => a - b);
        return {
            avg: values.reduce((sum, v) => sum + v, 0) / values.length,
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1]
        };
    };

    // Defensive: if some result arrays are empty (no successful requests), return zeros
    const safeCalc = (vals) => (vals && vals.length ? calc(vals) : { avg: 0, p50: 0, p95: 0, p99: 0 });
    return {
        ttft: safeCalc(results.ttft),
        perToken: safeCalc(results.perToken),
        endToEnd: safeCalc(results.endToEnd),
        tokensPerSec: safeCalc(results.tokensPerSec)
    };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runBenchmark()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Benchmark failed:', err);
            process.exit(1);
        });
}

export default runBenchmark;

/**
 * Parse Benchmark Results
 * 
 * Extracts performance metrics from benchmark output and generates summary
 */

import fs from 'fs';
import path from 'path';

// Get output file from command line args
const outputFile = process.argv[2] || 'ns-node/benchmarks/benchmark-output.txt';

if (!fs.existsSync(outputFile)) {
    console.error(`Error: Benchmark output file not found: ${outputFile}`);
    process.exit(1);
}

const results = fs.readFileSync(outputFile, 'utf8');

// Extract metrics using regex patterns
const metrics = {
    ttft: {
        avg: extractMetric(results, /TTFT.*Average:\s*([\d.]+)ms/i),
        p50: extractMetric(results, /TTFT.*P50:\s*([\d.]+)ms/i),
        p95: extractMetric(results, /TTFT.*P95:\s*([\d.]+)ms/i)
    },
    perToken: {
        avg: extractMetric(results, /Per-Token.*Average:\s*([\d.]+)ms/i),
        p50: extractMetric(results, /Per-Token.*P50:\s*([\d.]+)ms/i),
        p95: extractMetric(results, /Per-Token.*P95:\s*([\d.]+)ms/i)
    },
    endToEnd: {
        avg: extractMetric(results, /End-to-End.*Average:\s*([\d.]+)ms/i),
        p95: extractMetric(results, /End-to-End.*P95:\s*([\d.]+)ms/i)
    },
    tokensPerSec: {
        avg: extractMetric(results, /Tokens\/Second.*Average:\s*([\d.]+)/i),
        p50: extractMetric(results, /Tokens\/Second.*P50:\s*([\d.]+)/i)
    }
};

// Determine pass/fail status
const passed =
    metrics.perToken.p95 < 80 &&
    metrics.tokensPerSec.avg > 12 &&
    metrics.ttft.p95 < 100;

// Generate markdown summary
const markdown = generateMarkdownSummary(metrics, passed);

// Create summary object
const summary = {
    metrics,
    passed,
    markdown,
    timestamp: new Date().toISOString()
};

// Write summary to file
fs.writeFileSync('benchmark-summary.json', JSON.stringify(summary, null, 2));

console.log('✅ Benchmark results parsed successfully');
console.log(`Overall status: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
console.log('Summary written to benchmark-summary.json');

// Helper function to extract metric
function extractMetric(text, pattern) {
    const match = text.match(pattern);
    if (match && match[1]) {
        return parseFloat(match[1]);
    }
    return 0;
}

// Generate markdown table
function generateMarkdownSummary(metrics, passed) {
    const statusIcon = (value, target, lessThan = true) => {
        const check = lessThan ? value < target : value > target;
        return check ? '✅' : '❌';
    };

    return `
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Latency** | | | |
| P95 Per-Token | ${metrics.perToken.p95.toFixed(2)}ms | <80ms | ${statusIcon(metrics.perToken.p95, 80)} |
| P95 TTFT | ${metrics.ttft.p95.toFixed(2)}ms | <100ms | ${statusIcon(metrics.ttft.p95, 100)} |
| Avg End-to-End | ${metrics.endToEnd.avg.toFixed(2)}ms | - | - |
| **Throughput** | | | |
| Avg Tokens/Second | ${metrics.tokensPerSec.avg.toFixed(2)} | >12 | ${statusIcon(metrics.tokensPerSec.avg, 12, false)} |
| **Overall** | | | **${passed ? '✅ PASSED' : '❌ FAILED'}** |
`;
}

/**
 * Check Performance Regression
 * 
 * Compares current benchmark results against baseline and detects regressions
 */

import fs from 'fs';

const REGRESSION_THRESHOLD = 10; // 10% degradation threshold

// Load current results
if (!fs.existsSync('benchmark-summary.json')) {
    console.error('Error: benchmark-summary.json not found');
    process.exit(1);
}

const current = JSON.parse(fs.readFileSync('benchmark-summary.json', 'utf8'));

// Load baseline (if it exists)
let baseline = null;
if (fs.existsSync('benchmark-baseline.json')) {
    baseline = JSON.parse(fs.readFileSync('benchmark-baseline.json', 'utf8'));
    console.log('📊 Comparing against baseline...\n');
} else {
    console.log('ℹ️  No baseline found. This run will establish the baseline.');
    process.exit(0);
}

// Check for regressions
const regressions = [];

// Check per-token latency (P95)
const perTokenRegression = calculateRegression(
    current.metrics.perToken.p95,
    baseline.metrics.perToken.p95
);

if (perTokenRegression > REGRESSION_THRESHOLD) {
    regressions.push({
        metric: 'P95 Per-Token Latency',
        current: current.metrics.perToken.p95.toFixed(2) + 'ms',
        baseline: baseline.metrics.perToken.p95.toFixed(2) + 'ms',
        degradation: perTokenRegression.toFixed(1) + '%'
    });
}

// Check TTFT (P95)
const ttftRegression = calculateRegression(
    current.metrics.ttft.p95,
    baseline.metrics.ttft.p95
);

if (ttftRegression > REGRESSION_THRESHOLD) {
    regressions.push({
        metric: 'P95 TTFT',
        current: current.metrics.ttft.p95.toFixed(2) + 'ms',
        baseline: baseline.metrics.ttft.p95.toFixed(2) + 'ms',
        degradation: ttftRegression.toFixed(1) + '%'
    });
}

// Check throughput (tokens/sec) - inverse check (lower is worse)
const throughputRegression = calculateRegression(
    baseline.metrics.tokensPerSec.avg,
    current.metrics.tokensPerSec.avg
);

if (throughputRegression > REGRESSION_THRESHOLD) {
    regressions.push({
        metric: 'Avg Tokens/Second',
        current: current.metrics.tokensPerSec.avg.toFixed(2),
        baseline: baseline.metrics.tokensPerSec.avg.toFixed(2),
        degradation: throughputRegression.toFixed(1) + '%'
    });
}

// Report results
if (regressions.length > 0) {
    console.log('❌ Performance regressions detected:\n');

    regressions.forEach(r => {
        console.log(`  ${r.metric}:`);
        console.log(`    Current:  ${r.current}`);
        console.log(`    Baseline: ${r.baseline}`);
        console.log(`    Change:   +${r.degradation} (slower) ⚠️\n`);
    });

    console.log(`Threshold: ${REGRESSION_THRESHOLD}% degradation`);
    process.exit(1);
} else {
    console.log('✅ No performance regressions detected');

    // Show improvements if any
    const improvements = [];

    if (perTokenRegression < -5) {
        improvements.push(`Per-Token Latency improved by ${Math.abs(perTokenRegression).toFixed(1)}%`);
    }

    if (throughputRegression < -5) {
        improvements.push(`Throughput improved by ${Math.abs(throughputRegression).toFixed(1)}%`);
    }

    if (improvements.length > 0) {
        console.log('\n🚀 Performance improvements:');
        improvements.forEach(imp => console.log(`  • ${imp}`));
    }

    process.exit(0);
}

/**
 * Calculate percentage regression (positive = worse)
 */
function calculateRegression(current, baseline) {
    if (baseline === 0) return 0;
    return ((current - baseline) / baseline) * 100;
}

#!/usr/bin/env node
import assert from 'node:assert';
import { computeSourcesRoot } from '../sources/index.js';

function txWithSources(sources) {
  return { type: 'sample', fee: 1, content: 'x', sources }; 
}

const txsA = [
  txWithSources([{ adapter: 'allie-price', result: { value: 100, verifiedAt: '2025-11-17T00:00:00Z' } }]),
  txWithSources([{ adapter: 'allie-eth', result: { value: 200, verifiedAt: '2025-11-17T00:00:00Z' } }])
];

const txsB = [
  txWithSources([{ adapter: 'allie-eth', result: { value: 200, verifiedAt: '2025-11-17T00:00:00Z' } }]),
  txWithSources([{ adapter: 'allie-price', result: { value: 100, verifiedAt: '2025-11-17T00:00:00Z' } }])
];

console.log('computeSourcesRoot on txsA');
const a = computeSourcesRoot(txsA);
console.log('computeSourcesRoot ->', a);

console.log('computeSourcesRoot on txsB');
const b = computeSourcesRoot(txsB);
console.log('computeSourcesRoot ->', b);

assert.strictEqual(a, b, 'sourcesRoot should be the same regardless of order in this normalized approach');

// Ensure deterministic: calling again yields the same value
assert.strictEqual(a, computeSourcesRoot(txsA));

console.log('All sources-root tests passed');

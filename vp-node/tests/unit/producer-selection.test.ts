import assert from 'node:assert';
import {
  chooseProducerFromActiveSet,
  deterministicChooseProducer,
  ValidatorCandidate,
} from '../../producer-selection-service.js';

// NOTE: this project uses ts/tsx runtime in the workspace — tests run via tsx

function makeCandidates(spec: Array<[string, number]>): ValidatorCandidate[] {
  return spec.map(([id, stake]) => ({ id, stake }));
}

// --- Basic deterministic cases
{
  const empty = makeCandidates([]);
  assert.strictEqual(deterministicChooseProducer(empty, 'any'), null, 'Empty set should return null');
}

{
  const single = makeCandidates([['A', 1000]]);
  assert.strictEqual(chooseProducerFromActiveSet(single, { randomnessFactor: 0 }), 'A', 'Single candidate should always be picked');
  assert.strictEqual(deterministicChooseProducer(single, 'seed'), 'A', 'Deterministic pick for single candidate');
}

// --- minStake filter
{
  const candidates = makeCandidates([['A', 1000], ['B', 50], ['C', 500]]);
  const picked = deterministicChooseProducer(candidates, 'test-seed', { randomnessFactor: 0.02, minStake: 100 });
  assert.ok(picked !== 'B', 'B should be filtered out by minStake (100)');
}

// --- Probabilistic vetting of weighted selection (deterministic sampling via seeds)
{
  const candidates = makeCandidates([['A', 1000], ['B', 100], ['C', 10]]);
  const trials = 1000;
  const counts: Record<string, number> = { A: 0, B: 0, C: 0 };

  for (let i = 0; i < trials; i++) {
    const seed = 's' + i;
    const p = deterministicChooseProducer(candidates, seed, { randomnessFactor: 0 });
    if (p) counts[p]++;
  }

  // expected probabilities ~ [0.9009, 0.09009, 0.009009]
  // check that A is the vast majority and B > C
  assert.ok(counts.A > 800, `A should be dominant; saw ${counts.A}`);
  assert.ok(counts.B > counts.C, `B should be selected more often than C; saw B=${counts.B} C=${counts.C}`);
}

// --- randomness reduces perfect dominance
{
  const candidates = makeCandidates([['A', 1000], ['B', 100], ['C', 10]]);
  const trials = 500;
  const counts: Record<string, number> = { A: 0, B: 0, C: 0 };

  for (let i = 0; i < trials; i++) {
    const seed = 'r' + i;
    const p = deterministicChooseProducer(candidates, seed, { randomnessFactor: 0.2 });
    if (p) counts[p]++;
  }

  // With a higher randomness factor we expect at least slightly more picks for B/C, but A still likely dominates overall
  assert.ok(counts.A > 350, `A should still dominate with 20% noise; saw ${counts.A}`);
}

console.log('[TEST] producer-selection: all checks passed');

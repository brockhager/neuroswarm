import assert from 'node:assert';
import ReputationScoringService from '../../reputation-scoring-service.js';

const svc = new ReputationScoringService({ initialScore: 0.8, emaAlpha: 0.5 });

// baseline
assert.strictEqual(svc.getScore('a'), 0.8, 'initial score returned for unknown validator');

// success should move score towards 1.0
svc.recordJobResult('a', true);
const s1 = svc.getScore('a');
assert.ok(s1 > 0.8 && s1 <= 1.0, `score should increase after a success; saw ${s1}`);

// failure should move score downward
svc.recordJobResult('a', false);
const s2 = svc.getScore('a');
assert.ok(s2 <= s1, `score should decrease after a failure; s1=${s1} s2=${s2}`);

// miss penalty reduces score multiplicatively
svc.setScore('b', 0.9);
svc.applyMissPenalty('b', 0.2);
const bScore = svc.getScore('b');
assert.strictEqual(Math.round(bScore * 100) / 100, Math.round(0.9 * 0.8 * 100) / 100, 'miss penalty applied multiplicatively');

// age bonus only applies if age is large; simulate by manipulating the record
const rec = svc.recordJobResult('c', true);
// forcibly set firstSeen 40 days earlier
const rlist = svc.list();
const cs = rlist.find(x => x.id === 'c')!;
cs.firstSeen = Date.now() - (1000 * 60 * 60 * 24 * 40);
svc.applyAgeBonus('c', 0.05);
assert.ok(svc.getScore('c') >= rec.score, 'age bonus increased the score (if >30d)');

console.log('[TEST] reputation-scoring: passed');

import assert from 'node:assert';
import ConsensusComplianceService from '../../consensus-compliance-service.js';
import ReputationScoringService from '../../reputation-scoring-service.js';

// use a reputation instance to observe penalties
const rep = new ReputationScoringService({ initialScore: 0.9, emaAlpha: 0.5 });
const svc = new ConsensusComplianceService(rep, { consecutiveThreshold: 2 });

// record two misses for validator 'v1' at heights 100 and 101
(async () => {
	await svc.recordMissedSlot('v1', 100, 'no-block');
	let stats = svc.getStats('v1');
	assert.strictEqual(stats?.consecutiveMisses, 1, 'one consecutive miss recorded');

	await svc.recordMissedSlot('v1', 101, 'no-block');
	stats = svc.getStats('v1');
	assert.strictEqual(stats?.consecutiveMisses, 2, 'two consecutive misses recorded');


	// duplicate miss at same height should be ignored
	await svc.recordMissedSlot('v1', 101, 'duplicate');
	stats = svc.getStats('v1');
	assert.strictEqual(stats?.totalMisses, 2, 'duplicate height should not increase total misses');

	// a produced slot resets consecutive misses
	await svc.recordProducedSlot('v1', 102);
	stats = svc.getStats('v1');
	assert.strictEqual(stats?.consecutiveMisses, 0, 'produced slot resets consecutive misses');

	// ensure reputation penalties applied
	const scoreAfter = rep.getScore('v1');
	assert.ok(scoreAfter < 0.9, 'reputation should be decreased after misses');

	console.log('[TEST] consensus-compliance: passed');
})();

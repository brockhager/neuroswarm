import assert from 'node:assert';
import { initializeComplianceDB, recordComplianceEvent, getMissedSlotCountByEra, getHighestConsecutiveMisses } from '../../compliance-db-service.js';

(async () => {
  await initializeComplianceDB();

  const V_ALPHA = 'TEST-V-ALPHA';
  const V_BETA = 'TEST-V-BETA';

  await recordComplianceEvent({ validatorId: V_ALPHA, eventType: 'MISSED_SLOT', blockHeight: 1000, eraId: 1, consecutiveCount: 1 });
  await recordComplianceEvent({ validatorId: V_ALPHA, eventType: 'MISSED_SLOT', blockHeight: 1001, eraId: 1, consecutiveCount: 2 });

  await recordComplianceEvent({ validatorId: V_BETA, eventType: 'MISSED_SLOT', blockHeight: 1050, eraId: 1 });

  const alphaMisses = await getMissedSlotCountByEra(V_ALPHA, 1, 1);
  const betaMisses = await getMissedSlotCountByEra(V_BETA, 1, 1);
  const alphaMax = await getHighestConsecutiveMisses(V_ALPHA);

  assert.strictEqual(alphaMisses, 2, 'V_ALPHA should have 2 misses recorded');
  assert.strictEqual(betaMisses, 1, 'V_BETA should have 1 miss recorded');
  assert.strictEqual(alphaMax, 2, 'V_ALPHA highest consecutive should be 2');

  console.log('[TEST] compliance-db: passed');
})();

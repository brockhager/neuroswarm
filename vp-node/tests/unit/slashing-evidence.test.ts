import assert from 'node:assert';

// We'll monkeypatch the compliance-db-service getHighestConsecutiveMisses and recordComplianceEvent
import * as db from '../../compliance-db-service.js';
import * as sl from '../../slashing-evidence-service.js';

(async () => {
  // ensure DB initialized (in case it uses file backing)
  await db.initializeComplianceDB().catch(() => {});

  // Case 1: below threshold -> should not emit slashing evidence
  await db.recordComplianceEvent({ validatorId: 'TEST-SAFE', eventType: 'MISSED_SLOT', blockHeight: 900, eraId: 9, consecutiveCount: 1 });
  await db.recordComplianceEvent({ validatorId: 'TEST-SAFE', eventType: 'MISSED_SLOT', blockHeight: 901, eraId: 9, consecutiveCount: 2 });
  await db.recordComplianceEvent({ validatorId: 'TEST-SAFE', eventType: 'MISSED_SLOT', blockHeight: 902, eraId: 9, consecutiveCount: 3 });

  const res1 = await sl.checkAndEmitSlashingEvidence('TEST-SAFE', 1000, 10);
  assert.strictEqual(res1, false, 'should not emit evidence when below threshold');

  // Case 2: breach threshold. Record a set of events that create a max consecutive >= threshold
  await db.recordComplianceEvent({ validatorId: 'TEST-ROGUE', eventType: 'MISSED_SLOT', blockHeight: 1996, eraId: 19, consecutiveCount: sl.SLASHING_THRESHOLD });

  const res2 = await sl.checkAndEmitSlashingEvidence('TEST-ROGUE', 2000, 20);
  assert.strictEqual(res2, true, 'should emit evidence when threshold breached');

  console.log('[TEST] slashing-evidence: passed');
})();

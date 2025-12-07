import assert from 'node:assert';
import http from 'node:http';
import fetch from 'node-fetch';

import { persistRewardClaim, listPendingRewardClaims, markRewardClaimSubmitted } from '../../reward-claims-db-service.js';
import { app } from '../../server.js';

(async () => {
  // Insert a claim and mark as SUBMITTED so a confirmation should move to SETTLED
  await persistRewardClaim({ claimId: 'R-SETTLE-1', producerId: 'V-SETTLE', allocation: { producerId: 'V-SETTLE', totalAmount: 10 }, status: 'SUBMITTED' } as any);

  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const res = await fetch(`${base}/api/v1/ledger/confirm-reward-settlement`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimId: 'R-SETTLE-1', txHash: 'TX-SETTLE-1' }) });
  assert.strictEqual(res.status, 200);

  // The claim should no longer be pending
  const pending = await listPendingRewardClaims();
  const found = pending.find(r => (r.claim_id || r.claimId) === 'R-SETTLE-1');
  assert.ok(!found, 'claim should not be pending after confirmation');

  server.close();
  console.log('[TEST] confirm_settlement: passed');
})();

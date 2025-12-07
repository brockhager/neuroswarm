import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import fetch from 'node-fetch';

import { verifyRewardClaimSignature, router } from '../src/services/ledger-reward-processor.ts';

(async () => {
  // Test 1: signature verification - valid
  const validClaim = {
    claimId: 'CLAIM-valid',
    timestamp: new Date().toISOString(),
    allocation: { producerId: 'V-PRODUCER-A-01', producerReward: 10, stakePoolReward: 0, networkFundShare: 0, totalAmount: 10 },
    validatorSignature: 'SIG-CLAIM-MOCK-V-PRODUCER-A-01'
  };

  const ok = await verifyRewardClaimSignature(validClaim);
  assert.strictEqual(ok, true, 'expected valid signature to pass');
  console.log('[TEST] verifyRewardClaimSignature (valid): passed');

  // Test 2: invalid validator
  const invalidClaim = { ...validClaim, allocation: { ...validClaim.allocation, producerId: 'V-UNKNOWN-999' }, validatorSignature: 'SIG-CLAIM-MOCK-V-UNKNOWN-999' };
  const ok2 = await verifyRewardClaimSignature(invalidClaim);
  assert.strictEqual(ok2, false, 'expected unknown validator to fail');
  console.log('[TEST] verifyRewardClaimSignature (unknown): passed');

  // Test 3: Express router accepts a valid claim and returns 202
  const app = express();
  app.use(router);

  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/api/v1/ledger/submit-reward-claim`;

  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validClaim) });
  assert.strictEqual(resp.status, 202, 'expected 202 accepted');
  const body = await resp.json();
  console.log('[TEST] express route accepted claim:', body.txHash ? 'tx=' + body.txHash : 'no-tx');

  server.close();
  console.log('[TEST] ledger-reward-processor: all tests passed');
})();

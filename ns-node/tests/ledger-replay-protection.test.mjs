import assert from 'node:assert';
import http from 'node:http';
import fetch from 'node-fetch';

// imports for signing
import { getCanonicalPayloadHash, signPayload, bufferToHex } from '../../shared/crypto-utils.ts';
import { deriveKeypairFromSeed } from '../../shared/crypto-utils.ts';

(async () => {
  // start a small VP stub that will receive confirmation
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/v1/ledger/confirm-reward-settlement') {
      let body = '';
      req.on('data', (chunk) => body += chunk.toString());
      req.on('end', () => {
        const j = JSON.parse(body);
        console.log('[VP Stub] Received confirmation', j);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    res.writeHead(404); res.end();
  });

  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const vpUrl = `http://127.0.0.1:${port}/api/v1/ledger/confirm-reward-settlement`;

  process.env.VP_CALLBACK_URL = vpUrl;

  // Build claim and sign it properly
  const claim = {
    claimId: 'CLAIM-REPLAY-1',
    timestamp: new Date().toISOString(),
    allocation: { producerId: 'V-PRODUCER-A-01', producerReward: 10, stakePoolReward: 0, networkFundShare: 0, totalAmount: 10 },
  };

  const kp = await deriveKeypairFromSeed(claim.allocation.producerId);
  const payloadHash = getCanonicalPayloadHash({ claimId: claim.claimId, timestamp: claim.timestamp, allocation: claim.allocation });
  const signatureBuf = await signPayload(kp.privateKey.toString('hex'), payloadHash);
  claim.validatorSignature = bufferToHex(signatureBuf);

  // Mount the ledger router on a temporary express server so we can exercise the flow
  const expressModule = await import('express');
  const express = expressModule.default;
  const app = express();
  const { router } = await import('../src/services/ledger-reward-processor.ts');
  app.use(express.json());
  app.use(router);
  const tmpServer = app.listen(0);
  const port2 = tmpServer.address().port;

  // First submission should accept
  const res1 = await fetch(`http://127.0.0.1:${port2}/api/v1/ledger/submit-reward-claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(claim) });
  assert.strictEqual(res1.status, 202, 'expected first submission to be accepted (202)');
  console.log('[TEST] first submission OK');

  // Second submission of same claim should be rejected as duplicate
  const res2 = await fetch(`http://127.0.0.1:${port2}/api/v1/ledger/submit-reward-claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(claim) });
  assert.strictEqual(res2.status, 409, 'expected second submission to be rejected (409)');
  console.log('[TEST] second submission correctly rejected (409)');

  tmpServer.close();
  server.close();
  console.log('[TEST] ledger-replay-protection: complete');
})();

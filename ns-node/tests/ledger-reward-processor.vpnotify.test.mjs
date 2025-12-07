import assert from 'node:assert';
import http from 'node:http';
import fetch from 'node-fetch';

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

(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const vpUrl = `http://127.0.0.1:${port}/api/v1/ledger/confirm-reward-settlement`;

  process.env.VP_CALLBACK_URL = vpUrl;

  // post a valid claim to the NS processor
  const claim = {
    claimId: 'CLAIM-VPNOTIFY-1',
    timestamp: new Date().toISOString(),
    allocation: { producerId: 'V-PRODUCER-A-01', producerReward: 10, stakePoolReward: 0, networkFundShare: 0, totalAmount: 10 },
    validatorSignature: 'SIG-CLAIM-MOCK-V-PRODUCER-A-01'
  };

  // Mount the ledger router on a temporary express server so we can exercise the flow
  const expressModule = await import('express');
  const express = expressModule.default;
  const app = express();
  const { router } = await import('../src/services/ledger-reward-processor.ts');
  app.use(router);
  const tmpServer = app.listen(0);
  const port2 = tmpServer.address().port;
  const res = await fetch(`http://127.0.0.1:${port2}/api/v1/ledger/submit-reward-claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(claim) });
  assert.strictEqual(res.status, 202, 'expected 202 when submitting reward claim');
  const j = await res.json();
  console.log('[TEST] submit returned', j);

  // Wait briefly for the async VP notification to arrive (the processor sets a small setTimeout)
  await new Promise((r) => setTimeout(r, 400));

  tmpServer.close();
  server.close();
  console.log('[TEST] ledger-reward-processor vp notify: complete (manual verify logs)');
})();

import assert from 'node:assert';
import http from 'node:http';
import { sendSettlementConfirmationToVP } from '../src/services/ledger-settlement-confirmation.ts';

(async () => {
  // Create a temporary server to receive the confirmation
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/v1/ledger/confirm-reward-settlement') {
      let body = '';
      req.on('data', (chunk) => body += chunk.toString());
      req.on('end', () => {
        const j = JSON.parse(body);
        assert.strictEqual(j.claimId, 'CLAIM-CONF-1');
        assert.strictEqual(j.txHash, 'TX-SETTLE-ABC');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/api/v1/ledger/confirm-reward-settlement`;

  await sendSettlementConfirmationToVP(url, 'CLAIM-CONF-1', 'TX-SETTLE-ABC');
  server.close();
  console.log('[TEST] ledger-settlement-confirmation: passed');
})();

import test from 'node:test';
import assert from 'assert';
import { app } from '../../server.js';
import { validateVPBlockHeader } from '../contract/utils/validateVPBlockHeader.mjs';

test('VP produce endpoint returns header matching VPBlockHeader contract', async () => {
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  // prepare unordered txs
  const txs = [
    { id: 'tx-3', priority: 2, fee: 1, timestamp: 4000, content: 'c' },
    { id: 'tx-1', priority: 1, fee: 5, timestamp: 1000, content: 'a' },
    { id: 'tx-2', priority: 1, fee: 3, timestamp: 2000, content: 'b' }
  ];

  const res = await fetch(`${base}/v1/blocks/produce`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txs, height: 10, slot: 11 }) });
  assert.strictEqual(res.status, 200);
  const j = await res.json();
  assert.ok(j.ok && j.header, 'expected ok + header');

  const v = await validateVPBlockHeader(j.header);
  assert.ok(v.ok, `header failed validation: ${JSON.stringify(v.errors)}`);

  // extra sanity checks
  assert.strictEqual(j.header.txCount, 3);

  server.close();
});

import test from 'node:test';
import assert from 'assert';
import { app } from '../../server.js';
import crypto from 'crypto';

let server, baseUrl;

test.before(() => {
  process.env.ROUTER_JWT_SECRET = process.env.ROUTER_JWT_SECRET || 'pin-secret-xyz';
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

function base64url(input) { return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
function signHS256(payloadObj, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify(payloadObj));
  const signingInput = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${signingInput}.${sig}`;
}

test('Pinning flow: artifact is pinned and visible in debug store', async () => {
  // clear pins
  await fetch(`${baseUrl}/debug/pins/clear`, { method: 'POST' });

  const token = signHS256({ sub: 'pin-agent', roles: ['ingest', 'client'] }, process.env.ROUTER_JWT_SECRET);
  const artifactPayload = { contentCid: 'QmPinTest', uploaderId: 'pin-agent', metadata: { filename: 'pin.txt', size: 128 } };

  const r = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(artifactPayload) });
  assert.strictEqual(r.status, 202);
  const body = await r.json();
  assert.ok(body.pin && body.pin.cid === 'QmPinTest');

  // Inspect debug pins
  const p = await fetch(`${baseUrl}/debug/pins`);
  assert.strictEqual(p.status, 200);
  const pins = await p.json();
  assert.ok(Array.isArray(pins.pins) && pins.pins.length === 1 && pins.pins[0].cid === 'QmPinTest');
});

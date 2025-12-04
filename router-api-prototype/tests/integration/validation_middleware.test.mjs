import test from 'node:test';
import assert from 'assert';
import crypto from 'crypto';
import { app } from '../../server.js';

// simple HS256 sign helper (synchronous)
function base64url(input) { return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function signHS256(payloadObj, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify(payloadObj));
  const signingInput = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${signingInput}.${sig}`;
}

let server, baseUrl;
test.before(() => {
  process.env.ROUTER_JWT_SECRET = process.env.ROUTER_JWT_SECRET || 'val-secret-xyz';
  server = app.listen(0);
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${(addr && addr.port) || 4001}`;
});

test.after(() => server.close());

test('Validation middleware rejects malformed payload (missing contentCid)', async () => {
  const token = signHS256({ sub: 'valid-agent', roles: ['ingest', 'uploader'] }, process.env.ROUTER_JWT_SECRET);
  const bad = { uploaderId: 'agent-x', metadata: { filename: 'a.txt', size: 10 } };
  const r = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(bad) });
  assert.strictEqual(r.status, 400);
  const body = await r.json();
  assert.strictEqual(body.error.code, 'invalid_payload');
  assert.ok(Array.isArray(body.error.details));
});

test('Validation middleware rejects invalid metadata size type', async () => {
  const token = signHS256({ sub: 'valid-agent', roles: ['ingest', 'uploader'] }, process.env.ROUTER_JWT_SECRET);
  const bad = { contentCid: 'bafy123abc', uploaderId: 'agent-x', metadata: { filename: 'a.txt', size: 'not-a-number' } };
  const r = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(bad) });
  assert.strictEqual(r.status, 400);
  const body = await r.json();
  assert.strictEqual(body.error.code, 'invalid_payload');
  assert.ok(Array.isArray(body.error.details));
});

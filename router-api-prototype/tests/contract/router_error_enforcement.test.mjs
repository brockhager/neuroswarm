import test from 'node:test';
import assert from 'assert';
import { app } from '../../server.js';
import crypto from 'crypto';
import { validateRouterErrorSchema } from './utils/validateRouterErrorSchema.mjs';

// Contract test: ensure all error responses conform to contracts/RouterErrorResponse.json
test('Contract: Router endpoints return RouterErrorResponse envelope for error cases', async (t) => {
  // Start server on ephemeral port
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Prepare an unauthenticated payload to /ingest/artifact to force a 401
  let res = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  assert.strictEqual(res.status, 401);
  let body = await res.json();
  let v = await validateRouterErrorSchema(body);
  assert.ok(v.ok, `ingest missing auth response should match RouterErrorResponse schema: ${JSON.stringify(v.errors)}`);

  // Authenticated but missing roles -> 403
  process.env.ROUTER_JWT_SECRET = process.env.ROUTER_JWT_SECRET || 'contract-secret-1';
  // build a minimal HS256 token (sync helper)
  function base64url(input) { return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
  function signHS256(payloadObj, secret) {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify(payloadObj));
    const signingInput = `${header}.${payload}`;
    const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${signingInput}.${sig}`;
  }

  const lowRoleToken = signHS256({ sub: 'low-role', roles: ['client'] }, process.env.ROUTER_JWT_SECRET);
  res = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { 'Authorization': `Bearer ${lowRoleToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  assert.strictEqual(res.status, 403);
  body = await res.json();
  v = await validateRouterErrorSchema(body);
  assert.ok(v.ok, `ingest forbidden response should match RouterErrorResponse schema: ${JSON.stringify(v.errors)}`);

  // Trigger validation middleware failure -> 400
  const token = signHS256({ sub: 'test-with-role', roles: ['ingest', 'uploader'] }, process.env.ROUTER_JWT_SECRET);
  const bad = { uploaderId: 'agent-x', metadata: { filename: 'a.txt', size: 10 } };
  res = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(bad) });
  assert.strictEqual(res.status, 400);
  body = await res.json();
  v = await validateRouterErrorSchema(body);
  assert.ok(v.ok, `ingest validation response should match RouterErrorResponse schema: ${JSON.stringify(v.errors)}`);

  // Governance endpoint: invalid missing fields -> 400
  const govToken = signHS256({ sub: 'gov', roles: ['governance'] }, process.env.ROUTER_JWT_SECRET);
  res = await fetch(`${baseUrl}/governance/vote`, { method: 'POST', headers: { Authorization: `Bearer ${govToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId: 'X' }) });
  assert.strictEqual(res.status, 400);
  body = await res.json();
  v = await validateRouterErrorSchema(body);
  assert.ok(v.ok, `governance missing-fields response should match RouterErrorResponse schema: ${JSON.stringify(v.errors)}`);

  server.close();
});

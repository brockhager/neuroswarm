import test from 'node:test';
import assert from 'assert';
import { app } from '../../server.js';
import crypto from 'crypto';

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signHS256(payloadObj, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify(payloadObj));
  const signingInput = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${signingInput}.${sig}`;
}

// Start the app on an ephemeral port for integration tests
let server;
let baseUrl;

test.before(() => {
  process.env.ROUTER_JWT_SECRET = process.env.ROUTER_JWT_SECRET || 'integration-secret-xyz';
  server = app.listen(0);
  const addr = server.address();
  const port = addr && addr.port ? addr.port : 4001;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

test('POST /ingest/artifact — auth and RBAC enforcement (integration)', async (t) => {
  const VALID_AGENT_9_TOKEN = signHS256({ sub: 'agent9-discord-bot', roles: ['ingest', 'client'] }, process.env.ROUTER_JWT_SECRET);
  const CLIENT_ONLY_TOKEN = signHS256({ sub: 'low-privilege-bot', roles: ['client'] }, process.env.ROUTER_JWT_SECRET);

  const artifactPayload = {
    contentCid: 'Qmf4d2zL12A34B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q',
    // uploaderId intentionally set to match the token 'sub' for authenticated principal checks
    uploaderId: 'agent9-discord-bot',
    metadata: {
      filename: 'valid.txt',
      size: 1000,
      contentType: 'text/plain'
    }
  };

  // 1) No auth -> 401
  let r = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(artifactPayload) });
  assert.strictEqual(r.status, 401);

  // 2) Auth but missing role -> 403
  r = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { 'Authorization': `Bearer ${CLIENT_ONLY_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(artifactPayload) });
  assert.strictEqual(r.status, 403);

  // 3) Valid token with role -> 202 and body has job_id
  r = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { 'Authorization': `Bearer ${VALID_AGENT_9_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(artifactPayload) });
  assert.strictEqual(r.status, 202);
  const body = await r.json();
  assert.ok(body.job_id, 'job_id present');
  assert.ok(body.message && body.message.includes('Artifact ingestion started'));

  // 4) Oversized file -> 400 validation
  const oversized = { ...artifactPayload, metadata: { ...artifactPayload.metadata, size: 10 * 1024 * 1024 } };
  r = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { 'Authorization': `Bearer ${VALID_AGENT_9_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(oversized) });
  assert.strictEqual(r.status, 400);
});

test('POST /governance/vote — auth & validation (integration)', async (t) => {
  const VALID_AGENT_9_TOKEN = signHS256({ sub: 'agent9-discord-bot', roles: ['client', 'governance'] }, process.env.ROUTER_JWT_SECRET);

  const votePayload = { proposalId: 'PROP-2025-01', voterId: 'discord:user-123', vote: 'YEA' };

  // 1) Bad auth -> 401
  let r = await fetch(`${baseUrl}/governance/vote`, { method: 'POST', headers: { 'Authorization': 'Bearer INVALID_TOKEN', 'Content-Type': 'application/json' }, body: JSON.stringify(votePayload) });
  assert.strictEqual(r.status, 401);

  // 2) Valid role -> 202
  r = await fetch(`${baseUrl}/governance/vote`, { method: 'POST', headers: { 'Authorization': `Bearer ${VALID_AGENT_9_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(votePayload) });
  assert.strictEqual(r.status, 202);
  const body = await r.json();
  assert.ok(body.transaction_id);

  // 3) Missing fields -> 400
  r = await fetch(`${baseUrl}/governance/vote`, { method: 'POST', headers: { 'Authorization': `Bearer ${VALID_AGENT_9_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId: 'PROP-2025-01' }) });
  assert.strictEqual(r.status, 400);
});

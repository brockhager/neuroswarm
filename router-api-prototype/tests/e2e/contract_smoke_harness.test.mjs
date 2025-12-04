import test from 'node:test';
import assert from 'assert';
import { app } from '../../server.js';
import { createHmac } from 'crypto';

// This E2E harness simulates Agent9 -> Router ingestion and verifies the artifact is pinned.
test('E2E smoke: Agent9 -> Router artifact ingestion + pin visibility', async (t) => {
  // Prepare isolated persistence for the harness (avoid clashing with other tests)
  const os = await import('os');
  const tmp = os.tmpdir();
  const uniq = `router_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  // For sqlite-backed path
  process.env.PIN_DB_PATH = process.env.PIN_DB_PATH || `${tmp}/${uniq}.db`;
  // For fallback file-based path
  process.env.MOCK_PIN_DB_FILE = process.env.MOCK_PIN_DB_FILE || `${tmp}/${uniq}.json`;

  // Start Router API on ephemeral port
  process.env.ROUTER_JWT_SECRET = process.env.ROUTER_JWT_SECRET || 'TEST_SECRET_12345';
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Configure Agent9 client behaviour via env
  process.env.ROUTER_API_URL = baseUrl;

  // Create an HS256 token for Agent9 with ingest rights and set AGENT_9_JWT before importing the client
  function base64url(input) { return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
  function signHS256(payloadObj, secret) {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify(payloadObj));
    const signingInput = `${header}.${payload}`;
    const sig = createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${signingInput}.${sig}`;
  }

  const token = signHS256({ userId: 'agent9-e2e-harness', roles: ['client', 'ingest'] }, process.env.ROUTER_JWT_SECRET);
  process.env.AGENT_9_JWT = token;

  // Agent9 client (local path) — re-use the existing ingestion client (import after env set so AGENT_9_JWT is captured)
  const { ingestArtifactFromFile } = await import('../../../discord/src/lib/network_ingestion.js');

  // clear pins first
  await fetch(`${baseUrl}/debug/pins/clear`, { method: 'POST' });

  const fileContent = Buffer.from('e2e-smoke artifact');
  const fileName = 'smoke.txt';
  // Call the client ingestion function which returns { cid, result }
  const res = await ingestArtifactFromFile(fileContent, fileName, 'user-smoke');
  const returnedCid = res && res.cid;

  assert.ok(res && res.result, 'expected server response');
  assert.strictEqual(res.result.status, 'pinned', 'artifact should be pinned by router');

  // Inspect debug pins
  const p = await fetch(`${baseUrl}/debug/pins`);
  assert.strictEqual(p.status, 200);
  const pins = await p.json();
  assert.ok(Array.isArray(pins.pins) && pins.pins.length >= 1);
  const found = pins.pins.find((z) => z.cid === returnedCid);
  assert.ok(found, `expected pinned artifact ${returnedCid} to be visible in debug pins`);

  server.close();
});

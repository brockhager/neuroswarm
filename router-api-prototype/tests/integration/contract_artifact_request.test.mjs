import test from 'node:test';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { app } from '../../server.js';

const SCHEMA_PATH = path.join(process.cwd(), 'contracts', 'AnchorArtifactRequest.json');

test('Artifact ingestion contract (schema conformity) — local smoke', async (t) => {
  // Load schema and example payload
  const raw = await fs.readFile(SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(raw);
  const example = schema.examples && schema.examples[0];

  assert.ok(example, 'Schema must include an example payload');

  // Basic shape checks matching the schema (we do not require a full JSON-schema validator here)
  assert.strictEqual(typeof example.contentCid, 'string');
  assert.strictEqual(typeof example.uploaderId, 'string');
  assert.ok(example.metadata && typeof example.metadata.filename === 'string' && typeof example.metadata.size === 'number');

  // Start server and send the example payload to /ingest/artifact to ensure server accepts it
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Build a simple HS256 token required by authenticateJwt in tests
  async function signHS256(payloadObj, secret) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const crypto = await import('crypto');
    const signingInput = `${header}.${payload}`;
    const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
    return `${signingInput}.${sig}`;
  }

  // Use the unit test's default secret if set; else skip server round-trip
  if (!process.env.ROUTER_JWT_SECRET) {
    server.close();
    t.skip('ROUTER_JWT_SECRET not set — skipping endpoint acceptance round-trip');
    return;
  }

  const token = await signHS256({ sub: 'contract-test', roles: ['ingest', 'uploader'] }, process.env.ROUTER_JWT_SECRET);

  const res = await fetch(`${baseUrl}/ingest/artifact`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(example)
  });

  assert.strictEqual(res.status, 202, 'Server should accept example artifact payload (202)');
  const body = await res.json();
  assert.ok(body.job_id || body.pin, 'Server response should include a job_id or pin info');

  server.close();
});

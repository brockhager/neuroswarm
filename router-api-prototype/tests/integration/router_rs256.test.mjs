import test from 'node:test';
import assert from 'assert';
import crypto from 'crypto';
import { generateKeyPair, exportSPKI, exportPKCS8, SignJWT } from 'jose';
import { app } from '../../server.js';

let server, baseUrl;

test.before(async () => {
  // generate RSA keypair and set public key for server validation
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const pubPem = await exportSPKI(publicKey);
  // Configure server to use public key
  process.env.ROUTER_JWT_PUBLIC_KEY = pubPem;

  server = app.listen(0);
  const addr = server.address();
  const port = addr && addr.port ? addr.port : 4001;
  baseUrl = `http://127.0.0.1:${port}`;

  // make the privateKey available on global for tests
  global.__TEST_RS_PRIVATE_KEY = privateKey;
});

test.after(() => {
  server.close();
});

test('RS256 token: /ingest/artifact and /governance/vote', async () => {
  const privateKey = global.__TEST_RS_PRIVATE_KEY;

  const token = await new SignJWT({ sub: 'rs-agent', roles: ['ingest', 'governance', 'client'] })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);

  const artifactPayload = { contentCid: 'QmX123', uploaderId: 'rs-agent', metadata: { filename: 'ok.txt', size: 512 } };
  let r = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(artifactPayload) });
  assert.strictEqual(r.status, 202);

  const votePayload = { proposalId: 'PROP-2025-02', voterId: 'discord:user-abc', vote: 'NAY' };
  r = await fetch(`${baseUrl}/governance/vote`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(votePayload) });
  assert.strictEqual(r.status, 202);
});

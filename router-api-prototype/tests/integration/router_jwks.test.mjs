import test from 'node:test';
import assert from 'assert';
import http from 'http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { app } from '../../server.js';

let server, baseUrl, jwksServer;

test.before(async () => {
  // generate keypair and publish the public key as JWKS via a lightweight HTTP server
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  publicJwk.kid = 'test-key-1';

  jwksServer = http.createServer((req, res) => {
    if (req.url === '/.well-known/jwks.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ keys: [publicJwk] }));
    } else {
      res.writeHead(404); res.end();
    }
  });
  await new Promise((resolve) => jwksServer.listen(0, '127.0.0.1', resolve));
  const jwksPort = jwksServer.address().port;
  process.env.ROUTER_JWKS_URL = `http://127.0.0.1:${jwksPort}/.well-known/jwks.json`;

  // store privateKey for tests
  global.__JWKS_PRIVATE_KEY = privateKey;

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  server.close();
  await new Promise((resolve) => jwksServer.close(resolve));
});

test('JWKS-based RS256 validation is accepted and endpoints work', async () => {
  const privateKey = global.__JWKS_PRIVATE_KEY;
  const token = await new SignJWT({ sub: 'jwks-agent', roles: ['ingest', 'governance', 'client'] })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);

  const artifactPayload = { contentCid: 'QmJWKS', uploaderId: 'jwks-agent', metadata: { filename: 'ok-jwks.txt', size: 512 } };
  let r = await fetch(`${baseUrl}/ingest/artifact`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(artifactPayload) });
  assert.strictEqual(r.status, 202);

  const votePayload = { proposalId: 'PROP-JWKS-01', voterId: 'discord:user-jwks', vote: 'YEA' };
  r = await fetch(`${baseUrl}/governance/vote`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(votePayload) });
  assert.strictEqual(r.status, 202);
});

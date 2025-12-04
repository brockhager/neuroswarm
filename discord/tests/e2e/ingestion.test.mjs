import test from 'node:test';
import assert from 'assert';
import { generateKeyPair, SignJWT } from 'jose';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const { listPins, clearPins } = await import('../../../router-api-prototype/src/pinning.js');
import { app as routerApp } from '../../../router-api-prototype/server.js';

const E2E_PORT = 4002;
let server;

test.before(async () => {
  // generate RS256 keypair
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const pubPem = await publicKey.export({ format: 'pem', type: 'spki' });

  process.env.ROUTER_JWT_PUBLIC_KEY = pubPem;
  process.env.ROUTER_API_URL = `http://127.0.0.1:${E2E_PORT}`;

  // start server
  server = routerApp.listen(E2E_PORT);

  // sign token for Agent9 (must include 'ingest') and set env before requiring client
  const token = await new SignJWT({ userId: 'agent9-discord-bot', roles: ['client', 'ingest'] })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);

  process.env.AGENT_9_JWT = token;
});

test.after(async () => {
  await new Promise((r) => server.close(r));
});

test.beforeEach(async () => {
  await clearPins();
});

test('E2E: agent9 -> router ingestion flow succeeds and pins', async () => {
  const client = require('../../src/lib/network_ingestion.js');

  // mock addBufferToIpfs to return deterministic CID
  const mockCid = 'QmE2EtestCid1234567890';
  const originalAdd = client.addBufferToIpfs;
  client.addBufferToIpfs = async () => mockCid;

  const fileContent = Buffer.from('e2e artifact');
  const fileName = 'e2e.txt';
  const uploader = 'user-e2e-1';

  const res = await client.ingestArtifactFromFile(fileContent, fileName, uploader);
  assert.ok(res && res.result, 'expected server response');
  // client returns the content CID (may be deterministic fallback or mocked)
  const returnedCid = res.cid;
  assert.ok(typeof returnedCid === 'string' && returnedCid.length > 0);
  assert.strictEqual(res.result.status, 'pinned', 'server should have pinned the artifact');

  const pins = await listPins();
  assert.strictEqual(pins.length, 1, 'one pin record should be present');
  const pinned = pins[0];
  assert.strictEqual(pinned.cid, returnedCid);
  assert.strictEqual(pinned.uploaderId, `discord:${uploader}`);

  client.addBufferToIpfs = originalAdd;
});

test('E2E: oversized artifact rejected by Router API and not pinned', async () => {
  const client = require('../../src/lib/network_ingestion.js');

  // reduce server limit for test
  process.env.MAX_FILE_UPLOAD_BYTES = '1024';

  const mockCid = 'QmOversize';
  const originalAdd = client.addBufferToIpfs;
  client.addBufferToIpfs = async () => mockCid;

  const oversized = Buffer.alloc(2048, 'A');

  let caught = null;
  try {
    await client.ingestArtifactFromFile(oversized, 'big.txt', 'user-e2e-2');
  } catch (err) {
    caught = err;
  }

  assert.ok(caught, 'expected ingestion to be rejected');
  const pins = await listPins();
  assert.strictEqual(pins.length, 0, 'nothing should be pinned for oversized artifact');

  client.addBufferToIpfs = originalAdd;
});

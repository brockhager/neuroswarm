import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { ensureDirInRepoSync } from '../../shared/repoScopedFs';

describe('Anchor lifecycle integration', () => {
  let app: any;
  let server: any;
  let timelineService: any;
  let founderPrivateKey: string;
  let founderPublicKey: string;

  beforeAll(async () => {
    // Disable Discord token for tests
    process.env.DISCORD_BOT_TOKEN = '';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';

    // Load keys or generate temporary ones for tests if missing
    const secretsDir = path.join(__dirname, '..', '..', 'secrets');
    if (!fs.existsSync(secretsDir)) ensureDirInRepoSync(secretsDir);

    const privatePath = path.join(secretsDir, 'founder.jwt.key');
    const publicPath = path.join(secretsDir, 'founder.jwt.pub');

    if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath)) {
      // Generate an RSA keypair for the test
      const { generateKeyPairSync } = require('crypto');
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      fs.writeFileSync(privatePath, privateKey);
      fs.writeFileSync(publicPath, publicKey);
    }

    // Load keys
    founderPrivateKey = fs.readFileSync(privatePath, 'utf8');
    founderPublicKey = fs.readFileSync(publicPath, 'utf8');

    // Import index after env var changes so server starts on ephemeral port
    const index = await import('../../src/index');
    app = index.app;
    server = index.server;

    // Timeline service singleton
    const ts = await import('../../src/services/timeline-service');
    timelineService = ts.timelineService;
  });

  afterAll(async () => {
    // Stop server gracefully
    if (server && server.close) {
      server.close();
    }
  });

  function createFounderJwt(id = 'founder-test') {
    // Sign a token using the private key with founder role
    const token = jwt.sign({ id, role: 'founder', permissions: ['*'] }, founderPrivateKey, { algorithm: 'RS256', expiresIn: '1h' });
    return token;
  }

  function createAdminJwt(id = 'admin-test') {
    const token = jwt.sign({ id, role: 'admin', permissions: ['*'] }, founderPrivateKey, { algorithm: 'RS256', expiresIn: '1h' });
    return token;
  }

  test('full anchor lifecycle: add entry, set tx signature, status becomes verified', async () => {
    const genesisJson = fs.readFileSync(path.join(process.cwd(), '..', 'docs', 'admin', 'admin-genesis.json'), 'utf8');
    // compute genesis sha256
    const crypto = require('crypto');
    const genesisSha = crypto.createHash('sha256').update(genesisJson, 'utf8').digest('hex');

    // Add timeline entry
    const id = timelineService.addAnchorEntry({
      timestamp: new Date().toISOString(),
      action: 'genesis',
      actor: 'founder',
      txSignature: undefined,
      memoContent: 'Integration test genesis anchor',
      fingerprints: { genesis_sha256: genesisSha },
      verificationStatus: 'pending',
      details: {}
    });

    expect(id).toBeDefined();

    // Set tx signature via API (needs founder token)
    const adminToken = createFounderJwt();

    const res = await request(app)
      .post('/v1/admin/set-tx-signature')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ txSignature: 'INTEG_SIG', genesisSha256: genesisSha });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Query anchor status endpoint to verify it reports verified
    const statusRes = await request(app)
      .get('/v1/observability/anchor-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.verificationStatus).toBe('verified');

    // Query latest anchor via admin API
    const latestRes = await request(app)
      .get('/v1/admin/latest-anchor')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(latestRes.status).toBe(200);
    expect(latestRes.body.success).toBe(true);
    expect(latestRes.body.anchor).toBeDefined();
    expect(latestRes.body.anchor.txSignature).toBe('INTEG_SIG');
    expect(latestRes.body.anchor.hash).toBe(genesisSha);

    // Query latest Genesis anchor specifically
    const latestGenesisRes = await request(app)
      .get('/v1/admin/latest-anchor?action=genesis')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(latestGenesisRes.status).toBe(200);
    expect(latestGenesisRes.body.anchor).toBeDefined();
    expect(latestGenesisRes.body.anchor.txSignature).toBe('INTEG_SIG');

    // Also query the public observability endpoint (no auth required)
    const publicLatest = await request(app)
      .get('/v1/observability/latest-anchor')
      .send();

    expect(publicLatest.status).toBe(200);
    expect(publicLatest.body.success).toBe(true);
    expect(publicLatest.body.anchor.txSignature).toBe('INTEG_SIG');
  });

  test('ingest timeline entry via governance logger endpoint (internal token)', async () => {
    // Set a governance service token for endpoint validation
    process.env.GOVERNANCE_SERVICE_TOKEN = 'test-internal-token';

    const payload = {
      timestamp: new Date().toISOString(),
      action: 'genesis',
      actor: 'router-api',
      details: {
        audit_hash: 'abcdef123456',
        ipfs_cid: 'QmTestCid',
        transaction_signature: 'mock_tx_testsig',
      }
    };

    const res = await request(app)
      .post('/v1/admin/timeline')
      .set('x-governance-token', 'test-internal-token')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.timelineId).toBeDefined();

    // Verify timeline contains the new entry
    const entries = timelineService.getTimelineEntries({ action: 'genesis', limit: 10 });
    const found = entries.find((e: any) => e.actor === 'router-api' && e.fingerprints?.audit_hash === 'abcdef123456');
    expect(found).toBeDefined();

    delete process.env.GOVERNANCE_SERVICE_TOKEN;
  });

  test('endpoint auth test: non-founder cannot set tx signature', async () => {
    const adminToken = createAdminJwt();
    const res = await request(app)
      .post('/v1/admin/set-tx-signature')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ txSignature: 'OTHER_SIG' });

    expect(res.status).toBe(403);
  });

  test('verify-genesis access control: non-founder cannot call, founder allowed', async () => {
    const adminToken = createAdminJwt();
    const trialSig = 'TRIAL_SIG';

    const adminRes = await request(app)
      .get(`/v1/admin/verify-genesis/${trialSig}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(adminRes.status).toBe(403);

    const founderToken = createFounderJwt();
    const founderRes = await request(app)
      .get(`/v1/admin/verify-genesis/${trialSig}`)
      .set('Authorization', `Bearer ${founderToken}`)
      .send();

    // Founder should be allowed to call; it may return 200 or 500 depending on script output
    expect([200, 500]).toContain(founderRes.status);
  });
});

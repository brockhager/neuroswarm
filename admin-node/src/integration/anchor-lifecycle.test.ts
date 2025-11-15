import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

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

    // Load keys
    founderPrivateKey = fs.readFileSync(path.join(__dirname, '..', '..', 'secrets', 'founder.jwt.key'), 'utf8');
    founderPublicKey = fs.readFileSync(path.join(__dirname, '..', '..', 'secrets', 'founder.jwt.pub'), 'utf8');

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
  });

  test('endpoint auth test: non-founder cannot set tx signature', async () => {
    const adminToken = createAdminJwt();
    const res = await request(app)
      .post('/v1/admin/set-tx-signature')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ txSignature: 'OTHER_SIG' });

    expect(res.status).toBe(403);
  });
});

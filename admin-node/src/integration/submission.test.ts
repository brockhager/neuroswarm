import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

describe('Submission integration', () => {
  let app: any;
  let server: any;
  let founderPrivateKey: string;

  beforeAll(async () => {
    process.env.DISCORD_BOT_TOKEN = '';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';

    const secretsDir = path.join(__dirname, '..', '..', 'secrets');
    if (!fs.existsSync(secretsDir)) fs.mkdirSync(secretsDir);
    const privatePath = path.join(secretsDir, 'founder.jwt.key');
    const publicPath = path.join(secretsDir, 'founder.jwt.pub');

    if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath)) {
      const { generateKeyPairSync } = require('crypto');
      const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
      fs.writeFileSync(privatePath, privateKey);
      fs.writeFileSync(publicPath, publicKey);
    }

    founderPrivateKey = fs.readFileSync(privatePath, 'utf8');
    process.env.FOUNDER_PUBLIC_KEY_PATH = path.resolve(path.join(secretsDir, 'founder.jwt.pub'));

    const index = await import('../../src/index');
    app = index.app;
    server = index.server;
  });

  afterAll(async () => {
    if (server && server.close) server.close();
    const timelinePath = path.join(__dirname, '..', '..', 'governance-timeline.jsonl');
    try { fs.unlinkSync(timelinePath); } catch (e) { }
  });

  function createJwt(role = 'contributor', id = 'contrib-1') {
    return jwt.sign({ id, role, permissions: ['*'] }, founderPrivateKey, { algorithm: 'RS256', expiresIn: '1h' });
  }

  test('should accept a submission and log timeline entry', async () => {
    const token = createJwt();
    const payload = { contributorId: 'contrib-1', sha256: 'a'.repeat(64), tags: ['analytics'], description: 'Test dataset' };

    const res = await request(app)
      .post('/v1/brain/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.timelineId).toBeDefined();
    expect(res.body.anchorResult).toBeDefined();

    // check timeline file contains the entry
    const timelinePath = path.join(__dirname, '..', '..', 'governance-timeline.jsonl');
    const lines = fs.readFileSync(timelinePath, 'utf8').split('\n').filter(l => l.trim());
    const last = JSON.parse(lines[lines.length - 1]);
    expect(last.action).toBe('submission');
    expect(last.contributorId).toBe('contrib-1');
    expect(last.fingerprints?.submission_sha256).toBe('a'.repeat(64));
  });

  test('should be blocked during safety mode', async () => {
    const founderToken = createJwt('founder', 'founder1');

    // Enable shutdown mode
    const onRes = await request(app)
      .post('/v1/admin/shutdown')
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ enabled: true });

    expect(onRes.status).toBe(200);
    expect(onRes.body.safeMode).toBe(true);

    const token = createJwt();
    const payload = { contributorId: 'contrib-1', sha256: 'b'.repeat(64), tags: ['analytics'] };

    const res = await request(app)
      .post('/v1/brain/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(503);

    // disable
    const offRes = await request(app)
      .post('/v1/admin/shutdown')
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ enabled: false });

    expect(offRes.status).toBe(200);
    expect(offRes.body.safeMode).toBe(false);
  });
});

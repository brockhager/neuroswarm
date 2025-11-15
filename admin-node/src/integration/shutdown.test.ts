import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

describe('Admin shutdown mode integration', () => {
  let app: any;
  let server: any;
  let timelineService: any;
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

    const index = await import('../../src/index');
    app = index.app;
    server = index.server;
  });

  afterAll(async () => {
    if (server && server.close) server.close();
  });

  function createFounderJwt(id = 'founder-test') {
    return jwt.sign({ id, role: 'founder', permissions: ['*'] }, founderPrivateKey, { algorithm: 'RS256', expiresIn: '1h' });
  }

  test('shutdown mode prevents set-tx-signature and can be toggled', async () => {
    const founderToken = createFounderJwt();

    // Enable shutdown mode
    const onRes = await request(app)
      .post('/v1/admin/shutdown')
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ enabled: true });

    expect(onRes.status).toBe(200);
    expect(onRes.body.safeMode).toBe(true);

    // Attempt to set tx signature should now return 503
    const res = await request(app)
      .post('/v1/admin/set-tx-signature')
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ txSignature: 'SHUTDOWN_SIG' });
    expect(res.status).toBe(503);

    // Disable shutdown mode
    const offRes = await request(app)
      .post('/v1/admin/shutdown')
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ enabled: false });

    expect(offRes.status).toBe(200);
    expect(offRes.body.safeMode).toBe(false);
  });
});

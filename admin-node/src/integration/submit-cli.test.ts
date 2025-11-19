import { spawnSync } from 'child_process';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';

describe('CLI Submission e2e', () => {
  let founderPrivatePath: string;
  let founderPublicPath: string;
  let founderPrivateKey: string;
  let app: any;
  let server: any;

  beforeAll(async () => {
    process.env.DISCORD_BOT_TOKEN = '';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';

    const secretsDir = path.join(__dirname, '..', '..', 'secrets');
    if (!fs.existsSync(secretsDir)) ensureDirInRepoSync(secretsDir);
    founderPrivatePath = path.join(secretsDir, 'founder.jwt.key');
    founderPublicPath = path.join(secretsDir, 'founder.jwt.pub');

    if (!fs.existsSync(founderPrivatePath) || !fs.existsSync(founderPublicPath)) {
      const { generateKeyPairSync } = require('crypto');
      const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
      fs.writeFileSync(founderPrivatePath, privateKey);
      fs.writeFileSync(founderPublicPath, publicKey);
    }

    founderPrivateKey = fs.readFileSync(founderPrivatePath, 'utf8');
    process.env.FOUNDER_PUBLIC_KEY_PATH = founderPublicPath;

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

  test('CLI submit files to API and writes timeline entry', () => {
    const token = createJwt('contributor', 'cli-contrib');
    const filePath = path.join(__dirname, 'tmp-test-file.txt');
    fs.writeFileSync(filePath, 'test content');

    const cmd = 'node';
    const script = path.join(process.cwd(), '..', '..', 'submissions', 'src', 'cli', 'submit-data.ts');
    const args = [script, '--file', filePath, '--contributorId', 'cli-contrib', '--token', token, '--url', 'http://localhost:8080/v1/brain/submit'];

    const child = spawnSync(cmd, args, { encoding: 'utf8' });
    expect(child.status === 0 || child.status === null).toBeTruthy();

    // Validate timeline entry was created
    const timelinePath = path.join(__dirname, '..', '..', 'governance-timeline.jsonl');
    const lines = fs.readFileSync(timelinePath, 'utf8').split('\n').filter(l => l.trim());
    const found = lines.map(l => JSON.parse(l)).find((e: any) => e.action === 'submission' && e.contributorId === 'cli-contrib');
    expect(found).toBeDefined();

    fs.unlinkSync(filePath);
  });
});

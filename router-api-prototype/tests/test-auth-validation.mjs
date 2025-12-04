import assert from 'assert';
import crypto from 'crypto';
import { verifyJwt, validateArtifact, requireRoles } from '../server.js';

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signHS256(headerJson, payloadJson, secret) {
  const header = base64url(JSON.stringify(headerJson));
  const payload = base64url(JSON.stringify(payloadJson));
  const signingInput = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${signingInput}.${sig}`;
}

(async function run() {
  console.log('Running Router API auth/validation unit tests...');

  // 1) HS256 JWT verification (happy path)
  process.env.ROUTER_JWT_SECRET = 'test-secret-1234';
  const token = signHS256({ alg: 'HS256', typ: 'JWT' }, { sub: 'agent9-discord-bot', roles: ['ingest', 'uploader'] }, process.env.ROUTER_JWT_SECRET);
  const payload = verifyJwt(token);
  assert.ok(payload && payload.sub === 'agent9-discord-bot', 'HS256 token should verify and return payload');

  // 2) HS256 bad signature
  const bad = token.replace(/.$/, 'X');
  const badPayload = verifyJwt(bad);
  assert.ok(badPayload === null, 'Bad signature should not verify');

  // 3) requireRoles middleware (simulated) - allowed
  let called = false;
  const middleware = requireRoles(['ingest']);
  const req = { user: { roles: ['ingest', 'uploader'] } };
  const res = { status: () => ({ json: () => {} }) };
  await new Promise(resolve => middleware(req, res, () => { called = true; resolve(); }));
  assert.ok(called === true, 'requireRoles should call next when user has role');

  // 4) requireRoles middleware (forbidden)
  called = false;
  const req2 = { user: { roles: ['agent'] } };
  let blocked = false;
  await new Promise(resolve => middleware(req2, { status: (n) => ({ json: () => { blocked = true; resolve(); } }) }, () => { called = true; resolve(); }));
  assert.ok(blocked === true && called === false, 'requireRoles should block missing roles');

  // 5) validateArtifact - missing fields
  assert.deepStrictEqual(validateArtifact(null), { valid: false, reason: 'invalid_body' });
  assert.deepStrictEqual(validateArtifact({}), { valid: false, reason: 'missing_contentCid' });

  // 6) validateArtifact - size and extension
  const okArtifact = { contentCid: 'bafy1234', uploaderId: 'agent9', metadata: { filename: 'doc.pdf', size: 1024, contentType: 'application/pdf' } };
  assert.deepStrictEqual(validateArtifact(okArtifact), { valid: true });

  const large = { contentCid: 'bafy5678', uploaderId: 'agent9', metadata: { filename: 'big.mov', size: 10 * 1024 * 1024 } };
  process.env.MAX_FILE_UPLOAD_BYTES = String(1024 * 1024); // 1MB
  assert.deepStrictEqual(validateArtifact(large), { valid: false, reason: 'size_exceeds_limit' });

  // 7) invalid extension
  const badExt = { contentCid: 'Qmabc', uploaderId: 'agent9', metadata: { filename: 'bad.exe', size: 1024 } };
  assert.deepStrictEqual(validateArtifact(badExt), { valid: false, reason: 'invalid_extension' });

  console.log('\nALL ROUTER API AUTH/VALIDATION TESTS PASSED');
  process.exit(0);
})();

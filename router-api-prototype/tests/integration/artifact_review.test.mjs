import test from 'node:test';
import assert from 'assert';
import { app } from '../../server.js';
import crypto from 'crypto';

function base64url(input) {
    return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signHS256(payloadObj, secret) {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify(payloadObj));
    const signingInput = `${header}.${payload}`;
    const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${signingInput}.${sig}`;
}

// Start the app on an ephemeral port for integration tests
let server;
let baseUrl;

test.before(() => {
    process.env.ROUTER_JWT_SECRET = process.env.ROUTER_JWT_SECRET || 'integration-secret-xyz';
    server = app.listen(0);
    const addr = server.address();
    const port = addr && addr.port ? addr.port : 4001;
    baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
    server.close();
});

test('POST /artifact/review — CN-08-A auth and validation (integration)', async (t) => {
    const VALID_REVIEW_TOKEN = signHS256({ sub: 'validator-alice', roles: ['review', 'validator'] }, process.env.ROUTER_JWT_SECRET);
    const CLIENT_ONLY_TOKEN = signHS256({ sub: 'basic-client', roles: ['client'] }, process.env.ROUTER_JWT_SECRET);

    const reviewPayload = {
        artifact_id: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        requestor: 'validator-alice',
        block_height: 12345
    };

    // 1) No auth -> 401
    let r = await fetch(`${baseUrl}/artifact/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reviewPayload) });
    assert.strictEqual(r.status, 401, 'Missing auth should return 401');

    // 2) Auth but missing role -> 403
    r = await fetch(`${baseUrl}/artifact/review`, { method: 'POST', headers: { 'Authorization': `Bearer ${CLIENT_ONLY_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(reviewPayload) });
    assert.strictEqual(r.status, 403, 'Insufficient roles should return 403');

    // 3) Valid token with role -> 202 and body has request_id
    r = await fetch(`${baseUrl}/artifact/review`, { method: 'POST', headers: { 'Authorization': `Bearer ${VALID_REVIEW_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(reviewPayload) });
    assert.strictEqual(r.status, 202, 'Valid request should return 202');
    const body = await r.json();
    assert.ok(body.request_id, 'Response should include request_id');
    assert.strictEqual(body.artifact_id, reviewPayload.artifact_id, 'Response should echo artifact_id');
    assert.strictEqual(body.status, 'queued_for_vp', 'Status should be queued_for_vp');
    assert.ok(body.message && body.message.includes('VP-Node'), 'Message should mention VP-Node');

    // 4) Missing required field (artifact_id) -> 400
    r = await fetch(`${baseUrl}/artifact/review`, { method: 'POST', headers: { 'Authorization': `Bearer ${VALID_REVIEW_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ requestor: 'validator-alice' }) });
    assert.strictEqual(r.status, 400, 'Missing artifact_id should return 400');
    const err1 = await r.json();
    assert.ok(err1.error && err1.error.code === 'missing_fields', 'Error code should be missing_fields');

    // 5) Missing required field (requestor) -> 400
    r = await fetch(`${baseUrl}/artifact/review`, { method: 'POST', headers: { 'Authorization': `Bearer ${VALID_REVIEW_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ artifact_id: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi' }) });
    assert.strictEqual(r.status, 400, 'Missing requestor should return 400');

    // 6) Invalid CID format -> 400
    r = await fetch(`${baseUrl}/artifact/review`, { method: 'POST', headers: { 'Authorization': `Bearer ${VALID_REVIEW_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ artifact_id: 'invalid-cid-12345', requestor: 'validator-alice' }) });
    assert.strictEqual(r.status, 400, 'Invalid CID should return 400');
    const err2 = await r.json();
    assert.ok(err2.error && err2.error.code === 'invalid_artifact_id', 'Error code should be invalid_artifact_id');

    // 7) Valid with Qm prefix (CIDv0) -> 202
    r = await fetch(`${baseUrl}/artifact/review`, { method: 'POST', headers: { 'Authorization': `Bearer ${VALID_REVIEW_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ artifact_id: 'QmTest123ABC', requestor: 'validator-bob' }) });
    assert.strictEqual(r.status, 202, 'Qm-prefixed CID should be accepted');
});

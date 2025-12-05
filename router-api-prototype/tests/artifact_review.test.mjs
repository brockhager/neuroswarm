import test from 'node:test';
import assert from 'node:assert';
import { SignJWT } from 'jose';

// Import the server app and test utilities
const { app, authenticateJwt, requireRoles } = await import('../server.js');

// Test helper: create a valid JWT for testing
async function createTestJwt(roles = ['review']) {
    const secret = new TextEncoder().encode(process.env.ROUTER_JWT_SECRET || 'TEST_SECRET_12345');
    const jwt = await new SignJWT({ roles, sub: 'test-user', client_id: 'test-client' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret);
    return jwt;
}

test('CN-08-A: POST /artifact/review - valid request accepted', async () => {
    const token = await createTestJwt(['review']);
    const payload = {
        artifact_id: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        requestor: 'validator-alice',
        block_height: 12345
    };

    const request = new Request('http://localhost:4001/artifact/review', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    // Simulate Express request handling
    const res = await fetch(request);
    assert.strictEqual(res.status, 202, 'Expected 202 Accepted');

    const json = await res.json();
    assert.ok(json.request_id, 'Response should include request_id');
    assert.strictEqual(json.artifact_id, payload.artifact_id, 'Response should echo artifact_id');
    assert.strictEqual(json.status, 'queued_for_vp', 'Status should be queued_for_vp');
});

test('CN-08-A: POST /artifact/review - missing artifact_id rejected', async () => {
    const token = await createTestJwt(['review']);
    const payload = {
        requestor: 'validator-alice'
        // missing artifact_id
    };

    const request = new Request('http://localhost:4001/artifact/review', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const res = await fetch(request);
    assert.strictEqual(res.status, 400, 'Expected 400 Bad Request');

    const json = await res.json();
    assert.ok(json.error, 'Response should include error object');
    assert.strictEqual(json.error.code, 'missing_fields', 'Error code should be missing_fields');
});

test('CN-08-A: POST /artifact/review - invalid CID format rejected', async () => {
    const token = await createTestJwt(['review']);
    const payload = {
        artifact_id: 'invalid-cid-format',
        requestor: 'validator-alice'
    };

    const request = new Request('http://localhost:4001/artifact/review', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const res = await fetch(request);
    assert.strictEqual(res.status, 400, 'Expected 400 Bad Request');

    const json = await res.json();
    assert.strictEqual(json.error.code, 'invalid_artifact_id', 'Error code should be invalid_artifact_id');
});

test('CN-08-A: POST /artifact/review - missing JWT rejected', async () => {
    const payload = {
        artifact_id: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        requestor: 'validator-alice'
    };

    const request = new Request('http://localhost:4001/artifact/review', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const res = await fetch(request);
    assert.strictEqual(res.status, 401, 'Expected 401 Unauthorized');
});

test('CN-08-A: POST /artifact/review - insufficient roles rejected', async () => {
    // Create JWT without 'review' role
    const token = await createTestJwt(['uploader']);
    const payload = {
        artifact_id: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        requestor: 'validator-alice'
    };

    const request = new Request('http://localhost:4001/artifact/review', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const res = await fetch(request);
    assert.strictEqual(res.status, 403, 'Expected 403 Forbidden');
});

console.log('CN-08-A artifact review endpoint tests completed');

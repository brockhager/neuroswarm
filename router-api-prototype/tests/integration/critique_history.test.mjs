/**
 * CN-09-B Integration Test: Critique History Endpoint
 * Tests the GET /artifact/critique/:artifact_id endpoint
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fetch from 'node-fetch';

const ROUTER_API_URL = process.env.ROUTER_API_URL || 'http://localhost:4001';
const NS_NODE_URL = process.env.NS_NODE_URL || 'http://localhost:3009';
const TEST_JWT = process.env.TEST_JWT || 'test_jwt_token_placeholder';

describe('CN-09-B: Critique History Endpoint', () => {
    let testArtifactId = 'bafyTestArtifact12345';

    it('should reject requests without JWT authentication', async () => {
        const response = await fetch(`${ROUTER_API_URL}/artifact/critique/${testArtifactId}`, {
            method: 'GET'
        });

        assert.equal(response.status, 401, 'Should return 401 Unauthorized without JWT');
    });

    it('should reject invalid artifact_id format', async () => {
        const response = await fetch(`${ROUTER_API_URL}/artifact/critique/invalid-cid`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEST_JWT}`
            }
        });

        assert.equal(response.status, 400, 'Should return 400 for invalid CID format');
        const data = await response.json();
        assert.match(data.error, /invalid_artifact_id/, 'Error should mention invalid_artifact_id');
    });

    it('should return empty array for artifact with no critiques', async () => {
        const response = await fetch(`${ROUTER_API_URL}/artifact/critique/${testArtifactId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEST_JWT}`
            }
        });

        // May return 404 or 200 with empty array depending on implementation
        assert.ok(response.status === 200 || response.status === 404, 'Should return 200 or 404');

        if (response.status === 200) {
            const data = await response.json();
            assert.ok(data.artifact_id, 'Response should include artifact_id');
            assert.ok(Array.isArray(data.critiques), 'Response should include critiques array');
            assert.equal(data.total_critiques, 0, 'Should have zero critiques for new artifact');
        }
    });

    it('should fetch critique history from NS-Node internal endpoint', async () => {
        // Test direct NS-Node endpoint (internal, no auth required)
        const response = await fetch(`${NS_NODE_URL}/chain/critiques/${testArtifactId}`, {
            method: 'GET'
        });

        assert.equal(response.status, 200, 'NS-Node should return 200');
        const data = await response.json();
        assert.ok(data.artifact_id, 'NS-Node response should include artifact_id');
        assert.ok(Array.isArray(data.critiques), 'NS-Node response should include critiques array');
    });
});

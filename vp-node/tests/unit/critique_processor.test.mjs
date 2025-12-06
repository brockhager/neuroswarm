import test from 'node:test';
import assert from 'assert';
import { CritiqueProcessor, ARTIFACT_CRITIQUE_SCHEMA } from '../../src/critique-processor.mjs';

// Mock Gemini API for testing
const MOCK_GEMINI_KEY = 'test-key-mock-12345';

test('CritiqueProcessor - initialization requires GEMINI_API_KEY', () => {
    assert.throws(
        () => new CritiqueProcessor({ geminiApiKey: null, validatorId: 'test-val' }),
        /GEMINI_API_KEY environment variable required/,
        'Should throw when GEMINI_API_KEY is missing'
    );
});

test('CritiqueProcessor - creates valid ARTIFACT_CRITIQUE transaction structure', () => {
    const processor = new CritiqueProcessor({
        geminiApiKey: MOCK_GEMINI_KEY,
        validatorId: 'test-validator-alice',
        logFn: () => { }, // Silent logger
    });

    const mockCritiquePayload = {
        artifact_id: 'bafytest123',
        review_block_height: 12345,
        critique_version: '1.0.0',
        llm_model: 'gemini-2.0-flash-exp',
        issues: [
            {
                severity: 'HIGH',
                type: 'Security Issue',
                file_path: 'src/auth.js',
                line_range: '42-45',
                comment: 'SQL injection vulnerability detected',
            },
        ],
    };

    const tx = processor.createCritiqueTx(mockCritiquePayload);

    assert.strictEqual(tx.type, 'ARTIFACT_CRITIQUE', 'Transaction type should be ARTIFACT_CRITIQUE');
    assert.strictEqual(tx.from, 'test-validator-alice', 'Transaction sender should be validator ID');
    assert.ok(tx.payload, 'Transaction should have payload');
    assert.strictEqual(tx.payload.artifact_id, 'bafytest123', 'Payload should include artifact_id');
    assert.ok(Array.isArray(tx.payload.issues), 'Payload should have issues array');
    assert.strictEqual(tx.payload.issues.length, 1, 'Payload should have 1 issue');
    assert.ok(tx.timestamp, 'Transaction should have timestamp');
    assert.ok(typeof tx.timestamp === 'number', 'Timestamp should be a number');
});

test('CritiqueProcessor - rejects invalid REQUEST_REVIEW transactions', async () => {
    const processor = new CritiqueProcessor({
        geminiApiKey: MOCK_GEMINI_KEY,
        validatorId: 'test-validator',
        logFn: () => { },
    });

    // Missing type
    const invalidTx1 = { artifact_id: 'bafytest' };
    const result1 = await processor.processReviewRequest(invalidTx1, 'http://localhost:8080');
    assert.strictEqual(result1, null, 'Should return null for invalid REQUEST_REVIEW (missing type)');

    // Missing artifact_id
    const invalidTx2 = { type: 'REQUEST_REVIEW' };
    const result2 = await processor.processReviewRequest(invalidTx2, 'http://localhost:8080');
    assert.strictEqual(result2, null, 'Should return null for missing artifact_id');

    // Null input
    const result3 = await processor.processReviewRequest(null, 'http://localhost:8080');
    assert.strictEqual(result3, null, 'Should return null for null input');
});

test('ARTIFACT_CRITIQUE_SCHEMA - validates required fields', () => {
    assert.ok(ARTIFACT_CRITIQUE_SCHEMA, 'Schema should be defined');
    assert.ok(ARTIFACT_CRITIQUE_SCHEMA.type, 'Schema should have type');
    assert.ok(ARTIFACT_CRITIQUE_SCHEMA.properties, 'Schema should have properties');

    const requiredFields = ARTIFACT_CRITIQUE_SCHEMA.required;
    assert.ok(Array.isArray(requiredFields), 'Required fields should be an array');
    assert.ok(requiredFields.includes('artifact_id'), 'artifact_id should be required');
    assert.ok(requiredFields.includes('review_block_height'), 'review_block_height should be required');
    assert.ok(requiredFields.includes('critique_version'), 'critique_version should be required');
    assert.ok(requiredFields.includes('llm_model'), 'llm_model should be required');
    assert.ok(requiredFields.includes('issues'), 'issues should be required');
});

test('ARTIFACT_CRITIQUE_SCHEMA - issues array has correct severity enum', () => {
    const issuesSchema = ARTIFACT_CRITIQUE_SCHEMA.properties.issues;
    assert.ok(issuesSchema, 'issues property should exist');
    assert.ok(issuesSchema.items, 'issues should have items schema');

    const severityProp = issuesSchema.items.properties.severity;
    assert.ok(severityProp, 'severity property should exist');
    assert.ok(severityProp.enum, 'severity should have enum');
    assert.deepStrictEqual(
        severityProp.enum,
        ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SUGGESTION'],
        'Severity enum should match CTO-approved values'
    );
});

console.log('CN-08-B CritiqueProcessor unit tests completed');

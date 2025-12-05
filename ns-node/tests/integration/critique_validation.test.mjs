import test from 'node:test';
import assert from 'assert';
import { validateCritiquePayload } from '../../src/services/critique-validation.js';

/**
 * CN-08-C Integration Tests: ARTIFACT_CRITIQUE Security Validation
 * Tests the three mandatory security checks:
 * 1. Producer-Only Source Verification
 * 2. Strict JSON Schema Validation  
 * 3. Anti-Spam/Uniqueness Protection
 */

// ============================================================================
// Security Check #2: JSON Schema Validation Tests
// ============================================================================

test('CN-08-C: validateCritiquePayload - accepts valid payload', () => {
    const validPayload = {
        artifact_id: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        review_block_height: 12345,
        critique_version: '1.0.0',
        llm_model: 'gemini-2.0-flash-exp',
        issues: [
            {
                severity: 'HIGH',
                type: 'Security Issue',
                file_path: 'src/auth.js',
                line_range: '42-45',
                comment: 'SQL injection vulnerability detected in user input handling'
            }
        ]
    };

    const result = validateCritiquePayload(validPayload);
    assert.strictEqual(result.valid, true, 'Valid payload should pass validation');
    assert.ok(!result.errors, 'Valid payload should not have errors');
});

test('CN-08-C: validateCritiquePayload - rejects missing required fields', () => {
    const invalidPayload = {
        artifact_id: 'bafytest123',
        // Missing: review_block_height, critique_version, llm_model, issues
    };

    const result = validateCritiquePayload(invalidPayload);
    assert.strictEqual(result.valid, false, 'Should reject incomplete payload');
    assert.ok(result.errors, 'Should return error details');
    assert.ok(result.errors[0].includes('missing required fields'), 'Should identify missing fields');
});

test('CN-08-C: validateCritiquePayload - validates severity enum', () => {
    const invalidPayload = {
        artifact_id: 'bafytest123',
        review_block_height: 100,
        critique_version: '1.0.0',
        llm_model: 'test-model',
        issues: [
            {
                severity: 'INVALID_SEVERITY', // Invalid enum value
                type: 'Test',
                file_path: 'test.js',
                line_range: '1',
                comment: 'Test comment'
            }
        ]
    };

    const result = validateCritiquePayload(invalidPayload);
    assert.strictEqual(result.valid, false, 'Should reject invalid severity');
    assert.ok(result.errors[0].includes('severity must be one of'), 'Should validate severity enum');
});

test('CN-08-C: validateCritiquePayload - validates all severity levels', () => {
    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SUGGESTION'];

    for (const severity of validSeverities) {
        const payload = {
            artifact_id: 'bafytest123',
            review_block_height: 100,
            critique_version: '1.0.0',
            llm_model: 'test-model',
            issues: [{
                severity,
                type: 'Test',
                file_path: 'test.js',
                line_range: '1',
                comment: 'Test'
            }]
        };

        const result = validateCritiquePayload(payload);
        assert.strictEqual(result.valid, true, `Severity ${severity} should be valid`);
    }
});

test('CN-08-C: validateCritiquePayload - rejects payload with missing issue fields', () => {
    const invalidPayload = {
        artifact_id: 'bafytest123',
        review_block_height: 100,
        critique_version: '1.0.0',
        llm_model: 'test-model',
        issues: [
            {
                severity: 'HIGH',
                type: 'Security Issue'
                // Missing: file_path, line_range, comment
            }
        ]
    };

    const result = validateCritiquePayload(invalidPayload);
    assert.strictEqual(result.valid, false, 'Should reject issue with missing fields');
    assert.ok(result.errors[0].includes('missing fields'), 'Should identify missing issue fields');
});

test('CN-08-C: validateCritiquePayload - validates empty issues array', () => {
    const validPayload = {
        artifact_id: 'bafytest123',
        review_block_height: 100,
        critique_version: '1.0.0',
        llm_model: 'test-model',
        issues: [] // No issues found
    };

    const result = validateCritiquePayload(validPayload);
    assert.strictEqual(result.valid, true, 'Empty issues array should be valid (no issues found)');
});

test('CN-08-C: validateCritiquePayload - rejects non-array issues', () => {
    const invalidPayload = {
        artifact_id: 'bafytest123',
        review_block_height: 100,
        critique_version: '1.0.0',
        llm_model: 'test-model',
        issues: 'not an array' // Invalid type
    };

    const result = validateCritiquePayload(invalidPayload);
    assert.strictEqual(result.valid, false, 'Should reject non-array issues');
    assert.ok(result.errors[0].includes('issues must be an array'), 'Should validate issues type');
});

test('CN-08-C: validateCritiquePayload - rejects negative block height', () => {
    const invalidPayload = {
        artifact_id: 'bafytest123',
        review_block_height: -1, // Negative height
        critique_version: '1.0.0',
        llm_model: 'test-model',
        issues: []
    };

    const result = validateCritiquePayload(invalidPayload);
    assert.strictEqual(result.valid, false, 'Should reject negative block height');
    assert.ok(result.errors[0].includes('non-negative number'), 'Should validate block height');
});

test('CN-08-C: validateCritiquePayload - rejects empty string fields', () => {
    const invalidPayload = {
        artifact_id: '   ', // Whitespace only
        review_block_height: 100,
        critique_version: '1.0.0',
        llm_model: 'test-model',
        issues: []
    };

    const result = validateCritiquePayload(invalidPayload);
    assert.strictEqual(result.valid, false, 'Should reject empty/whitespace strings');
    assert.ok(result.errors[0].includes('non-empty string'), 'Should validate string emptiness');
});

test('CN-08-C: validateCritiquePayload - validates multiple issues', () => {
    const validPayload = {
        artifact_id: 'bafytest123',
        review_block_height: 100,
        critique_version: '1.0.0',
        llm_model: 'test-model',
        issues: [
            {
                severity: 'CRITICAL',
                type: 'Security Issue',
                file_path: 'src/auth.js',
                line_range: '10-15',
                comment: 'Authentication bypass vulnerability'
            },
            {
                severity: 'MEDIUM',
                type: 'Code Quality',
                file_path: 'src/utils.js',
                line_range: '42',
                comment: 'Unused variable declaration'
            },
            {
                severity: 'LOW',
                type: 'Style',
                file_path: 'src/index.js',
                line_range: '1-5',
                comment: 'Missing JSDoc comments'
            }
        ]
    };

    const result = validateCritiquePayload(validPayload);
    assert.strictEqual(result.valid, true, 'Should accept payload with multiple valid issues');
});

console.log('CN-08-C Schema Validation Tests Complete ✅');

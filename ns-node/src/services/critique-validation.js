/**
 * CN-08-C: ARTIFACT_CRITIQUE Transaction Validation
 * Security hardening for LLM-generated code review transactions
 */

/**
 * Validate ARTIFACT_CRITIQUE payload structure
 * Enforces strict JSON schema validation to prevent tampering or LLM failures.
 * 
 * @param {Object} payload - The critique payload to validate
 * @returns {Object} - { valid: boolean, errors?: string[] }
 */
export function validateCritiquePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return { valid: false, errors: ['payload must be an object'] };
    }

    // Required top-level fields
    const required = ['artifact_id', 'review_block_height', 'critique_version', 'llm_model', 'issues'];
    const missing = required.filter(f => !(f in payload));
    if (missing.length > 0) {
        return { valid: false, errors: [`missing required fields: ${missing.join(', ')}`] };
    }

    // artifact_id: non-empty string
    if (typeof payload.artifact_id !== 'string' || !payload.artifact_id.trim()) {
        return { valid: false, errors: ['artifact_id must be non-empty string'] };
    }

    // review_block_height: number
    if (typeof payload.review_block_height !== 'number' || payload.review_block_height < 0) {
        return { valid: false, errors: ['review_block_height must be non-negative number'] };
    }

    // critique_version: non-empty string
    if (typeof payload.critique_version !== 'string' || !payload.critique_version.trim()) {
        return { valid: false, errors: ['critique_version must be non-empty string'] };
    }

    // llm_model: non-empty string
    if (typeof payload.llm_model !== 'string' || !payload.llm_model.trim()) {
        return { valid: false, errors: ['llm_model must be non-empty string'] };
    }

    // issues: array
    if (!Array.isArray(payload.issues)) {
        return { valid: false, errors: ['issues must be an array'] };
    }

    // Validate each issue
    for (let i = 0; i < payload.issues.length; i++) {
        const issue = payload.issues[i];
        if (!issue || typeof issue !== 'object') {
            return { valid: false, errors: [`issues[${i}] must be an object`] };
        }

        // Required issue fields
        const issueRequired = ['severity', 'type', 'file_path', 'line_range', 'comment'];
        const issueMissing = issueRequired.filter(f => !(f in issue));
        if (issueMissing.length > 0) {
            return { valid: false, errors: [`issues[${i}] missing fields: ${issueMissing.join(', ')}`] };
        }

        // severity: must be valid enum value
        const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SUGGESTION'];
        if (!validSeverities.includes(issue.severity)) {
            return { valid: false, errors: [`issues[${i}].severity must be one of: ${validSeverities.join(', ')}`] };
        }

        // type: non-empty string
        if (typeof issue.type !== 'string' || !issue.type.trim()) {
            return { valid: false, errors: [`issues[${i}].type must be non-empty string`] };
        }

        // file_path: non-empty string
        if (typeof issue.file_path !== 'string' || !issue.file_path.trim()) {
            return { valid: false, errors: [`issues[${i}].file_path must be non-empty string`] };
        }

        // line_range: non-empty string
        if (typeof issue.line_range !== 'string' || !issue.line_range.trim()) {
            return { valid: false, errors: [`issues[${i}].line_range must be non-empty string`] };
        }

        // comment: non-empty string
        if (typeof issue.comment !== 'string' || !issue.comment.trim()) {
            return { valid: false, errors: [`issues[${i}].comment must be non-empty string`] };
        }
    }

    return { valid: true };
}

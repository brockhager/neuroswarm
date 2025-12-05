const { db } = require('./index');

/**
 * Records an audit log entry.
 * 
 * @param {Object} params
 * @param {number|null} params.userId - Actor ID (null for system)
 * @param {string} params.action - Action type (e.g. ARTIFACT_SUBMIT)
 * @param {Object} [params.metadata] - Additional details
 */
async function logAction({ userId, action, metadata = {} }) {
    try {
        await db('audit_logs').insert({
            user_id: userId,
            action,
            metadata
        });
    } catch (err) {
        // Audit logging should not crash the application, but we should log the failure
        console.error('[Audit] Failed to write log:', err);
    }
}

module.exports = {
    logAction
};

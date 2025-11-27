/**
 * Generative Governance Service
 * 
 * Provides quality gates and validation rules for generated content:
 * - Length constraints
 * - Toxicity detection (basic)
 * - Coherence validation
 * - Audit logging
 * - Configurable thresholds
 */

class GenerativeGovernanceService {
    constructor(options = {}) {
        // Configuration with defaults
        this.config = {
            minTokens: options.minTokens || 1,
            maxTokens: options.maxTokens || 500,
            minCoherence: options.minCoherence || 0.3,
            toxicityEnabled: options.toxicityEnabled !== false,
            toxicityPatterns: options.toxicityPatterns || this.getDefaultToxicityPatterns(),
            strictMode: options.strictMode || false, // If true, reject instead of warn
            auditEnabled: options.auditEnabled !== false
        };

        // Audit log
        this.auditLog = [];
        this.maxAuditEntries = options.maxAuditEntries || 1000;

        // Metrics
        this.metrics = {
            totalValidations: 0,
            passed: 0,
            warned: 0,
            rejected: 0,
            lengthViolations: 0,
            toxicityViolations: 0,
            coherenceViolations: 0
        };
    }

    /**
     * Get default toxicity patterns (basic keyword-based)
     * In production, use a proper toxicity detection model
     */
    getDefaultToxicityPatterns() {
        return [
            /\b(hate|kill|attack|destroy)\b/i,
            /\b(stupid|idiot|dumb)\b/i,
            // Add more patterns as needed
        ];
    }

    /**
     * Validate generated text against governance rules
     * @param {string} text - Generated text
     * @param {Object} context - Context (query, metadata, etc.)
     * @returns {Object} - { status: 'pass'|'warn'|'reject', violations: [], score: number }
     */
    validate(text, context = {}) {
        this.metrics.totalValidations++;

        const violations = [];
        let status = 'pass';

        // 1. Length validation
        const tokenCount = this.estimateTokenCount(text);
        if (tokenCount < this.config.minTokens) {
            violations.push({
                type: 'length',
                severity: 'warn',
                message: `Text too short: ${tokenCount} tokens (min: ${this.config.minTokens})`
            });
            this.metrics.lengthViolations++;
        } else if (tokenCount > this.config.maxTokens) {
            violations.push({
                type: 'length',
                severity: this.config.strictMode ? 'reject' : 'warn',
                message: `Text too long: ${tokenCount} tokens (max: ${this.config.maxTokens})`
            });
            this.metrics.lengthViolations++;
        }

        // 2. Toxicity detection
        if (this.config.toxicityEnabled) {
            const toxicityResult = this.detectToxicity(text);
            if (toxicityResult.detected) {
                violations.push({
                    type: 'toxicity',
                    severity: 'reject',
                    message: `Potentially toxic content detected: ${toxicityResult.matches.join(', ')}`,
                    matches: toxicityResult.matches
                });
                this.metrics.toxicityViolations++;
            }
        }

        // 3. Coherence validation (if coherence score provided in context)
        if (context.coherenceScore !== undefined) {
            if (context.coherenceScore < this.config.minCoherence) {
                violations.push({
                    type: 'coherence',
                    severity: 'warn',
                    message: `Low coherence score: ${(context.coherenceScore * 100).toFixed(1)}% (min: ${(this.config.minCoherence * 100).toFixed(1)}%)`,
                    score: context.coherenceScore
                });
                this.metrics.coherenceViolations++;
            }
        }

        // Determine overall status
        const hasReject = violations.some(v => v.severity === 'reject');
        const hasWarn = violations.some(v => v.severity === 'warn');

        if (hasReject) {
            status = 'reject';
            this.metrics.rejected++;
        } else if (hasWarn) {
            status = 'warn';
            this.metrics.warned++;
        } else {
            this.metrics.passed++;
        }

        // Calculate quality score (0-1)
        const score = this.calculateQualityScore(text, violations, context);

        // Audit log
        if (this.config.auditEnabled) {
            this.addAuditEntry({
                timestamp: Date.now(),
                text: text.substring(0, 200), // Truncate for storage
                status,
                violations,
                score,
                context: {
                    query: context.query,
                    coherenceScore: context.coherenceScore
                }
            });
        }

        return {
            status,
            violations,
            score,
            tokenCount,
            passed: status === 'pass'
        };
    }

    /**
     * Estimate token count (rough approximation)
     * @param {string} text - Text to count
     * @returns {number} - Estimated token count
     */
    estimateTokenCount(text) {
        // Rough estimate: ~1.3 tokens per word on average
        const words = text.trim().split(/\s+/).length;
        return Math.ceil(words * 1.3);
    }

    /**
     * Detect toxicity using pattern matching
     * @param {string} text - Text to check
     * @returns {Object} - { detected: boolean, matches: [] }
     */
    detectToxicity(text) {
        const matches = [];

        for (const pattern of this.config.toxicityPatterns) {
            const match = text.match(pattern);
            if (match) {
                matches.push(match[0]);
            }
        }

        return {
            detected: matches.length > 0,
            matches
        };
    }

    /**
     * Calculate quality score based on violations and context
     * @param {string} text - Generated text
     * @param {Array} violations - Violations array
     * @param {Object} context - Context
     * @returns {number} - Quality score (0-1)
     */
    calculateQualityScore(text, violations, context) {
        let score = 1.0;

        // Penalize for violations
        for (const violation of violations) {
            if (violation.severity === 'reject') {
                score -= 0.5;
            } else if (violation.severity === 'warn') {
                score -= 0.2;
            }
        }

        // Factor in coherence if available
        if (context.coherenceScore !== undefined) {
            score = score * 0.7 + context.coherenceScore * 0.3;
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Add entry to audit log
     * @param {Object} entry - Audit entry
     */
    addAuditEntry(entry) {
        this.auditLog.push(entry);

        // Trim log if too large
        if (this.auditLog.length > this.maxAuditEntries) {
            this.auditLog.shift();
        }
    }

    /**
     * Get audit log
     * @param {Object} options - Filter options
     * @returns {Array} - Audit entries
     */
    getAuditLog(options = {}) {
        let filtered = this.auditLog;

        // Filter by status
        if (options.status) {
            filtered = filtered.filter(e => e.status === options.status);
        }

        // Filter by time range
        if (options.since) {
            filtered = filtered.filter(e => e.timestamp >= options.since);
        }

        // Limit results
        const limit = options.limit || 100;
        return filtered.slice(-limit);
    }

    /**
     * Get governance metrics
     * @returns {Object} - Metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            passRate: this.metrics.totalValidations > 0
                ? ((this.metrics.passed / this.metrics.totalValidations) * 100).toFixed(2) + '%'
                : 'N/A',
            rejectRate: this.metrics.totalValidations > 0
                ? ((this.metrics.rejected / this.metrics.totalValidations) * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Get current configuration
     * @returns {Object} - Configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            totalValidations: 0,
            passed: 0,
            warned: 0,
            rejected: 0,
            lengthViolations: 0,
            toxicityViolations: 0,
            coherenceViolations: 0
        };
    }

    /**
     * Clear audit log
     */
    clearAuditLog() {
        this.auditLog = [];
    }
}

module.exports = GenerativeGovernanceService;

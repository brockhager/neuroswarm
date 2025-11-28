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
            strictMode: options.strictMode || false,
            toxicityEnabled: options.toxicityEnabled !== false,
            toxicityPatterns: options.toxicityPatterns || this.getDefaultToxicityPatterns(),
            onAudit: options.onAudit || null
        };

        // Metrics
        this.metrics = {
            totalValidations: 0,
            passed: 0,
            warned: 0,
            rejected: 0,
            lengthViolations: 0,
            toxicityViolations: 0,
            coherenceViolations: 0,
            customViolations: 0
        };

        // Audit log
        this.auditLog = [];

        // Custom validators
        this.customValidators = new Map();
    }

    // Register a custom validator function
    // @param {string} name - Validator name
    // @param {Function} validatorFn - Async function(text, context) -> { status: 'pass'|'warn'|'reject', message: string }
    registerValidator(name, validatorFn) {
        if (typeof validatorFn !== 'function') {
            throw new Error('Validator must be a function');
        }
        this.customValidators.set(name, validatorFn);
    }

    // Get default toxicity patterns (basic keyword-based)
    // In production, use a proper toxicity detection model
    getDefaultToxicityPatterns() {
        return [
            /\b(hate|kill|die|stupid|idiot)\b/gi
        ];
    }

    // Validate generated text against governance rules
    // @param {string} text - Generated text
    // @param {Object} context - Context (query, metadata, etc.)
    // @returns {Promise<Object>} - { status: 'pass'|'warn'|'reject', violations: [], score: number }
    async validate(text, context = {}) {
        this.metrics.totalValidations++;

        const violations = [];
        let status = 'pass';

        // 1. Length validation
        const tokenCount = this.estimateTokenCount(text);
        if (tokenCount < this.config.minTokens) {
            violations.push({
                type: 'length',
                severity: 'reject',
                message: `Content too short: ${tokenCount} tokens (min: ${this.config.minTokens})`
            });
            this.metrics.lengthViolations++;
        } else if (tokenCount > this.config.maxTokens) {
            violations.push({
                type: 'length',
                severity: 'warn',
                message: `Content too long: ${tokenCount} tokens (max: ${this.config.maxTokens})`
            });
            this.metrics.lengthViolations++;
        }

        // 2. Toxicity detection
        if (this.config.toxicityEnabled) {
            const toxicityResult = this.detectToxicity(text);
            if (toxicityResult.detected) {
                violations.push({
                    type: 'toxicity',
                    severity: this.config.strictMode ? 'reject' : 'warn',
                    message: `Potentially toxic content detected: ${toxicityResult.matches.join(', ')}`
                });
                this.metrics.toxicityViolations++;
            }
        }

        // 3. Coherence validation
        if (context.coherenceScore !== undefined && context.coherenceScore < this.config.minCoherence) {
            violations.push({
                type: 'coherence',
                severity: 'warn',
                message: `Low coherence score: ${context.coherenceScore.toFixed(2)} (min: ${this.config.minCoherence})`
            });
            this.metrics.coherenceViolations++;
        }

        // 4. Custom validators
        for (const [name, validatorFn] of this.customValidators) {
            try {
                const result = await validatorFn(text, context);
                if (result.status !== 'pass') {
                    violations.push({
                        type: `custom:${name}`,
                        severity: result.status,
                        message: result.message || `Validation failed for ${name}`
                    });
                    this.metrics.customViolations++;
                }
            } catch (e) {
                console.warn(`Validator ${name} failed:`, e.message);
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

        // Calculate quality score
        const score = this.calculateQualityScore(text, violations, context);

        // Create audit entry
        const auditEntry = {
            timestamp: new Date().toISOString(),
            text: text.substring(0, 200), // Store first 200 chars
            status,
            violations,
            score,
            tokenCount,
            context: {
                query: context.query,
                coherenceScore: context.coherenceScore
            }
        };

        this.auditLog.push(auditEntry);

        // Trigger onAudit callback if provided
        if (this.config.onAudit) {
            try {
                this.config.onAudit(auditEntry);
            } catch (e) {
                console.error('onAudit callback failed:', e);
            }
        }

        // Keep audit log size manageable
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }

        return {
            status,
            violations,
            score,
            tokenCount
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

        // Incorporate coherence if available
        if (context.coherenceScore !== undefined) {
            score = (score + context.coherenceScore) / 2;
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Get current metrics
     * @returns {Object} - Metrics object
     */
    getMetrics() {
        const total = this.metrics.totalValidations || 1;
        return {
            ...this.metrics,
            passRate: ((this.metrics.passed / total) * 100).toFixed(2),
            warnRate: ((this.metrics.warned / total) * 100).toFixed(2),
            rejectRate: ((this.metrics.rejected / total) * 100).toFixed(2)
        };
    }

    /**
     * Get audit log
     * @param {Object} filters - Optional filters
     * @returns {Array} - Audit entries
     */
    getAuditLog(filters = {}) {
        let log = [...this.auditLog];

        if (filters.status) {
            log = log.filter(entry => entry.status === filters.status);
        }

        if (filters.since) {
            const sinceDate = new Date(filters.since);
            log = log.filter(entry => new Date(entry.timestamp) >= sinceDate);
        }

        if (filters.limit) {
            log = log.slice(-filters.limit);
        }

        return log;
    }

    /**
     * Get current configuration
     * @returns {Object} - Configuration object
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration
     * @param {Object} updates - Configuration updates
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        console.log('Governance config updated:', updates);
    }
}

export default GenerativeGovernanceService;

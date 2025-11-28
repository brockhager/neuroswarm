/**
 * Length Validator Plugin
 * 
 * Validates content length against minimum and maximum word thresholds
 */

class LengthValidator {
    constructor(config = {}) {
        this.minWords = config.minWords || 5;
        this.maxWords = config.maxWords || 500;
        this.severity = config.severity || 'reject';

        console.log(`[LengthValidator] Min: ${this.minWords} words, Max: ${this.maxWords} words`);
    }

    /**
     * Validate text length
     * @param {string} text - Text to validate
     * @param {Object} context - Validation context
     * @returns {Object} Validation result
     */
    async validate(text, context = {}) {
        const words = text.trim().split(/\s+/);
        const wordCount = words.length;

        if (wordCount < this.minWords) {
            return {
                status: this.severity,
                message: `Content too short: ${wordCount} words (minimum: ${this.minWords})`,
                details: {
                    wordCount,
                    minWords: this.minWords,
                    shortfall: this.minWords - wordCount
                }
            };
        }

        if (wordCount > this.maxWords) {
            return {
                status: this.severity,
                message: `Content too long: ${wordCount} words (maximum: ${this.maxWords})`,
                details: {
                    wordCount,
                    maxWords: this.maxWords,
                    excess: wordCount - this.maxWords
                }
            };
        }

        return {
            status: 'pass',
            message: `Length valid: ${wordCount} words`,
            details: { wordCount }
        };
    }
}

export default LengthValidator;

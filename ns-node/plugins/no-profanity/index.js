/**
 * No Profanity Validator Plugin
 * 
 * Detects profanity and offensive language in generated content
 */

class NoProfanityValidator {
    constructor(config = {}) {
        this.config = config;
        this.severity = config.severity || 'warn';

        // Basic profanity dictionary (expandable)
        this.dictionary = [
            'damn', 'hell', 'crap', 'stupid', 'idiot',
            // Add more as needed - this is just a demo
        ];

        console.log(`[NoProfanityValidator] Initialized with severity: ${this.severity}`);
    }

    /**
     * Validate text for profanity
     * @param {string} text - Text to validate
     * @param {Object} context - Validation context
     * @returns {Object} Validation result
     */
    async validate(text, context = {}) {
        const words = text.toLowerCase().split(/\s+/);
        const profaneWords = words.filter(word =>
            this.dictionary.some(prof => word.includes(prof))
        );

        if (profaneWords.length > 0) {
            return {
                status: this.severity, // 'warn' or 'reject'
                message: `Profanity detected: ${profaneWords.length} instance(s)`,
                details: {
                    count: profaneWords.length,
                    words: profaneWords,
                    severity: this.severity
                }
            };
        }

        return {
            status: 'pass',
            message: 'No profanity detected'
        };
    }
}

export default NoProfanityValidator;

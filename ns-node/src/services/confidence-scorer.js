/**
 * Confidence Scoring Service
 * 
 * Calculates confidence scores for answers to determine if they should be stored in IPFS.
 * Uses multi-factor scoring: source reliability, answer completeness, cross-validation,
 * response quality, and context utilization.
 * 
 * Total: 100 points → Normalized to 0.0-1.0 scale
 * Threshold for IPFS storage: 0.85 (85 points)
 */

const CONFIDENCE_THRESHOLD = 0.85;

/**
 * Score source reliability (0-30 points)
 * Deterministic sources are most reliable
 */
export function scoreSourceReliability(source) {
    const reliabilityScores = {
        'math-calculator': 30,
        'coingecko': 30,
        'nba-scores': 28,
        'news-aggregator': 28,
        'ipfs-knowledge': 28,
        'local-llm': 20,
        'openai-chat': 18,
        'web-search': 15,
        'duckduckgo-search': 15,
        'generic-fallback': 0
    };

    return reliabilityScores[source] || 10; // Default for unknown sources
}

/**
 * Score answer completeness (0-25 points)
 * Specific, detailed answers score higher
 */
export function scoreAnswerCompleteness(answer) {
    if (!answer || typeof answer !== 'string') return 0;

    let score = 0;

    // Has specific data/numbers (prices, scores, calculations)
    if (/\d+/.test(answer) && answer.length > 10) {
        score += 15;
    }

    // Has explanation or context (longer, substantive answers)
    if (answer.length > 100) {
        score += 10;
    } else if (answer.length > 50) {
        score += 5;
    }

    // Not an error message
    if (!answer.match(/error|failed|couldn't find|not connected/i)) {
        score += 5;
    } else {
        return 0; // Error messages get 0
    }

    // Has proper sentence structure
    if (answer.match(/[.!?]/) && answer.split(/[.!?]/).length > 1) {
        score += 5;
    }

    return Math.min(score, 25);
}

/**
 * Score cross-validation (0-20 points)
 * Multiple sources agreeing increases confidence
 */
export function scoreCrossValidation(sources) {
    if (!Array.isArray(sources)) sources = [sources];

    const uniqueSources = new Set(sources.filter(s => s));

    if (uniqueSources.size >= 3) return 20; // 3+ sources
    if (uniqueSources.size === 2) return 15; // 2 sources
    if (uniqueSources.size === 1) return 10; // Single source
    return 0;
}

/**
 * Score response quality (0-15 points)
 * Well-formatted responses with citations score higher
 */
export function scoreResponseQuality(answer, query) {
    if (!answer || typeof answer !== 'string') return 0;

    let score = 0;

    // Has proper formatting (emojis, structure)
    if (/[🏀💰📰🌤️📊💡🔍]/.test(answer)) {
        score += 5;
    }

    // Has source citation
    if (/source:|from:|via:|according to/i.test(answer)) {
        score += 5;
    }

    // Relevant to query (contains key terms from query)
    if (query && typeof query === 'string') {
        const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
        const answerLower = answer.toLowerCase();
        const relevantTerms = queryTerms.filter(term => answerLower.includes(term));

        if (relevantTerms.length >= queryTerms.length * 0.5) {
            score += 5;
        }
    }

    return Math.min(score, 15);
}

/**
 * Score context utilization (0-10 points)
 * Using available context improves confidence
 */
export function scoreContextUtilization(contextUsed, contextAvailable) {
    if (!contextAvailable || contextAvailable.length === 0) {
        return 5; // No context available, neutral score
    }

    if (contextUsed) {
        return 10; // Context was used
    }

    return 0; // Context available but not used
}

/**
 * Calculate overall confidence score
 * 
 * @param {string} answer - The answer text
 * @param {Object} metadata - Metadata about the answer
 * @param {string} metadata.source - Source adapter name
 * @param {string} metadata.query - Original query
 * @param {boolean} metadata.contextUsed - Whether context was used
 * @param {Array} metadata.contextAvailable - Available context
 * @param {Array} metadata.sources - All sources consulted
 * @param {boolean} metadata.hasSourceCitation - Whether answer cites sources
 * @param {boolean} metadata.isFormatted - Whether answer is well-formatted
 * 
 * @returns {Object} { score, breakdown, shouldStore }
 */
export function calculateConfidence(answer, metadata = {}) {
    const breakdown = {
        sourceReliability: scoreSourceReliability(metadata.source),
        answerCompleteness: scoreAnswerCompleteness(answer),
        crossValidation: scoreCrossValidation(metadata.sources || [metadata.source]),
        responseQuality: scoreResponseQuality(answer, metadata.query),
        contextUtilization: scoreContextUtilization(
            metadata.contextUsed,
            metadata.contextAvailable
        )
    };

    // Calculate total score (0-100)
    const totalPoints = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    // Normalize to 0.0-1.0 scale
    const score = totalPoints / 100;

    // Determine if should store
    const shouldStore = score >= CONFIDENCE_THRESHOLD;

    return {
        score: Math.round(score * 100) / 100, // Round to 2 decimal places
        breakdown,
        totalPoints,
        shouldStore,
        threshold: CONFIDENCE_THRESHOLD
    };
}

/**
 * Get confidence level description
 */
export function getConfidenceLevel(score) {
    if (score >= 0.90) return 'Very High';
    if (score >= 0.85) return 'High';
    if (score >= 0.70) return 'Medium';
    if (score >= 0.50) return 'Low';
    return 'Very Low';
}

export default {
    calculateConfidence,
    scoreSourceReliability,
    scoreAnswerCompleteness,
    scoreCrossValidation,
    scoreResponseQuality,
    scoreContextUtilization,
    getConfidenceLevel,
    CONFIDENCE_THRESHOLD
};

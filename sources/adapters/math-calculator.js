const ORIGIN = 'math-calculator';

/**
 * Math calculator adapter for simple arithmetic operations
 * @param {Object} params - Query parameters
 * @param {string} params.query - Math expression to evaluate
 * @returns {Object} Normalized adapter response with calculation result
 */
export async function query(params) {
    try {
        const queryText = params.query || params.q;
        if (!queryText) {
            throw new Error('query parameter required');
        }

        // Preprocess: Convert word-based operators to symbols
        let processedQuery = queryText
            .replace(/\btimes\b/gi, '*')
            .replace(/\bmultiplied\s+by\b/gi, '*')
            .replace(/\bdivided\s+by\b/gi, '/')
            .replace(/\bplus\b/gi, '+')
            .replace(/\bminus\b/gi, '-');

        // Detect if this is a math question
        const mathPatterns = [
            /what\s+is\s+([\d\s+\-*/().]+)\??/i,
            /calculate\s+([\d\s+\-*/().]+)/i,
            /^([\d\s+\-*/().]+)=?\??$/,
            /([\d,]+)\s*([+\-*/×÷])\s*([\d,]+)/
        ];

        let expression = null;
        for (const pattern of mathPatterns) {
            const match = processedQuery.match(pattern);
            if (match) {
                expression = match[1] || `${match[1]} ${match[2]} ${match[3]}`;
                break;
            }
        }

        if (!expression) {
            return {
                source: 'Math Calculator',
                value: null,
                error: 'Not a math expression',
                verifiedAt: new Date().toISOString(),
                origin: ORIGIN
            };
        }

        // Clean and normalize the expression
        expression = expression
            .replace(/,/g, '')           // Remove commas
            .replace(/×/g, '*')          // Replace × with *
            .replace(/÷/g, '/')          // Replace ÷ with /
            .replace(/\s+/g, '')         // Remove whitespace
            .trim();

        // Security: Only allow numbers and basic operators
        if (!/^[\d+\-*/().]+$/.test(expression)) {
            throw new Error('Invalid characters in expression');
        }

        // Evaluate the expression
        let result;
        try {
            // Use Function constructor for safe evaluation (limited scope)
            result = Function(`'use strict'; return (${expression})`)();
        } catch (e) {
            throw new Error('Invalid math expression');
        }

        // Format the result
        const formattedResult = typeof result === 'number'
            ? result.toLocaleString('en-US', { maximumFractionDigits: 10 })
            : result;

        const answer = `${expression} = ${formattedResult}`;

        return {
            source: 'Math Calculator',
            value: {
                query: queryText,
                expression: expression,
                result: result,
                answer: { text: answer },
                timestamp: new Date().toISOString()
            },
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: { expression, result }
        };

    } catch (e) {
        return {
            source: 'Math Calculator',
            value: null,
            error: e.message,
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: { error: e.message }
        };
    }
}

export async function status() {
    return { ok: true, message: 'Math Calculator Ready' };
}

import fetch from 'node-fetch';

const ORIGIN = 'openai-api';

/**
 * Query OpenAI Chat API
 * @param {Object} params - Query parameters
 * @param {string} params.query - User message/prompt
 * @param {string} params.model - Model to use (default: gpt-4o)
 * @returns {Object} Normalized adapter response
 */
export async function query(params) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY not configured');
        }

        const prompt = params.query || params.q;
        if (!prompt) throw new Error('query parameter required');

        const model = params.model || 'gpt-4o';

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: 'You are NeuroSwarm, a helpful AI assistant.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`openai-api-${response.status}: ${err}`);
        }

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || '';

        return {
            source: 'OpenAI',
            value: {
                answer: answer,
                model: data.model,
                usage: data.usage
            },
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: data
        };

    } catch (e) {
        return {
            source: 'OpenAI',
            value: null,
            error: e.message,
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: { error: e.message }
        };
    }
}

export async function status() {
    if (!process.env.OPENAI_API_KEY) {
        return { ok: false, message: 'OPENAI_API_KEY missing' };
    }
    return { ok: true, message: 'OpenAI adapter ready' };
}

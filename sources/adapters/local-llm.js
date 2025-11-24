import fetch from 'node-fetch';

const ORIGIN = 'local-llm';

/**
 * Query Local LLM (Ollama/LocalAI)
 * @param {Object} params - Query parameters
 * @param {string} params.query - User message/prompt
 * @param {string} [params.model='llama3'] - Model to use
 * @returns {Promise<Object>} - Query result
 */
export async function query({ query: prompt, model = 'llama3' }) {
    try {
        const endpoint = process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434/v1/chat/completions';

        // Check if local LLM is reachable and get available models
        let availableModel = model;
        try {
            const tagsRes = await fetch(endpoint.replace('/api/chat', '/api/tags'), { timeout: 1000 });
            if (tagsRes.ok) {
                const tagsData = await tagsRes.json();
                if (tagsData.models && tagsData.models.length > 0) {
                    // Use the first available model if the requested one isn't found? 
                    // Or just default to the first one if we are using the default 'llama3'
                    if (model === 'llama3' && !tagsData.models.find(m => m.name.includes('llama3'))) {
                        availableModel = tagsData.models[0].name;
                        console.log(`Default model 'llama3' not found, using '${availableModel}'`);
                    }
                }
            }
        } catch (e) {
            throw new Error(`Local LLM not reachable at ${endpoint}`);
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: availableModel,
                messages: [
                    { role: 'system', content: 'You are NeuroSwarm, a helpful AI assistant.' },
                    { role: 'user', content: prompt }
                ],
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Local LLM API error: ${response.status} ${response.statusText} - ${errorData.message || JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const message = data.choices[0]?.message?.content;

        return {
            source: 'LocalLLM',
            value: message,
            error: null,
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: data
        };
    } catch (e) {
        return {
            source: 'LocalLLM',
            value: null,
            error: e.message,
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: { error: e.message }
        };
    }
}

export async function status() {
    try {
        const endpoint = process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434/v1/models';
        const res = await fetch(endpoint);
        return { ok: res.ok, message: res.ok ? 'Local LLM reachable' : `http ${res.status}` };
    } catch (e) {
        return { ok: false, message: 'Local LLM unreachable' };
    }
}

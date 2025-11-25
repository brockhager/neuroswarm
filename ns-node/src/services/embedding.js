// src/services/embedding.js
// Helper to generate embeddings using the local Ollama server (llama3.2)
// Returns a Float32 array (or plain number array) of the embedding vector.
// Includes retry logic and health checks.

const OLLAMA_URL = "http://localhost:11434/api/embeddings";
const MODEL = "llama3.2";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function checkOllamaHealth() {
    try {
        const response = await fetch(`${OLLAMA_URL.replace('/api/embeddings', '/api/tags')}`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        if (!response.ok) return false;
        const data = await response.json();
        return data.models && data.models.some(m => m.name.includes(MODEL));
    } catch (e) {
        console.warn('Ollama health check failed:', e.message);
        return false;
    }
}

async function embedWithRetry(text, attempt = 1) {
    try {
        const response = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: MODEL, prompt: text }),
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        if (!response.ok) {
            throw new Error(`Ollama embedding request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.embedding || !Array.isArray(data.embedding)) {
            throw new Error('Invalid embedding response from Ollama');
        }
        return data.embedding;
    } catch (error) {
        console.warn(`Embedding attempt ${attempt} failed:`, error.message);
        if (attempt < MAX_RETRIES) {
            console.log(`Retrying in ${RETRY_DELAY}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return embedWithRetry(text, attempt + 1);
        }
        throw new Error(`Embedding generation failed after ${MAX_RETRIES} attempts: ${error.message}`);
    }
}

export async function embed(text) {
    // First check Ollama health
    const isHealthy = await checkOllamaHealth();
    if (!isHealthy) {
        throw new Error('Ollama service unavailable. Semantic features disabled.');
    }

    return await embedWithRetry(text);
}

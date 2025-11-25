// src/services/embedding.js
// Helper to generate embeddings using the local Ollama server (llama3.2)
// Returns a Float32 array (or plain number array) of the embedding vector.

export async function embed(text) {
    const OLLAMA_URL = "http://localhost:11434/api/embeddings";
    const MODEL = "llama3.2";
    const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, prompt: text })
    });
    if (!response.ok) {
        throw new Error(`Ollama embedding request failed: ${response.statusText}`);
    }
    const data = await response.json();
    // Ollama returns { embedding: [...] }
    return data.embedding;
}

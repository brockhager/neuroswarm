// generate-embedding.js
// Local Ollama embedding helper (llama3.2)
// Usage: node generate-embedding.js "Your text here"

import fs from "fs";

// Ollama embedding endpoint (default local address)
const OLLAMA_URL = "http://localhost:11434/api/embeddings";
const MODEL = "llama3.2";

async function generateEmbedding(text) {
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

async function main() {
    const text = process.argv[2];
    if (!text) {
        console.error("Usage: node generate-embedding.js \"Your text here\"");
        process.exit(1);
    }

    const embedding = await generateEmbedding(text);

    // Load current index (or create if missing)
    const indexPath = "./data/knowledge-index.json";
    let index = [];
    if (fs.existsSync(indexPath)) {
        index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    }

    // Append new entry (minimal fields for testing)
    index.push({
        question: text.toLowerCase(),
        embedding,
        timestamp: new Date().toISOString()
    });

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log("Embedding stored for:", text);
}

main();

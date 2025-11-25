// src/services/embedding-search.js
// Utility for cosine similarity and semantic cache lookup

export function cosineSimilarity(vecA, vecB) {
    const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((s, a) => s + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((s, b) => s + b * b, 0));
    return dot / (normA * normB);
}

/**
 * Find the most similar entry in the knowledge index.
 * @param {number[]} queryEmbedding - embedding of the incoming query
 * @param {Object} knowledgeIndex - the full index object
 * @param {number} [threshold=0.8] - similarity cutoff
 * @returns {Object|null} best matching entry or null
 */
export function findSimilar(queryEmbedding, knowledgeIndex, threshold = 0.8) {
    let bestMatch = null;
    let bestScore = 0;
    for (const entry of Object.values(knowledgeIndex)) {
        if (!entry.embedding) continue;
        const score = cosineSimilarity(queryEmbedding, entry.embedding);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = entry;
        }
    }
    return bestScore >= threshold ? bestMatch : null;
}

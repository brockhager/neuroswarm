/**
 * Vector Index Service
 * 
 * In-memory vector index for semantic search using cosine similarity.
 * Supports adding documents with embeddings and retrieving top-K similar documents.
 */

class VectorIndex {
    constructor() {
        this.documents = []; // Array of { id, text, embedding, metadata }
        this.dimension = null;
    }

    /**
     * Add document with embedding to index
     * @param {string} id - Document ID
     * @param {string} text - Document text
     * @param {Array<number>} embedding - Embedding vector
     * @param {Object} metadata - Optional metadata
     */
    addDocument(id, text, embedding, metadata = {}) {
        if (!Array.isArray(embedding)) {
            throw new Error('Embedding must be an array');
        }

        // Set dimension on first document
        if (this.dimension === null) {
            this.dimension = embedding.length;
        } else if (embedding.length !== this.dimension) {
            throw new Error(`Embedding dimension mismatch: expected ${this.dimension}, got ${embedding.length}`);
        }

        // Check if document already exists
        const existingIndex = this.documents.findIndex(doc => doc.id === id);
        if (existingIndex >= 0) {
            // Update existing document
            this.documents[existingIndex] = { id, text, embedding, metadata, updatedAt: Date.now() };
        } else {
            // Add new document
            this.documents.push({ id, text, embedding, metadata, createdAt: Date.now() });
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array<number>} a - First vector
     * @param {Array<number>} b - Second vector
     * @returns {number} - Similarity score (0-1)
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * Search for top-K most similar documents
     * @param {Array<number>} queryEmbedding - Query embedding vector
     * @param {number} k - Number of results to return
     * @param {Object} options - Search options
     * @returns {Array} - Array of { id, text, score, metadata }
     */
    search(queryEmbedding, k = 5, options = {}) {
        if (!Array.isArray(queryEmbedding)) {
            throw new Error('Query embedding must be an array');
        }

        if (this.documents.length === 0) {
            return [];
        }

        if (queryEmbedding.length !== this.dimension) {
            throw new Error(`Query embedding dimension mismatch: expected ${this.dimension}, got ${queryEmbedding.length}`);
        }

        // Calculate similarity scores for all documents
        const results = this.documents.map(doc => ({
            id: doc.id,
            text: doc.text,
            metadata: doc.metadata,
            score: this.cosineSimilarity(queryEmbedding, doc.embedding)
        }));

        // Sort by score (descending)
        results.sort((a, b) => b.score - a.score);

        // Apply threshold filter if specified
        const threshold = options.threshold || 0;
        const filtered = results.filter(r => r.score >= threshold);

        // Return top-K results
        return filtered.slice(0, k);
    }

    /**
     * Remove document from index
     * @param {string} id - Document ID
     * @returns {boolean} - True if document was removed
     */
    removeDocument(id) {
        const index = this.documents.findIndex(doc => doc.id === id);
        if (index >= 0) {
            this.documents.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get document by ID
     * @param {string} id - Document ID
     * @returns {Object|null} - Document or null if not found
     */
    getDocument(id) {
        return this.documents.find(doc => doc.id === id) || null;
    }

    /**
     * Get index statistics
     * @returns {Object} - Statistics
     */
    getStats() {
        return {
            documentCount: this.documents.length,
            dimension: this.dimension,
            memoryUsage: this.documents.length * (this.dimension || 0) * 8 // Approximate bytes
        };
    }

    /**
     * Clear all documents from index
     */
    clear() {
        this.documents = [];
        this.dimension = null;
    }

    /**
     * Export index to JSON
     * @returns {Object} - Serialized index
     */
    export() {
        return {
            documents: this.documents,
            dimension: this.dimension
        };
    }

    /**
     * Import index from JSON
     * @param {Object} data - Serialized index
     */
    import(data) {
        this.documents = data.documents || [];
        this.dimension = data.dimension || null;
    }
}

export default VectorIndex;

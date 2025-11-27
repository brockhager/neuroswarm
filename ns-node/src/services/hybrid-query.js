/**
 * Hybrid Query Service
 * 
 * Implements Retrieval-Augmented Generation (RAG):
 * 1. Embed the query
 * 2. Search vector index for relevant documents
 * 3. Generate response using retrieved context
 * 4. Score the response for quality
 */

const VectorIndex = require('../../shared/vector-index.js');

class HybridQueryService {
    constructor(nsLlmClient, options = {}) {
        this.nsLlmClient = nsLlmClient;
        this.vectorIndex = new VectorIndex();

        // Configuration
        this.topK = options.topK || 3;
        this.similarityThreshold = options.similarityThreshold || 0.5;
        this.maxContextLength = options.maxContextLength || 500;
        this.maxGenerationTokens = options.maxGenerationTokens || 100;
    }

    /**
     * Add document to knowledge base
     * @param {string} id - Document ID
     * @param {string} text - Document text
     * @param {Object} metadata - Optional metadata
     */
    async addDocument(id, text, metadata = {}) {
        // Generate embedding for document
        const embedding = await this.nsLlmClient.embed(text);

        // Add to vector index
        this.vectorIndex.addDocument(id, text, embedding, metadata);

        return { id, indexed: true };
    }

    /**
     * Add multiple documents in batch
     * @param {Array} documents - Array of { id, text, metadata }
     */
    async addDocuments(documents) {
        const results = [];

        for (const doc of documents) {
            try {
                const result = await this.addDocument(doc.id, doc.text, doc.metadata);
                results.push(result);
            } catch (error) {
                results.push({ id: doc.id, indexed: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Calculate coherence score for generated text
     * Measures how well the response aligns with the query
     * @param {string} query - Original query
     * @param {string} response - Generated response
     * @returns {number} - Coherence score (0-1)
     */
    async calculateCoherence(query, response) {
        try {
            // Embed both query and response
            const [queryEmbedding, responseEmbedding] = await Promise.all([
                this.nsLlmClient.embed(query),
                this.nsLlmClient.embed(response)
            ]);

            // Calculate cosine similarity
            return this.vectorIndex.cosineSimilarity(queryEmbedding, responseEmbedding);
        } catch (error) {
            console.warn('[Hybrid Query] Coherence calculation failed:', error.message);
            return 0;
        }
    }

    /**
     * Calculate relevance score based on retrieved context
     * @param {Array} retrievedDocs - Retrieved documents with scores
     * @returns {number} - Average relevance score (0-1)
     */
    calculateRelevance(retrievedDocs) {
        if (retrievedDocs.length === 0) return 0;

        const avgScore = retrievedDocs.reduce((sum, doc) => sum + doc.score, 0) / retrievedDocs.length;
        return avgScore;
    }

    /**
     * Build context string from retrieved documents
     * @param {Array} retrievedDocs - Retrieved documents
     * @returns {string} - Context string
     */
    buildContext(retrievedDocs) {
        if (retrievedDocs.length === 0) {
            return '';
        }

        let context = 'Relevant context:\n\n';

        for (let i = 0; i < retrievedDocs.length; i++) {
            const doc = retrievedDocs[i];
            context += `[${i + 1}] ${doc.text}\n\n`;

            // Truncate if too long
            if (context.length > this.maxContextLength) {
                context = context.substring(0, this.maxContextLength) + '...\n\n';
                break;
            }
        }

        return context;
    }

    /**
     * Execute hybrid query (RAG pipeline)
     * @param {string} query - User query
     * @param {Object} options - Query options
     * @returns {Object} - { text, score, sources, metrics }
     */
    async query(query, options = {}) {
        const startTime = Date.now();
        const metrics = {
            embeddingTime: 0,
            retrievalTime: 0,
            generationTime: 0,
            scoringTime: 0,
            totalTime: 0
        };

        try {
            // Step 1: Embed the query
            const embedStart = Date.now();
            const queryEmbedding = await this.nsLlmClient.embed(query);
            metrics.embeddingTime = Date.now() - embedStart;

            // Step 2: Retrieve relevant documents
            const retrievalStart = Date.now();
            const topK = options.topK || this.topK;
            const threshold = options.similarityThreshold || this.similarityThreshold;

            const retrievedDocs = this.vectorIndex.search(queryEmbedding, topK, { threshold });
            metrics.retrievalTime = Date.now() - retrievalStart;

            // Step 3: Build context and generate response
            const generationStart = Date.now();
            const context = this.buildContext(retrievedDocs);

            let prompt = query;
            if (context) {
                prompt = `${context}Question: ${query}\n\nAnswer:`;
            }

            const maxTokens = options.maxTokens || this.maxGenerationTokens;
            const generationResult = await this.nsLlmClient.generate(prompt, { maxTokens });
            metrics.generationTime = Date.now() - generationStart;

            // Step 4: Score the response
            const scoringStart = Date.now();
            const coherenceScore = await this.calculateCoherence(query, generationResult.text);
            const relevanceScore = this.calculateRelevance(retrievedDocs);

            // Combined score (weighted average)
            const combinedScore = (coherenceScore * 0.6) + (relevanceScore * 0.4);
            metrics.scoringTime = Date.now() - scoringStart;

            metrics.totalTime = Date.now() - startTime;

            return {
                text: generationResult.text,
                score: {
                    combined: combinedScore,
                    coherence: coherenceScore,
                    relevance: relevanceScore
                },
                sources: retrievedDocs.map(doc => ({
                    id: doc.id,
                    text: doc.text.substring(0, 100) + (doc.text.length > 100 ? '...' : ''),
                    score: doc.score,
                    metadata: doc.metadata
                })),
                metrics,
                tokensGenerated: generationResult.tokens_generated
            };
        } catch (error) {
            metrics.totalTime = Date.now() - startTime;
            throw new Error(`Hybrid query failed: ${error.message}`);
        }
    }

    /**
     * Get index statistics
     */
    getStats() {
        return {
            ...this.vectorIndex.getStats(),
            config: {
                topK: this.topK,
                similarityThreshold: this.similarityThreshold,
                maxContextLength: this.maxContextLength,
                maxGenerationTokens: this.maxGenerationTokens
            }
        };
    }

    /**
     * Clear all documents
     */
    clear() {
        this.vectorIndex.clear();
    }
}

module.exports = HybridQueryService;

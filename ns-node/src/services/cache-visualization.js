import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache visualization service for Phase 4a.2
class CacheVisualizationService {
  constructor() {
    this.cacheData = {};
    this.similarityGraph = {};
    this.loadCacheData();
  }

  loadCacheData() {
    try {
      // Try to load from knowledge store
      const knowledgeStorePath = path.join(__dirname, 'data', 'knowledge-index.json');
      if (fs.existsSync(knowledgeStorePath)) {
        const data = JSON.parse(fs.readFileSync(knowledgeStorePath, 'utf8'));
        this.cacheData = data;
        this.generateSimilarityGraph();
      }
    } catch (error) {
      console.error('Failed to load cache data:', error);
      this.cacheData = {};
      this.similarityGraph = {};
    }
  }

  // Generate semantic similarity graph from cache data
  generateSimilarityGraph() {
    const entries = Object.values(this.cacheData);
    const nodes = [];
    const links = [];

    // Create nodes from cache entries
    entries.forEach((entry, index) => {
      if (entry.embedding && Array.isArray(entry.embedding)) {
        nodes.push({
          id: entry.id || `entry-${index}`,
          question: entry.question || '',
          answer: entry.answer || '',
          confidence: entry.confidence || 0,
          category: entry.category || 'general',
          timestamp: entry.timestamp || '',
          embedding: entry.embedding,
          x: Math.random() * 800, // Initial random position
          y: Math.random() * 600
        });
      }
    });

    // Create links based on semantic similarity
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = this.cosineSimilarity(nodes[i].embedding, nodes[j].embedding);
        if (similarity > 0.3) { // Only show significant similarities
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            similarity: similarity,
            strength: similarity
          });
        }
      }
    }

    this.similarityGraph = { nodes, links };
    return this.similarityGraph;
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Get cache statistics for visualization
  getCacheStats() {
    const entries = Object.values(this.cacheData);
    const stats = {
      totalEntries: entries.length,
      entriesWithEmbeddings: entries.filter(e => e.embedding && Array.isArray(e.embedding)).length,
      categories: {},
      confidenceDistribution: {
        high: 0,    // > 0.8
        medium: 0,  // 0.6-0.8
        low: 0      // < 0.6
      },
      temporalDistribution: {},
      embeddingDimensions: null
    };

    entries.forEach(entry => {
      // Category distribution
      const category = entry.category || 'general';
      stats.categories[category] = (stats.categories[category] || 0) + 1;

      // Confidence distribution
      const confidence = entry.confidence || 0;
      if (confidence > 0.8) stats.confidenceDistribution.high++;
      else if (confidence > 0.6) stats.confidenceDistribution.medium++;
      else stats.confidenceDistribution.low++;

      // Temporal distribution (by day)
      if (entry.timestamp) {
        const date = new Date(entry.timestamp).toISOString().split('T')[0];
        stats.temporalDistribution[date] = (stats.temporalDistribution[date] || 0) + 1;
      }

      // Embedding dimensions
      if (entry.embedding && Array.isArray(entry.embedding) && !stats.embeddingDimensions) {
        stats.embeddingDimensions = entry.embedding.length;
      }
    });

    return stats;
  }

  // Get cache hit patterns (would need query history integration)
  getCacheHitPatterns() {
    // This would analyze query history to show cache hit patterns
    // For now, return mock data structure
    return {
      hitRate: 0.0, // Would be calculated from query history
      popularQueries: [],
      cacheEfficiency: {
        semanticHits: 0,
        exactHits: 0,
        misses: 0
      },
      temporalPatterns: {
        peakHours: [],
        dailyTrends: []
      }
    };
  }

  // Get similarity clusters for visualization
  getSimilarityClusters(threshold = 0.7) {
    const entries = Object.values(this.cacheData).filter(e => e.embedding);
    const clusters = [];

    // Simple clustering based on similarity threshold
    const processed = new Set();

    entries.forEach(entry => {
      if (processed.has(entry.id)) return;

      const cluster = {
        id: `cluster-${clusters.length}`,
        centroid: entry.embedding,
        entries: [entry],
        avgConfidence: entry.confidence || 0,
        categories: [entry.category || 'general']
      };

      // Find similar entries
      entries.forEach(otherEntry => {
        if (otherEntry.id !== entry.id && !processed.has(otherEntry.id)) {
          const similarity = this.cosineSimilarity(entry.embedding, otherEntry.embedding);
          if (similarity >= threshold) {
            cluster.entries.push(otherEntry);
            cluster.avgConfidence = (cluster.avgConfidence + (otherEntry.confidence || 0)) / 2;
            if (!cluster.categories.includes(otherEntry.category || 'general')) {
              cluster.categories.push(otherEntry.category || 'general');
            }
            processed.add(otherEntry.id);
          }
        }
      });

      clusters.push(cluster);
      processed.add(entry.id);
    });

    return clusters.map(cluster => ({
      ...cluster,
      size: cluster.entries.length,
      avgSimilarity: cluster.entries.length > 1 ?
        cluster.entries.reduce((sum, e, i) => {
          if (i === 0) return sum;
          return sum + this.cosineSimilarity(cluster.entries[0].embedding, e.embedding);
        }, 0) / (cluster.entries.length - 1) : 1
    }));
  }

  // Export data for frontend visualization
  getVisualizationData() {
    return {
      similarityGraph: this.similarityGraph,
      cacheStats: this.getCacheStats(),
      cacheHitPatterns: this.getCacheHitPatterns(),
      similarityClusters: this.getSimilarityClusters(),
      lastUpdated: new Date().toISOString()
    };
  }

  // Refresh data from sources
  refresh() {
    this.loadCacheData();
    return this.getVisualizationData();
  }
}

export default CacheVisualizationService;
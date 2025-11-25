import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUERY_HISTORY_FILE = path.join(__dirname, 'data', 'query-history.json');
const MAX_HISTORY_SIZE = 1000; // Keep last 1000 queries

class QueryHistoryService {
  constructor() {
    this.history = [];
    this.loadHistory();
  }

  loadHistory() {
    try {
      if (fs.existsSync(QUERY_HISTORY_FILE)) {
        const data = fs.readFileSync(QUERY_HISTORY_FILE, 'utf8');
        this.history = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load query history:', error);
      this.history = [];
    }
  }

  saveHistory() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(QUERY_HISTORY_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(QUERY_HISTORY_FILE, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error('Failed to save query history:', error);
    }
  }

  addQuery(query, response, metadata = {}) {
    const entry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      query: query,
      response: response,
      metadata: {
        ...metadata,
        responseTime: metadata.responseTime || 0,
        cacheHit: metadata.cacheHit || false,
        confidence: metadata.confidence || 0,
        adapterUsed: metadata.adapterUsed || null,
        ipfsHash: metadata.ipfsHash || null
      }
    };

    this.history.unshift(entry); // Add to beginning for chronological order

    // Maintain max size
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history = this.history.slice(0, MAX_HISTORY_SIZE);
    }

    this.saveHistory();
    return entry;
  }

  getHistory(limit = 50, offset = 0) {
    return this.history.slice(offset, offset + limit);
  }

  getQueryById(id) {
    return this.history.find(entry => entry.id === id);
  }

  getRecentActivity(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.history.filter(entry =>
      new Date(entry.timestamp) > cutoff
    );
  }

  getStats(hours = 24) {
    const recent = this.getRecentActivity(hours);

    const stats = {
      totalQueries: recent.length,
      cacheHits: recent.filter(q => q.metadata.cacheHit).length,
      avgResponseTime: 0,
      avgConfidence: 0,
      adapterUsage: {},
      timeRange: `${hours}h`
    };

    if (recent.length > 0) {
      stats.avgResponseTime = recent.reduce((sum, q) => sum + q.metadata.responseTime, 0) / recent.length;
      stats.avgConfidence = recent.reduce((sum, q) => sum + q.metadata.confidence, 0) / recent.length;

      // Count adapter usage
      recent.forEach(q => {
        const adapter = q.metadata.adapterUsed || 'unknown';
        stats.adapterUsage[adapter] = (stats.adapterUsage[adapter] || 0) + 1;
      });
    }

    return stats;
  }

  replayQuery(id) {
    const entry = this.getQueryById(id);
    if (!entry) {
      throw new Error('Query not found');
    }

    // Return the original query and response for replay
    return {
      originalQuery: entry.query,
      originalResponse: entry.response,
      metadata: entry.metadata,
      replayTimestamp: new Date().toISOString()
    };
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
  }
}

export default QueryHistoryService;
/**
 * KV Cache Service
 * 
 * Implements Key-Value cache persistence and reuse for reducing redundant inference computation.
 * Three-tier storage strategy:
 * - Tier 1: Memory (last 10 prompts) - Instant access
 * - Tier 2: Disk (data/kv-cache/) - Fast retrieval
 * - Tier 3: Federated (peer cache) - Network retrieval
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { LRUCache } from 'lru-cache';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class KvCacheService {
    constructor(options = {}) {
        this.cacheDir = options.cacheDir || path.join(__dirname, '../../../data/kv-cache');
        this.maxMemorySize = options.maxMemorySize || 10;
        this.maxDiskSize = options.maxDiskSize || 100; // Max number of cache entries on disk
        this.enabled = options.enabled !== false;

        // Tier 1: In-memory LRU cache
        this.memoryCache = new LRUCache({
            max: this.maxMemorySize,
            ttl: 1000 * 60 * 30, // 30 minutes TTL
            updateAgeOnGet: true,
            allowStale: false
        });

        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            stores: 0,
            retrievals: 0,
            diskReads: 0,
            diskWrites: 0,
            federatedQueries: 0
        };

        // Cache metadata for disk cache management
        this.diskCacheMetadata = new Map();
    }

    /**
     * Initialize the KV cache service
     */
    async initialize() {
        if (!this.enabled) {
            console.log('[KV Cache] Service disabled');
            return;
        }

        console.log('[KV Cache] Initializing...');

        // Create cache directory if it doesn't exist
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (err) {
            console.error('[KV Cache] Failed to create cache directory:', err.message);
        }

        // Load disk cache metadata
        await this.loadDiskMetadata();

        console.log(`[KV Cache] Initialized - Memory: ${this.maxMemorySize}, Disk: ${this.maxDiskSize} entries`);
    }

    /**
     * Generate cache key from prompt and model
     */
    cacheKey(prompt, model = 'default', context = {}) {
        const data = JSON.stringify({
            prompt,
            model,
            temperature: context.temperature || 0.7,
            topP: context.topP || 1.0
        });

        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Store KV cache
     */
    async store(key, kvCacheData, metadata = {}) {
        if (!this.enabled) return false;

        this.stats.stores++;

        const entry = {
            key,
            data: kvCacheData,
            metadata: {
                ...metadata,
                storedAt: Date.now(),
                accessCount: 0,
                lastAccessed: Date.now()
            }
        };

        // Tier 1: Store in memory
        this.memoryCache.set(key, entry);

        // Tier 2: Persist to disk (async, non-blocking)
        this.persistToDisk(key, entry).catch(err => {
            console.error(`[KV Cache] Failed to persist ${key} to disk:`, err.message);
        });

        return true;
    }

    /**
     * Retrieve KV cache
     */
    async retrieve(key) {
        if (!this.enabled) return null;

        this.stats.retrievals++;

        // Tier 1: Check memory
        let entry = this.memoryCache.get(key);
        if (entry) {
            this.stats.hits++;
            entry.metadata.accessCount++;
            entry.metadata.lastAccessed = Date.now();
            return {
                data: entry.data,
                metadata: entry.metadata,
                source: 'memory'
            };
        }

        // Tier 2: Check disk
        entry = await this.loadFromDisk(key);
        if (entry) {
            this.stats.hits++;
            this.stats.diskReads++;
            entry.metadata.accessCount++;
            entry.metadata.lastAccessed = Date.now();

            // Promote to memory cache
            this.memoryCache.set(key, entry);

            return {
                data: entry.data,
                metadata: entry.metadata,
                source: 'disk'
            };
        }

        // Tier 3: Federated cache (future implementation)
        // For now, just track the miss
        this.stats.misses++;
        return null;
    }

    /**
     * Persist cache entry to disk
     */
    async persistToDisk(key, entry) {
        this.stats.diskWrites++;

        const filePath = path.join(this.cacheDir, `${key}.json`);

        try {
            await fs.writeFile(filePath, JSON.stringify(entry), 'utf8');
            this.diskCacheMetadata.set(key, {
                path: filePath,
                size: JSON.stringify(entry).length,
                storedAt: entry.metadata.storedAt
            });

            // Enforce disk cache size limit
            await this.enforceDiskCacheLimit();
        } catch (err) {
            throw new Error(`Disk persist failed: ${err.message}`);
        }
    }

    /**
     * Load cache entry from disk
     */
    async loadFromDisk(key) {
        const filePath = path.join(this.cacheDir, `${key}.json`);

        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            // File not found or parse error
            return null;
        }
    }

    /**
     * Load disk cache metadata
     */
    async loadDiskMetadata() {
        try {
            const files = await fs.readdir(this.cacheDir);

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const key = file.replace('.json', '');
                    const filePath = path.join(this.cacheDir, file);

                    try {
                        const stats = await fs.stat(filePath);
                        this.diskCacheMetadata.set(key, {
                            path: filePath,
                            size: stats.size,
                            storedAt: stats.birthtimeMs
                        });
                    } catch (err) {
                        // Ignore individual file errors
                    }
                }
            }

            console.log(`[KV Cache] Loaded metadata for ${this.diskCacheMetadata.size} disk entries`);
        } catch (err) {
            console.error('[KV Cache] Failed to load disk metadata:', err.message);
        }
    }

    /**
     * Enforce disk cache size limit using LRU eviction
     */
    async enforceDiskCacheLimit() {
        if (this.diskCacheMetadata.size <= this.maxDiskSize) {
            return;
        }

        // Sort by stored time (oldest first)
        const entries = Array.from(this.diskCacheMetadata.entries())
            .sort((a, b) => a[1].storedAt - b[1].storedAt);

        const toRemove = entries.length - this.maxDiskSize;

        for (let i = 0; i < toRemove; i++) {
            const [key, meta] = entries[i];
            try {
                await fs.unlink(meta.path);
                this.diskCacheMetadata.delete(key);
                this.stats.evictions++;
            } catch (err) {
                console.error(`[KV Cache] Failed to evict ${key}:`, err.message);
            }
        }

        console.log(`[KV Cache] Evicted ${toRemove} oldest entries`);
    }

    /**
     * Clear all caches
     */
    async clear() {
        // Clear memory
        this.memoryCache.clear();

        // Clear disk
        try {
            const files = await fs.readdir(this.cacheDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    await fs.unlink(path.join(this.cacheDir, file));
                }
            }
            this.diskCacheMetadata.clear();
            console.log('[KV Cache] Cleared all caches');
        } catch (err) {
            console.error('[KV Cache] Failed to clear disk cache:', err.message);
        }

        // Reset stats
        this.stats.evictions = 0;
    }

    /**
     * Prune expired entries
     */
    async prune() {
        // Memory cache has built-in TTL, no manual pruning needed

        // Disk cache: remove entries older than 24 hours
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();

        for (const [key, meta] of this.diskCacheMetadata.entries()) {
            if (now - meta.storedAt > maxAge) {
                try {
                    await fs.unlink(meta.path);
                    this.diskCacheMetadata.delete(key);
                    this.stats.evictions++;
                } catch (err) {
                    console.error(`[KV Cache] Failed to prune ${key}:`, err.message);
                }
            }
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            totalRequests,
            hitRate: parseFloat(hitRate),
            memorySize: this.memoryCache.size,
            diskSize: this.diskCacheMetadata.size,
            enabled: this.enabled
        };
    }

    /**
     * Serialize KV cache for network transfer
     */
    serialize(kvCacheData) {
        // Convert to base64 for safe JSON transport
        const json = JSON.stringify(kvCacheData);
        return Buffer.from(json).toString('base64');
    }

    /**
     * Deserialize KV cache from network transfer
     */
    deserialize(serializedData) {
        try {
            const json = Buffer.from(serializedData, 'base64').toString('utf8');
            return JSON.parse(json);
        } catch (err) {
            throw new Error(`Deserialization failed: ${err.message}`);
        }
    }

    /**
     * Check if cache key exists
     */
    async has(key) {
        // Check memory
        if (this.memoryCache.has(key)) {
            return true;
        }

        // Check disk
        const filePath = path.join(this.cacheDir, `${key}.json`);
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Delete specific cache entry
     */
    async delete(key) {
        // Remove from memory
        this.memoryCache.delete(key);

        // Remove from disk
        const filePath = path.join(this.cacheDir, `${key}.json`);
        try {
            await fs.unlink(filePath);
            this.diskCacheMetadata.delete(key);
            return true;
        } catch {
            return false;
        }
    }
}

export default KvCacheService;

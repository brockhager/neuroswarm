/**
 * Rate Limiter - Token Bucket Algorithm for P2P DoS Protection
 * Implements per-peer message and bandwidth rate limiting
 */

/**
 * RateLimiter - Token bucket rate limiter for messages and bandwidth
 */
export class RateLimiter {
    constructor(options = {}) {
        this.messagesPerSec = options.messagesPerSec || 10;
        this.bytesPerSec = options.bytesPerSec || 10240; // 10 KB/s
        this.burstMultiplier = options.burstMultiplier || 2;
        this.enabled = options.enabled !== false;

        // Per-peer buckets
        this.buckets = new Map(); // peerId -> { msgTokens, byteTokens, lastRefill }

        console.log(`[RateLimiter] Initialized (enabled: ${this.enabled}, ${this.messagesPerSec} msg/s, ${this.bytesPerSec} bytes/s)`);
    }

    /**
     * Check if peer is within rate limits
     */
    checkLimit(peerId, messageSize) {
        if (!this.enabled) {
            return { allowed: true };
        }

        // Get or create bucket for peer
        let bucket = this.buckets.get(peerId);

        if (!bucket) {
            bucket = {
                msgTokens: this.messagesPerSec * this.burstMultiplier,
                byteTokens: this.bytesPerSec * this.burstMultiplier,
                lastRefill: Date.now()
            };
            this.buckets.set(peerId, bucket);
        }

        // Refill tokens based on elapsed time
        this.refillBucket(bucket);

        // Check message rate limit
        if (bucket.msgTokens < 1) {
            return { allowed: false, reason: 'MESSAGE_RATE_LIMIT' };
        }

        // Check bandwidth limit
        if (bucket.byteTokens < messageSize) {
            return { allowed: false, reason: 'BANDWIDTH_LIMIT' };
        }

        // Consume tokens
        bucket.msgTokens -= 1;
        bucket.byteTokens -= messageSize;

        return { allowed: true };
    }

    /**
     * Refill bucket tokens based on elapsed time
     */
    refillBucket(bucket) {
        const now = Date.now();
        const elapsed = (now - bucket.lastRefill) / 1000; // seconds

        if (elapsed > 0) {
            // Add tokens based on rate
            bucket.msgTokens = Math.min(
                this.messagesPerSec * this.burstMultiplier,
                bucket.msgTokens + (elapsed * this.messagesPerSec)
            );

            bucket.byteTokens = Math.min(
                this.bytesPerSec * this.burstMultiplier,
                bucket.byteTokens + (elapsed * this.bytesPerSec)
            );

            bucket.lastRefill = now;
        }
    }

    /**
     * Reset rate limit for a peer
     */
    reset(peerId) {
        this.buckets.delete(peerId);
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            enabled: this.enabled,
            messagesPerSec: this.messagesPerSec,
            bytesPerSec: this.bytesPerSec,
            burstMultiplier: this.burstMultiplier,
            activePeers: this.buckets.size
        };
    }

    /**
     * Get bucket state for a peer (for debugging)
     */
    getBucketState(peerId) {
        const bucket = this.buckets.get(peerId);
        if (!bucket) {
            return null;
        }

        return {
            msgTokens: Math.floor(bucket.msgTokens),
            byteTokens: Math.floor(bucket.byteTokens),
            lastRefill: bucket.lastRefill
        };
    }

    /**
     * Cleanup old buckets
     */
    cleanup(maxAge = 600000) { // 10 minutes
        const now = Date.now();
        let cleaned = 0;

        for (const [peerId, bucket] of this.buckets.entries()) {
            if (now - bucket.lastRefill > maxAge) {
                this.buckets.delete(peerId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[RateLimiter] Cleaned up ${cleaned} old buckets (${this.buckets.size} remaining)`);
        }
    }

    /**
     * Destroy
     */
    destroy() {
        this.buckets.clear();
        console.log('[RateLimiter] Destroyed');
    }
}

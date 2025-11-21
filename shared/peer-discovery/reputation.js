/**
 * Reputation System - Track and score peer behavior
 * Scores range from 0-100, with penalties for bad behavior and rewards for reliability
 */

export class ReputationManager {
    constructor(options = {}) {
        this.scores = new Map(); // peerId -> score (0-100)
        this.behaviors = new Map(); // peerId -> behavior history

        // Configuration
        this.initialScore = options.initialScore || 50; // New peers start at 50
        this.banThreshold = options.banThreshold || 20; // Auto-ban below 20
        this.maxScore = 100;
        this.minScore = 0;

        // Behavior weights
        this.weights = {
            messageSuccess: 1,      // Successful message delivery
            messageFailure: -2,     // Failed message delivery
            invalidMessage: -5,     // Invalid/malformed message
            spamDetected: -10,      // Spam behavior detected
            peerExchange: 2,        // Successful peer exchange
            healthCheck: 1          // Successful health check response
        };

        // Decay settings
        this.decayRate = options.decayRate || 0.1; // Points to decay per hour
        this.decayInterval = options.decayInterval || 3600000; // 1 hour

        // Start decay timer
        this.startDecayTimer();
    }

    /**
     * Get reputation score for a peer
     */
    getScore(peerId) {
        return this.scores.get(peerId) || this.initialScore;
    }

    /**
     * Initialize a new peer with default score
     */
    initializePeer(peerId) {
        if (!this.scores.has(peerId)) {
            this.scores.set(peerId, this.initialScore);
            this.behaviors.set(peerId, []);
            console.log(`[Reputation] Initialized peer ${peerId} with score ${this.initialScore}`);
        }
    }

    /**
     * Record a behavior and update score
     */
    recordBehavior(peerId, behaviorType, metadata = {}) {
        this.initializePeer(peerId);

        const weight = this.weights[behaviorType];
        if (weight === undefined) {
            console.warn(`[Reputation] Unknown behavior type: ${behaviorType}`);
            return;
        }

        const currentScore = this.getScore(peerId);
        const newScore = Math.max(this.minScore, Math.min(this.maxScore, currentScore + weight));

        this.scores.set(peerId, newScore);

        // Record behavior history
        const behavior = {
            type: behaviorType,
            weight,
            timestamp: Date.now(),
            metadata
        };

        const history = this.behaviors.get(peerId);
        history.push(behavior);

        // Keep only last 100 behaviors
        if (history.length > 100) {
            history.shift();
        }

        console.log(`[Reputation] ${peerId} | ${behaviorType} (${weight > 0 ? '+' : ''}${weight}) | Score: ${currentScore} → ${newScore}`);

        return newScore;
    }

    /**
     * Check if a peer should be banned
     */
    shouldBan(peerId) {
        const score = this.getScore(peerId);
        return score < this.banThreshold;
    }

    /**
     * Get all peers below ban threshold
     */
    getBannablePeers() {
        const bannable = [];
        for (const [peerId, score] of this.scores.entries()) {
            if (score < this.banThreshold) {
                bannable.push({ peerId, score });
            }
        }
        return bannable;
    }

    /**
     * Get top N peers by reputation
     */
    getTopPeers(n = 10) {
        const sorted = Array.from(this.scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, n);

        return sorted.map(([peerId, score]) => ({ peerId, score }));
    }

    /**
     * Apply reputation decay over time
     */
    applyDecay() {
        let decayed = 0;

        for (const [peerId, score] of this.scores.entries()) {
            if (score > this.initialScore) {
                // Decay high scores toward initial score
                const newScore = Math.max(this.initialScore, score - this.decayRate);
                this.scores.set(peerId, newScore);
                decayed++;
            }
        }

        if (decayed > 0) {
            console.log(`[Reputation] Applied decay to ${decayed} peers`);
        }
    }

    /**
     * Start automatic decay timer
     */
    startDecayTimer() {
        this.decayTimer = setInterval(() => {
            this.applyDecay();
        }, this.decayInterval);
    }

    /**
     * Stop decay timer (for cleanup)
     */
    stopDecayTimer() {
        if (this.decayTimer) {
            clearInterval(this.decayTimer);
            this.decayTimer = null;
        }
    }

    /**
     * Get behavior history for a peer
     */
    getBehaviorHistory(peerId, limit = 10) {
        const history = this.behaviors.get(peerId) || [];
        return history.slice(-limit);
    }

    /**
     * Get statistics
     */
    getStats() {
        const scores = Array.from(this.scores.values());
        const avgScore = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : this.initialScore;

        return {
            totalPeers: this.scores.size,
            averageScore: avgScore.toFixed(2),
            bannablePeers: this.getBannablePeers().length,
            highestScore: Math.max(...scores, 0),
            lowestScore: Math.min(...scores, 100)
        };
    }

    /**
     * Remove a peer from reputation tracking
     */
    removePeer(peerId) {
        this.scores.delete(peerId);
        this.behaviors.delete(peerId);
        console.log(`[Reputation] Removed peer ${peerId} from tracking`);
    }

    /**
     * Cleanup (call on shutdown)
     */
    destroy() {
        this.stopDecayTimer();
        this.scores.clear();
        this.behaviors.clear();
    }
}

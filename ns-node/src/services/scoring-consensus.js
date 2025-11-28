import { logNs } from '../utils/logger.js';

/**
 * ScoringConsensus
 * Manages consensus on content scores across multiple validators.
 * Uses weighted averaging based on peer reputation.
 */
export default class ScoringConsensus {
    constructor(reputationManager, options = {}) {
        this.reputationManager = reputationManager;

        // Configuration
        this.minVotes = options.minVotes || 3;
        this.consensusTimeout = options.timeout || 30000; // 30s to gather votes

        // State
        this.activeSessions = new Map(); // contentId -> { votes: Map<peerId, score>, startTime, timer }
        this.finalizedScores = new Map(); // contentId -> { score, confidence, timestamp }
    }

    /**
     * Submit a score for a piece of content
     */
    submitScore(contentId, score, peerId) {
        if (this.finalizedScores.has(contentId)) {
            return { status: 'finalized', score: this.finalizedScores.get(contentId) };
        }

        if (!this.activeSessions.has(contentId)) {
            this._startSession(contentId);
        }

        const session = this.activeSessions.get(contentId);

        // Validate score range
        if (score < 0 || score > 1) {
            throw new Error('Score must be between 0.0 and 1.0');
        }

        session.votes.set(peerId, {
            score,
            timestamp: Date.now(),
            reputation: this.reputationManager ? this.reputationManager.getScore(peerId) : 50
        });

        logNs('INFO', `Vote received for ${contentId} from ${peerId}: ${score}`);

        // Check if we can finalize early (e.g. high participation)
        // For now, we just wait for timeout or minVotes check on access

        return { status: 'accepted', voteCount: session.votes.size };
    }

    /**
     * Get the current consensus score
     */
    getConsensus(contentId) {
        if (this.finalizedScores.has(contentId)) {
            return this.finalizedScores.get(contentId);
        }

        const session = this.activeSessions.get(contentId);
        if (!session) return null;

        if (session.votes.size >= this.minVotes) {
            return this._calculateConsensus(contentId);
        }

        return { status: 'pending', voteCount: session.votes.size, required: this.minVotes };
    }

    _startSession(contentId) {
        const timer = setTimeout(() => {
            this._finalizeSession(contentId);
        }, this.consensusTimeout);

        this.activeSessions.set(contentId, {
            votes: new Map(),
            startTime: Date.now(),
            timer
        });
    }

    _finalizeSession(contentId) {
        const session = this.activeSessions.get(contentId);
        if (!session) return;

        if (session.votes.size > 0) {
            const result = this._calculateConsensus(contentId);
            this.finalizedScores.set(contentId, result);
            logNs('INFO', `Consensus reached for ${contentId}: ${result.score} (Confidence: ${result.confidence})`);
        } else {
            logNs('WARN', `Consensus failed for ${contentId}: No votes`);
        }

        this.activeSessions.delete(contentId);
    }

    _calculateConsensus(contentId) {
        const session = this.activeSessions.get(contentId);
        if (!session) return null;

        let totalWeight = 0;
        let weightedSum = 0;
        let votes = 0;

        for (const vote of session.votes.values()) {
            const weight = vote.reputation; // 0-100
            weightedSum += vote.score * weight;
            totalWeight += weight;
            votes++;
        }

        if (totalWeight === 0) return { score: 0, confidence: 0 };

        const finalScore = weightedSum / totalWeight;

        // Confidence increases with more votes and higher reputation
        // Simple metric: min(1.0, totalWeight / (100 * minVotes))
        const confidence = Math.min(1.0, totalWeight / (100 * this.minVotes));

        return {
            score: parseFloat(finalScore.toFixed(4)),
            confidence: parseFloat(confidence.toFixed(4)),
            voteCount: votes,
            timestamp: Date.now()
        };
    }
}

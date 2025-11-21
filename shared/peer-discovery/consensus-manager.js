/**
 * Consensus Manager - BFT-style Block Finality
 * Manages voting, quorum checks, and block finality
 */

export class ConsensusManager {
    constructor(options = {}) {
        this.reputationManager = options.reputationManager;
        this.messageSigner = options.messageSigner;
        this.metricsService = options.metricsService;
        this.securityLogger = options.securityLogger;

        if (this.metricsService) {
            this.metricsService.registerCounter('consensus_votes_received_total', 'Total votes received');
            this.metricsService.registerCounter('consensus_blocks_finalized_total', 'Total blocks finalized');
            this.metricsService.registerGauge('consensus_current_height', 'Current finalized block height');
        }

        // Configuration
        this.quorumThreshold = options.quorumThreshold || 0.67; // 2/3 majority
        this.minParticipants = options.minParticipants || 3; // Minimum peers for consensus
        this.voteWindow = options.voteWindow || 60000; // 1 minute to vote on a block

        // State
        this.votes = new Map(); // blockHash -> Map<peerId, Vote>
        this.finalizedBlocks = new Set(); // Set<blockHash>
        this.finalizedHeight = 0;
        this.finalizedHash = null;

        console.log('[ConsensusManager] Initialized');
    }

    /**
     * Process a vote from a peer
     */
    handleVote(vote, peerId) {
        const { blockHash, blockHeight, signature } = vote;

        // 1. Basic Validation
        if (!blockHash || !blockHeight || !signature) {
            return { valid: false, reason: 'MISSING_FIELDS' };
        }

        // 2. Check if already finalized
        if (this.finalizedBlocks.has(blockHash)) {
            return { valid: true, ignored: true, reason: 'ALREADY_FINALIZED' };
        }

        // 3. Check if vote is too old (height < finalizedHeight)
        if (blockHeight <= this.finalizedHeight) {
            return { valid: false, reason: 'VOTE_TOO_OLD' };
        }

        // 4. Verify Signature (if messageSigner is available)
        // Note: In a real implementation, we would verify the signature against the vote data
        // For now, we assume the caller (P2PProtocol) has verified the message authenticity via MessageSigner

        // 5. Store Vote
        if (!this.votes.has(blockHash)) {
            this.votes.set(blockHash, new Map());

            // Cleanup old votes after window
            setTimeout(() => {
                if (!this.finalizedBlocks.has(blockHash)) {
                    this.votes.delete(blockHash);
                }
            }, this.voteWindow);
        }

        const blockVotes = this.votes.get(blockHash);

        if (blockVotes.has(peerId)) {
            return { valid: true, ignored: true, reason: 'DUPLICATE_VOTE' };
        }

        blockVotes.set(peerId, {
            peerId,
            signature,
            timestamp: Date.now(),
            blockHeight, // Store height for equivocation checks
            reputation: this.reputationManager ? this.reputationManager.getScore(peerId) : 50
        });

        console.log(`[Consensus] Vote received for ${blockHash.substring(0, 8)} from ${peerId}`);

        if (this.metricsService) {
            this.metricsService.inc('consensus_votes_received_total');
        }

        // Check for double voting (Slashing Condition) AFTER storing the vote
        // This allows us to detect if peer voted for a different hash at the same height
        this.detectEquivocation(peerId, blockHeight, blockHash);

        // 6. Check for Quorum
        this.checkQuorum(blockHash, blockHeight);

        return { valid: true };
    }

    /**
     * Check if a block has reached quorum
     */
    checkQuorum(blockHash, blockHeight) {
        const blockVotes = this.votes.get(blockHash);
        if (!blockVotes) return false;

        // Calculate total active reputation in the network (or connected peers)
        // For simplicity, we sum the reputation of all voting peers + our own (if we voted)
        // In a real system, this would be based on a known validator set

        // Get all connected peers from ReputationManager (or passed in)
        // For this implementation, we'll use the sum of current voters as a proxy for "active participation"
        // provided we have enough voters.

        if (blockVotes.size < this.minParticipants) {
            return false;
        }

        let totalWeight = 0;
        let yesWeight = 0;

        for (const vote of blockVotes.values()) {
            // Weight = Reputation Score (0-100)
            const weight = vote.reputation;
            totalWeight += weight;
            yesWeight += weight; // All votes here are "yes" votes for the block
        }

        // If we assume total possible weight is roughly (totalWeight / currentParticipation)
        // This is tricky without a fixed validator set.
        // Simplified approach: If > 2/3 of *connected* peers (tracked by RepManager) have voted

        // Let's use a simpler threshold for now:
        // If (yesWeight) > (TotalNetworkReputation * 0.67)
        // We need TotalNetworkReputation.

        const totalNetworkRep = this.getTotalNetworkReputation();

        if (totalNetworkRep === 0) return false;

        const support = yesWeight / totalNetworkRep;

        if (support > this.quorumThreshold) {
            if (this.securityLogger) {
                this.securityLogger.logSecurityEvent('CONSENSUS_QUORUM', 'system', {
                    blockHash,
                    blockHeight,
                    support,
                    threshold: this.quorumThreshold
                });
            }
            this.finalizeBlock(blockHash, blockHeight);
            return true;
        }

        return false;
    }

    /**
     * Get total reputation of all known peers
     */
    getTotalNetworkReputation() {
        if (!this.reputationManager) return 100 * this.minParticipants;

        const stats = this.reputationManager.getStats();
        // Total peers * average score gives rough total
        // But getStats returns totalPeers and averageScore
        // We should probably expose a direct "getTotalScore" or calculate it

        // Fallback: iterate scores if accessible, or use stats
        // Accessing internal map for accuracy
        let total = 0;
        for (const score of this.reputationManager.scores.values()) {
            total += score;
        }

        // Add self score (max reputation for self)
        total += 100;

        return total;
    }

    /**
     * Finalize a block
     */
    finalizeBlock(blockHash, blockHeight) {
        if (this.finalizedBlocks.has(blockHash)) return;

        console.log(`[Consensus] 🌟 BLOCK FINALIZED: ${blockHash.substring(0, 8)} (Height: ${blockHeight})`);

        this.finalizedBlocks.add(blockHash);

        if (this.securityLogger) {
            this.securityLogger.logSecurityEvent('CONSENSUS_FINALITY', 'system', {
                blockHash,
                blockHeight,
                timestamp: Date.now()
            });
        }

        // Update head if this is higher
        if (blockHeight > this.finalizedHeight) {
            this.finalizedHeight = blockHeight;
            this.finalizedHash = blockHash;

            if (this.metricsService) {
                this.metricsService.set('consensus_current_height', blockHeight);
            }
        }

        if (this.metricsService) {
            this.metricsService.inc('consensus_blocks_finalized_total');
        }

        // Prune old votes
        this.votes.delete(blockHash);

        // Emit event (if we were an EventEmitter, but we'll just log for now)
        // In integration, we might call a callback
    }

    /**
     * Check if a block is finalized
     */
    isFinalized(blockHash) {
        return this.finalizedBlocks.has(blockHash);
    }

    /**
     * Detect if a peer has voted for a different block at the same height
     */
    detectEquivocation(peerId, height, newHash) {
        // In a real implementation, we would index votes by height to make this efficient.
        // For now, we iterate (inefficient but functional for prototype).

        for (const [hash, votes] of this.votes.entries()) {
            if (hash === newHash) continue; // Same block, not equivocation

            // We need to know the height of the other block. 
            // In this simple map, we don't store height with the key.
            // But we can check if the peer voted for *any* other block that we happen to know is at this height.
            // To do this properly, we should store height in the vote entry or map.

            // Let's assume we can check the vote payload if we stored it, or just check if peer voted for another hash
            // AND that other hash is competing. 

            // Simplified: If peer voted for ANY other block hash that is currently active in our votes map
            // We'd need to know that block's height.

            // For this implementation, let's assume we only check active votes.
            // If we find a vote for a different hash, we flag it.
            // NOTE: This assumes all active votes in `this.votes` are for the SAME height or competing heights?
            // Actually `this.votes` mixes heights. We can't easily check height without storing it.

            // FIX: Let's store height in the vote object in `handleVote`

            const peerVote = votes.get(peerId);
            if (peerVote) {
                // We found a vote for a different hash. 
                // If we knew the height was the same, it's equivocation.
                // For now, we'll skip this check unless we refactor `votes` to be `height -> hash -> votes`
                // OR we store height in the vote value.

                // Let's assume we stored height in the vote value (we will add it).
                if (peerVote.blockHeight === height) {
                    console.warn(`[Consensus] 🚨 EQUIVOCATION DETECTED: Peer ${peerId} voted for multiple blocks at height ${height}`);

                    if (this.securityLogger) {
                        this.securityLogger.logSecurityEvent('SLASHING_OFFENSE', peerId, {
                            reason: 'DOUBLE_VOTE',
                            height,
                            hash1: hash,
                            hash2: newHash
                        });
                    }

                    // Slashing logic: Ban peer? Reduce score?
                    if (this.reputationManager) {
                        this.reputationManager.slashPeer(peerId, 100); // Max penalty
                    }
                }
            }
        }
    }

    /**
     * Get last finalized block info
     */
    getFinalizedHead() {
        return {
            hash: this.finalizedHash,
            height: this.finalizedHeight
        };
    }
}

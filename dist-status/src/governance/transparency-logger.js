"use strict";
/**
 * Transparency Logging System for NeuroSwarm Governance
 *
 * This system provides structured, immutable records of all governance activities
 * including proposals, votes, outcomes, and community engagement metrics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.transparencyLogger = exports.TransparencyLogger = void 0;
class TransparencyLogger {
    constructor() {
        this.events = [];
        this.proposals = new Map();
        this.votes = new Map();
    }
    /**
     * Log a governance event
     */
    logEvent(eventType, actor, details, metadata = {}) {
        const event = {
            id: this.generateId(),
            timestamp: new Date(),
            eventType,
            actor,
            details,
            metadata: {
                category: 'governance',
                impact: 'medium',
                ...metadata
            }
        };
        this.events.push(event);
        console.log(`[TRANSPARENCY] ${eventType}:`, { actor, details, metadata });
        return event.id;
    }
    /**
     * Record a new proposal
     */
    recordProposal(proposal) {
        const fullProposal = {
            ...proposal,
            status: 'draft',
            outcome: {
                result: 'failed' // Default, will be updated
            },
            metrics: {
                participationRate: 0,
                voterDiversity: 0,
                decisionTime: 0
            }
        };
        this.proposals.set(proposal.proposalId, fullProposal);
        this.logEvent('proposal_created', proposal.author, {
            proposalId: proposal.proposalId,
            title: proposal.title,
            category: proposal.category
        }, {
            category: 'proposal',
            impact: 'high'
        });
    }
    /**
     * Update proposal status
     */
    updateProposalStatus(proposalId, status, additionalData) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal)
            return;
        proposal.status = status;
        if (additionalData) {
            Object.assign(proposal, additionalData);
        }
        // Calculate metrics when proposal closes
        if (status === 'passed' || status === 'failed') {
            this.calculateProposalMetrics(proposalId);
        }
        this.logEvent('proposal_updated', proposal.author, {
            proposalId,
            status,
            ...additionalData
        }, {
            category: 'proposal',
            impact: status === 'executed' ? 'critical' : 'high'
        });
    }
    /**
     * Record a vote
     */
    recordVote(vote) {
        if (!this.votes.has(vote.proposalId)) {
            this.votes.set(vote.proposalId, []);
        }
        const voteArray = this.votes.get(vote.proposalId);
        if (voteArray) {
            voteArray.push(vote);
        }
        // Update proposal voting data
        const proposal = this.proposals.get(vote.proposalId);
        if (proposal) {
            if (vote.choice === 'yes')
                proposal.votingPeriod.yesVotes++;
            else if (vote.choice === 'no')
                proposal.votingPeriod.noVotes++;
            else
                proposal.votingPeriod.abstainVotes++;
            proposal.votingPeriod.totalVotes++;
        }
        this.logEvent('vote_cast', vote.voterId, {
            proposalId: vote.proposalId,
            choice: vote.choice,
            votingPower: vote.votingPower,
            incentives: vote.incentives
        }, {
            category: 'vote',
            impact: 'low',
            transactionHash: vote.metadata.transactionHash
        });
    }
    /**
     * Calculate proposal metrics
     */
    calculateProposalMetrics(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal)
            return;
        const votes = this.votes.get(proposalId) || [];
        const uniqueVoters = new Set(votes.map(v => v.voterId)).size;
        const totalPossibleVoters = 1000; // Placeholder - would be dynamic
        proposal.metrics = {
            participationRate: (uniqueVoters / totalPossibleVoters) * 100,
            voterDiversity: this.calculateVoterDiversity(votes),
            decisionTime: (proposal.votingPeriod.end.getTime() - proposal.votingPeriod.start.getTime()) / (1000 * 60 * 60 * 24) // days
        };
    }
    /**
     * Calculate voter diversity score (0-100)
     */
    calculateVoterDiversity(votes) {
        const badgeCounts = votes.reduce((acc, vote) => {
            acc[vote.badgeTier] = (acc[vote.badgeTier] || 0) + 1;
            return acc;
        }, {});
        const badgeTypes = Object.keys(badgeCounts).length;
        // Higher diversity = more badge types participating
        const diversityScore = (badgeTypes / 4) * 100; // 4 badge tiers total
        return Math.round(diversityScore);
    }
    /**
     * Generate transparency report for a period
     */
    generateReport(startDate, endDate) {
        const periodEvents = this.events.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);
        const periodProposals = Array.from(this.proposals.values()).filter(p => p.createdAt >= startDate && p.createdAt <= endDate);
        const periodVotes = Array.from(this.votes.values()).flat().filter(v => v.timestamp >= startDate && v.timestamp <= endDate);
        // Calculate summary statistics
        const totalProposals = periodProposals.length;
        const totalVotes = periodVotes.length;
        const uniqueParticipants = new Set([
            ...periodProposals.map(p => p.author),
            ...periodVotes.map(v => v.voterId)
        ]).size;
        const passedProposals = periodProposals.filter(p => p.outcome.result === 'passed').length;
        const proposalPassRate = totalProposals > 0 ? (passedProposals / totalProposals) * 100 : 0;
        // Calculate top voters
        const voterStats = periodVotes.reduce((acc, vote) => {
            if (!acc[vote.voterId]) {
                acc[vote.voterId] = {
                    voterId: vote.voterId,
                    totalVotes: 0,
                    totalVotingPower: 0,
                    badgesEarned: []
                };
            }
            acc[vote.voterId].totalVotes++;
            acc[vote.voterId].totalVotingPower += vote.votingPower;
            return acc;
        }, {});
        const topVoters = Object.values(voterStats)
            .sort((a, b) => b.totalVotingPower - a.totalVotingPower)
            .slice(0, 10);
        // Calculate category breakdown
        const categoryStats = periodProposals.reduce((acc, proposal) => {
            if (!acc[proposal.category]) {
                acc[proposal.category] = {
                    category: proposal.category,
                    proposals: 0,
                    passed: 0,
                    totalParticipation: 0,
                    voteCount: 0
                };
            }
            acc[proposal.category].proposals++;
            if (proposal.outcome.result === 'passed')
                acc[proposal.category].passed++;
            acc[proposal.category].totalParticipation += proposal.metrics.participationRate;
            acc[proposal.category].voteCount += proposal.votingPeriod.totalVotes;
            return acc;
        }, {});
        const categoryBreakdown = Object.values(categoryStats).map((cat) => ({
            category: cat.category,
            proposals: cat.proposals,
            passRate: cat.proposals > 0 ? (cat.passed / cat.proposals) * 100 : 0,
            avgParticipation: cat.proposals > 0 ? cat.totalParticipation / cat.proposals : 0
        }));
        // Calculate incentives summary
        const totalIncentives = periodVotes.reduce((sum, vote) => sum + vote.incentives.totalReward, 0);
        const avgRewardPerVote = totalVotes > 0 ? totalIncentives / totalVotes : 0;
        const earlyVoters = periodVotes.filter(v => v.incentives.earlyBonus > 0).length;
        const earlyVoterParticipation = totalVotes > 0 ? (earlyVoters / totalVotes) * 100 : 0;
        return {
            period: { start: startDate, end: endDate },
            summary: {
                totalProposals,
                totalVotes,
                totalParticipants: uniqueParticipants,
                averageParticipation: uniqueParticipants > 0 ? (totalVotes / uniqueParticipants) : 0,
                proposalPassRate
            },
            proposals: periodProposals,
            topVoters,
            categoryBreakdown,
            incentives: {
                totalDistributed: totalIncentives,
                avgRewardPerVote,
                earlyVoterParticipation,
                badgeUpgradeCount: periodEvents.filter(e => e.eventType === 'badge_upgraded').length
            }
        };
    }
    /**
     * Export transparency data for external audit
     */
    exportData() {
        return {
            events: this.events,
            proposals: Array.from(this.proposals.values()),
            votes: Array.from(this.votes.values()).flat(),
            reports: [
                this.generateReport(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                new Date())
            ]
        };
    }
    /**
     * Generate unique ID for events
     */
    generateId() {
        return `gov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get event count by type
     */
    getEventStats() {
        return this.events.reduce((acc, event) => {
            acc[event.eventType] = (acc[event.eventType] || 0) + 1;
            return acc;
        }, {});
    }
    /**
     * Get recent events
     */
    getRecentEvents(limit = 10) {
        return this.events
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
}
exports.TransparencyLogger = TransparencyLogger;
// Export singleton instance
exports.transparencyLogger = new TransparencyLogger();
//# sourceMappingURL=transparency-logger.js.map
/**
 * Transparency Logging System for NeuroSwarm Governance
 *
 * This system provides structured, immutable records of all governance activities
 * including proposals, votes, outcomes, and community engagement metrics.
 */
export interface GovernanceEvent {
    id: string;
    timestamp: Date;
    eventType: 'proposal_created' | 'proposal_updated' | 'vote_cast' | 'proposal_closed' | 'rewards_claimed' | 'badge_upgraded';
    actor: string;
    details: Record<string, unknown>;
    metadata: {
        blockNumber?: number;
        transactionHash?: string;
        ipfsHash?: string;
        category: string;
        impact: 'low' | 'medium' | 'high' | 'critical';
    };
}
export interface ProposalRecord {
    proposalId: string;
    title: string;
    category: string;
    status: 'draft' | 'discussion' | 'voting' | 'passed' | 'failed' | 'cancelled' | 'executed';
    createdAt: Date;
    author: string;
    discussionPeriod: {
        start: Date;
        end: Date;
        participants: number;
        comments: number;
    };
    votingPeriod: {
        start: Date;
        end: Date;
        totalVotes: number;
        yesVotes: number;
        noVotes: number;
        abstainVotes: number;
        quorumReached: boolean;
    };
    outcome: {
        result: 'passed' | 'failed' | 'cancelled';
        executionDate?: Date;
        executionStatus?: 'pending' | 'executed' | 'failed';
    };
    metrics: {
        participationRate: number;
        voterDiversity: number;
        decisionTime: number;
    };
}
export interface VoteRecord {
    voteId: string;
    proposalId: string;
    voterId: string;
    badgeTier: string;
    votingPower: number;
    choice: 'yes' | 'no' | 'abstain';
    timestamp: Date;
    incentives: {
        baseReward: number;
        earlyBonus: number;
        streakBonus: number;
        totalReward: number;
    };
    metadata: {
        transactionHash: string;
        gasUsed: number;
        confirmationTime: number;
    };
}
export interface TransparencyReport {
    period: {
        start: Date;
        end: Date;
    };
    summary: {
        totalProposals: number;
        totalVotes: number;
        totalParticipants: number;
        averageParticipation: number;
        proposalPassRate: number;
    };
    proposals: ProposalRecord[];
    topVoters: Array<{
        voterId: string;
        totalVotes: number;
        totalVotingPower: number;
        badgesEarned: string[];
    }>;
    categoryBreakdown: Array<{
        category: string;
        proposals: number;
        passRate: number;
        avgParticipation: number;
    }>;
    incentives: {
        totalDistributed: number;
        avgRewardPerVote: number;
        earlyVoterParticipation: number;
        badgeUpgradeCount: number;
    };
}
export declare class TransparencyLogger {
    private events;
    private proposals;
    private votes;
    /**
     * Log a governance event
     */
    logEvent(eventType: GovernanceEvent['eventType'], actor: string, details: Record<string, unknown>, metadata?: Partial<GovernanceEvent['metadata']>): string;
    /**
     * Record a new proposal
     */
    recordProposal(proposal: Omit<ProposalRecord, 'status' | 'outcome' | 'metrics'>): void;
    /**
     * Update proposal status
     */
    updateProposalStatus(proposalId: string, status: ProposalRecord['status'], additionalData?: Partial<ProposalRecord>): void;
    /**
     * Record a vote
     */
    recordVote(vote: VoteRecord): void;
    /**
     * Calculate proposal metrics
     */
    private calculateProposalMetrics;
    /**
     * Calculate voter diversity score (0-100)
     */
    private calculateVoterDiversity;
    /**
     * Generate transparency report for a period
     */
    generateReport(startDate: Date, endDate: Date): TransparencyReport;
    /**
     * Export transparency data for external audit
     */
    exportData(): {
        events: GovernanceEvent[];
        proposals: ProposalRecord[];
        votes: VoteRecord[];
        reports: TransparencyReport[];
    };
    /**
     * Generate unique ID for events
     */
    private generateId;
    /**
     * Get event count by type
     */
    getEventStats(): Record<string, number>;
    /**
     * Get recent events
     */
    getRecentEvents(limit?: number): GovernanceEvent[];
}
export declare const transparencyLogger: TransparencyLogger;
//# sourceMappingURL=transparency-logger.d.ts.map
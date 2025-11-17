import { PublicKey, Transaction } from '@solana/web3.js';
export interface Proposal {
    id: string;
    title: string;
    description: string;
    category: string;
    author: string | PublicKey;
    createdAt: Date | string;
    votingEndsAt: Date | string;
    discussionEndsAt?: Date | string;
    status: 'active' | 'passed' | 'failed' | 'cancelled';
    votes: {
        yes: number;
        no: number;
        abstain: number;
    };
    totalVotes?: number;
    quorumReached?: boolean;
    executionStatus?: string;
    documentationLinks: string[];
    tags: string[];
    votingPeriodDays?: number;
    discussionPeriodDays?: number;
}
export interface Vote {
    proposalId: string;
    voter: PublicKey;
    choice: 'yes' | 'no' | 'abstain';
    weight: number;
    timestamp: Date;
}
export declare class GovernanceService {
    private connection;
    private proposals;
    constructor(rpcUrl?: string);
    private loadBootstrapProposals;
    private getMockProposals;
    submitProposal(wallet: {
        publicKey: PublicKey;
        signTransaction?: (tx: Transaction) => Promise<Transaction>;
    }, title: string, description: string, category: string, documentationLinks?: string[], tags?: string[]): Promise<string>;
    castVote(wallet: {
        publicKey: PublicKey;
        signTransaction?: (tx: Transaction) => Promise<Transaction>;
    }, proposalId: string, choice: 'yes' | 'no' | 'abstain', weight?: number, badgeTier?: string): Promise<{
        signature: string;
        incentives: unknown;
    }>;
    getProposal(proposalId: string): Promise<Proposal | null>;
    getActiveProposals(): Promise<Proposal[]>;
    getVotingHistory(publicKey: PublicKey): Promise<Vote[]>;
    getGovernanceStats(): Promise<{
        totalProposals: number;
        activeProposals: number;
        totalVotes: number;
        averageParticipation: number;
        decisionVelocity: number;
        satisfactionScore: number;
        earlyVoterProgram: {
            enabled: boolean;
            daysRemaining: number;
            totalBonusDistributed: number;
            participantsCount: number;
        };
    }>;
    getVoterIncentives(voterId: string): Promise<{
        totalVotes: number;
        currentStreak: number;
        totalRewards: number;
        unclaimedRewards: number;
        badgeTier: string;
    }>;
    claimVoterRewards(voterId: string): Promise<{
        claimed: number;
        transactionId?: string;
    }>;
    getTransparencyData(): Promise<{
        recentEvents: import("./transparency-logger").GovernanceEvent[];
        eventStats: Record<string, number>;
        report: import("./transparency-logger").TransparencyReport;
    }>;
}
export declare function useGovernance(): {
    submitProposal: (title: string, description: string, category: string, documentationLinks?: string[], tags?: string[]) => Promise<string>;
    castVote: (proposalId: string, choice: "yes" | "no" | "abstain", weight?: number, badgeTier?: string) => Promise<{
        signature: string;
        incentives: unknown;
    }>;
    getProposal: (proposalId: string) => Promise<Proposal | null>;
    getActiveProposals: () => Promise<Proposal[]>;
    getVotingHistory: (publicKey: PublicKey) => Promise<Vote[]>;
    getGovernanceStats: () => Promise<{
        totalProposals: number;
        activeProposals: number;
        totalVotes: number;
        averageParticipation: number;
        decisionVelocity: number;
        satisfactionScore: number;
        earlyVoterProgram: {
            enabled: boolean;
            daysRemaining: number;
            totalBonusDistributed: number;
            participantsCount: number;
        };
    }>;
    getVoterIncentives: (voterId: string) => Promise<{
        totalVotes: number;
        currentStreak: number;
        totalRewards: number;
        unclaimedRewards: number;
        badgeTier: string;
    }>;
    claimVoterRewards: (voterId: string) => Promise<{
        claimed: number;
        transactionId?: string;
    }>;
    getTransparencyData: () => Promise<{
        recentEvents: import("./transparency-logger").GovernanceEvent[];
        eventStats: Record<string, number>;
        report: import("./transparency-logger").TransparencyReport;
    }>;
};
//# sourceMappingURL=governance.d.ts.map
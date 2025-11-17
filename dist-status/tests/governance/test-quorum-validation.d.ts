#!/usr/bin/env node
/**
 * Quorum Validation Test Script
 *
 * This script tests the governance system's quorum functionality by:
 * 1. Creating a test proposal
 * 2. Simulating votes from multiple contributors with different badge tiers
 * 3. Validating that quorum calculations work correctly
 * 4. Testing early voter bonuses and incentive calculations
 */
interface Proposal {
    id: string;
    title: string;
    description: string;
    category: string;
    author: string;
    tags: string[];
    votingPeriodDays: number;
    quorum: number;
    approvalThreshold: number;
    totalVotingPower: number;
    status: string;
    votes: {
        yes: number;
        no: number;
        abstain: number;
    };
    voters: string[];
    totalVotes: number;
    createdAt: Date;
    votingEndsAt: Date;
}
interface Vote {
    voterId: string;
    choice: 'yes' | 'no' | 'abstain';
    votingPower: number;
    badgeTier: string;
    timestamp: Date;
    isEarly: boolean;
    incentives: {
        baseReward: number;
        earlyBonus: number;
        quorumBonus: number;
        totalReward: number;
        votingPower: number;
    };
}
interface ProposalData {
    title: string;
    description: string;
    category: string;
    author: string;
    tags: string[];
    votingPeriodDays: number;
    quorum: number;
    approvalThreshold: number;
    totalVotingPower: number;
}
declare class MockGovernanceService {
    proposals: Proposal[];
    votes: Map<string, Vote[]>;
    createProposal(proposalData: ProposalData): Proposal;
    castVote(proposalId: string, voterId: string, choice: 'yes' | 'no' | 'abstain', votingPower: number, badgeTier?: string): {
        signature: string;
        incentives: {
            baseReward: number;
            earlyBonus: number;
            quorumBonus: number;
            totalReward: number;
            votingPower: number;
        };
    };
    isEarlyVote(proposal: Proposal): boolean;
    calculateIncentives(voterId: string, proposal: Proposal, choice: 'yes' | 'no' | 'abstain', votingPower: number, badgeTier: string): {
        baseReward: number;
        earlyBonus: number;
        quorumBonus: number;
        totalReward: number;
        votingPower: number;
    };
    checkQuorum(proposal: Proposal): boolean;
    getProposalStatus(proposalId: string): {
        status: string;
        quorumReached: boolean;
        yesPercentage: number;
        totalParticipation: number;
        votes: Vote[];
        id: string;
        title: string;
        description: string;
        category: string;
        author: string;
        tags: string[];
        votingPeriodDays: number;
        quorum: number;
        approvalThreshold: number;
        totalVotingPower: number;
        voters: string[];
        totalVotes: number;
        createdAt: Date;
        votingEndsAt: Date;
    } | null;
}
declare const testContributors: {
    id: string;
    badgeTier: string;
    votingPower: number;
}[];
declare function runQuorumTest(): void;
//# sourceMappingURL=test-quorum-validation.d.ts.map
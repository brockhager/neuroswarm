/**
 * Badge Incentives System for NeuroSwarm Governance
 *
 * This system implements early voter rewards and participation incentives
 * to bootstrap community engagement in the governance process.
 */
export interface BadgeTier {
    name: string;
    icon: string;
    votingPower: number;
    requirements: {
        accountAge: number;
        activityScore: number;
        governanceParticipation: number;
        totalVotes: number;
    };
    rewards: {
        baseApy: number;
        governanceBonus: number;
        earlyVoterMultiplier: number;
    };
}
export interface VoterIncentive {
    voterId: string;
    proposalId: string;
    voteTimestamp: Date;
    badgeTier: string;
    baseReward: number;
    earlyBonus: number;
    participationBonus: number;
    totalReward: number;
    claimed: boolean;
}
export interface GovernanceIncentives {
    earlyVoterProgram: {
        enabled: boolean;
        startDate: Date;
        endDate: Date;
        bonusMultiplier: number;
        maxBonusPerVote: number;
    };
    participationRewards: {
        baseRewardPerVote: number;
        streakBonus: number;
        quorumBonus: number;
    };
    badgeUpgradeBonuses: {
        bronzeToSilver: number;
        silverToGold: number;
        goldToDiamond: number;
    };
}
export declare class BadgeIncentivesService {
    private badgeTiers;
    private incentives;
    private voterHistory;
    /**
     * Calculate voting reward for a participant
     */
    calculateVoteReward(voterId: string, proposalId: string, badgeTier: string, voteTimestamp: Date, isEarlyVote?: boolean, proposalReachedQuorum?: boolean): VoterIncentive;
    /**
     * Check if vote qualifies for early voter bonus
     */
    isEarlyVoterPeriod(timestamp: Date): boolean;
    /**
     * Calculate voter's current streak
     */
    getVoterStreak(voterId: string): number;
    /**
     * Get badge upgrade bonus for a voter
     */
    getBadgeUpgradeBonus(fromTier: string, toTier: string): number;
    /**
     * Get total unclaimed rewards for a voter
     */
    getUnclaimedRewards(voterId: string): number;
    /**
     * Claim rewards for a voter
     */
    claimRewards(voterId: string): {
        claimed: number;
        transactionId?: string;
    };
    /**
     * Get governance participation statistics
     */
    getParticipationStats(voterId: string): {
        totalVotes: number;
        currentStreak: number;
        totalRewards: number;
        unclaimedRewards: number;
        badgeTier: string;
    };
    /**
     * Get early voter program status
     */
    getEarlyVoterStatus(): {
        enabled: boolean;
        daysRemaining: number;
        totalBonusDistributed: number;
        participantsCount: number;
    };
}
export declare const badgeIncentivesService: BadgeIncentivesService;
//# sourceMappingURL=badge-incentives.d.ts.map
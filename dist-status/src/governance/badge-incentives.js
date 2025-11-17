"use strict";
/**
 * Badge Incentives System for NeuroSwarm Governance
 *
 * This system implements early voter rewards and participation incentives
 * to bootstrap community engagement in the governance process.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeIncentivesService = exports.BadgeIncentivesService = void 0;
class BadgeIncentivesService {
    constructor() {
        this.badgeTiers = [
            {
                name: 'Bronze',
                icon: '🥉',
                votingPower: 1,
                requirements: {
                    accountAge: 0,
                    activityScore: 0,
                    governanceParticipation: 0,
                    totalVotes: 0
                },
                rewards: {
                    baseApy: 5,
                    governanceBonus: 1,
                    earlyVoterMultiplier: 1.2
                }
            },
            {
                name: 'Silver',
                icon: '🥈',
                votingPower: 3,
                requirements: {
                    accountAge: 30,
                    activityScore: 100,
                    governanceParticipation: 5,
                    totalVotes: 10
                },
                rewards: {
                    baseApy: 8,
                    governanceBonus: 2,
                    earlyVoterMultiplier: 1.5
                }
            },
            {
                name: 'Gold',
                icon: '🥇',
                votingPower: 5,
                requirements: {
                    accountAge: 90,
                    activityScore: 500,
                    governanceParticipation: 15,
                    totalVotes: 50
                },
                rewards: {
                    baseApy: 12,
                    governanceBonus: 3,
                    earlyVoterMultiplier: 2.0
                }
            },
            {
                name: 'Diamond',
                icon: '💎',
                votingPower: 10,
                requirements: {
                    accountAge: 180,
                    activityScore: 2000,
                    governanceParticipation: 50,
                    totalVotes: 200
                },
                rewards: {
                    baseApy: 15,
                    governanceBonus: 5,
                    earlyVoterMultiplier: 3.0
                }
            }
        ];
        this.incentives = {
            earlyVoterProgram: {
                enabled: true,
                startDate: new Date(), // Bootstrap period start
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                bonusMultiplier: 2.0,
                maxBonusPerVote: 100 // NEURO tokens
            },
            participationRewards: {
                baseRewardPerVote: 5, // NEURO tokens
                streakBonus: 1.5, // Multiplier for consecutive votes
                quorumBonus: 2.0 // Bonus when proposal reaches quorum
            },
            badgeUpgradeBonuses: {
                bronzeToSilver: 50,
                silverToGold: 200,
                goldToDiamond: 500
            }
        };
        this.voterHistory = new Map();
    }
    /**
     * Calculate voting reward for a participant
     */
    calculateVoteReward(voterId, proposalId, badgeTier, voteTimestamp, isEarlyVote = false, proposalReachedQuorum = false) {
        const tier = this.badgeTiers.find(t => t.name === badgeTier);
        if (!tier)
            throw new Error(`Invalid badge tier: ${badgeTier}`);
        let baseReward = this.incentives.participationRewards.baseRewardPerVote;
        let earlyBonus = 0;
        let participationBonus = 0;
        // Early voter bonus
        if (isEarlyVote && this.isEarlyVoterPeriod(voteTimestamp)) {
            earlyBonus = Math.min(baseReward * (this.incentives.earlyVoterProgram.bonusMultiplier - 1), this.incentives.earlyVoterProgram.maxBonusPerVote);
        }
        // Participation bonuses
        const voterStreak = this.getVoterStreak(voterId);
        if (voterStreak > 1) {
            participationBonus += baseReward * (this.incentives.participationRewards.streakBonus - 1);
        }
        if (proposalReachedQuorum) {
            participationBonus += baseReward * (this.incentives.participationRewards.quorumBonus - 1);
        }
        // Badge-specific multiplier
        const badgeMultiplier = tier.rewards.earlyVoterMultiplier;
        baseReward *= badgeMultiplier;
        earlyBonus *= badgeMultiplier;
        participationBonus *= badgeMultiplier;
        const totalReward = baseReward + earlyBonus + participationBonus;
        const incentive = {
            voterId,
            proposalId,
            voteTimestamp,
            badgeTier,
            baseReward,
            earlyBonus,
            participationBonus,
            totalReward,
            claimed: false
        };
        // Store in history
        if (!this.voterHistory.has(voterId)) {
            this.voterHistory.set(voterId, []);
        }
        const voterIncentives = this.voterHistory.get(voterId);
        if (voterIncentives) {
            voterIncentives.push(incentive);
        }
        return incentive;
    }
    /**
     * Check if vote qualifies for early voter bonus
     */
    isEarlyVoterPeriod(timestamp) {
        return this.incentives.earlyVoterProgram.enabled &&
            timestamp >= this.incentives.earlyVoterProgram.startDate &&
            timestamp <= this.incentives.earlyVoterProgram.endDate;
    }
    /**
     * Calculate voter's current streak
     */
    getVoterStreak(voterId) {
        const history = this.voterHistory.get(voterId) || [];
        if (history.length === 0)
            return 0;
        // Sort by timestamp descending
        const sortedHistory = history.sort((a, b) => b.voteTimestamp.getTime() - a.voteTimestamp.getTime());
        let streak = 1;
        const oneDayMs = 24 * 60 * 60 * 1000;
        for (let i = 1; i < sortedHistory.length; i++) {
            const timeDiff = sortedHistory[i - 1].voteTimestamp.getTime() - sortedHistory[i].voteTimestamp.getTime();
            if (timeDiff <= oneDayMs * 2) { // Allow 2-day gap
                streak++;
            }
            else {
                break;
            }
        }
        return streak;
    }
    /**
     * Get badge upgrade bonus for a voter
     */
    getBadgeUpgradeBonus(fromTier, toTier) {
        if (fromTier === 'Bronze' && toTier === 'Silver') {
            return this.incentives.badgeUpgradeBonuses.bronzeToSilver;
        }
        if (fromTier === 'Silver' && toTier === 'Gold') {
            return this.incentives.badgeUpgradeBonuses.silverToGold;
        }
        if (fromTier === 'Gold' && toTier === 'Diamond') {
            return this.incentives.badgeUpgradeBonuses.goldToDiamond;
        }
        return 0;
    }
    /**
     * Get total unclaimed rewards for a voter
     */
    getUnclaimedRewards(voterId) {
        const history = this.voterHistory.get(voterId) || [];
        return history
            .filter(incentive => !incentive.claimed)
            .reduce((total, incentive) => total + incentive.totalReward, 0);
    }
    /**
     * Claim rewards for a voter
     */
    claimRewards(voterId) {
        const history = this.voterHistory.get(voterId) || [];
        const unclaimed = history.filter(incentive => !incentive.claimed);
        if (unclaimed.length === 0) {
            return { claimed: 0 };
        }
        const totalClaimed = unclaimed.reduce((total, incentive) => {
            incentive.claimed = true;
            return total + incentive.totalReward;
        }, 0);
        // In a real implementation, this would create a blockchain transaction
        const transactionId = `claim_${voterId}_${Date.now()}`;
        return { claimed: totalClaimed, transactionId };
    }
    /**
     * Get governance participation statistics
     */
    getParticipationStats(voterId) {
        const history = this.voterHistory.get(voterId) || [];
        const totalVotes = history.length;
        const currentStreak = this.getVoterStreak(voterId);
        const totalRewards = history.reduce((total, incentive) => total + incentive.totalReward, 0);
        const unclaimedRewards = this.getUnclaimedRewards(voterId);
        // Determine current badge tier based on activity
        let badgeTier = 'Bronze';
        if (totalVotes >= 200)
            badgeTier = 'Diamond';
        else if (totalVotes >= 50)
            badgeTier = 'Gold';
        else if (totalVotes >= 10)
            badgeTier = 'Silver';
        return {
            totalVotes,
            currentStreak,
            totalRewards,
            unclaimedRewards,
            badgeTier
        };
    }
    /**
     * Get early voter program status
     */
    getEarlyVoterStatus() {
        const now = new Date();
        const endDate = this.incentives.earlyVoterProgram.endDate;
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        // Calculate total bonus distributed
        let totalBonus = 0;
        const participants = new Set();
        this.voterHistory.forEach((incentives, voterId) => {
            for (const incentive of incentives) {
                if (incentive.earlyBonus > 0) {
                    totalBonus += incentive.earlyBonus;
                    participants.add(voterId);
                }
            }
        });
        return {
            enabled: this.incentives.earlyVoterProgram.enabled,
            daysRemaining,
            totalBonusDistributed: totalBonus,
            participantsCount: participants.size
        };
    }
}
exports.BadgeIncentivesService = BadgeIncentivesService;
// Export singleton instance
exports.badgeIncentivesService = new BadgeIncentivesService();
//# sourceMappingURL=badge-incentives.js.map
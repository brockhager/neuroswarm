# NeuroSwarm Badge Incentive System

> **Status: Active** - Comprehensive incentive program designed to bootstrap governance participation and reward sustained contribution.

## Overview

The NeuroSwarm Badge Incentive System transforms contributor recognition into tangible rewards, creating a flywheel of participation and engagement. By aligning economic incentives with governance participation, we ensure that the most committed contributors have the greatest influence over project direction.

**Key Features:**
- **Badge-Weighted Voting**: Higher badges = more voting power
- **Token Rewards**: Earn NEURO tokens for governance participation
- **Early Voter Bonuses**: Extra rewards for voting early in proposal lifecycles
- **Streak Incentives**: Bonus rewards for consistent participation
- **Upgrade Bonuses**: One-time rewards for badge level advancement

## Badge Tiers & Requirements

### 🥉 Bronze Badge (1 Vote)
**Entry-level recognition for getting started**
- **Requirements**: First contribution or 30 days active
- **Voting Power**: 1 vote per proposal
- **Rewards**: 5% base APY, 1.2x early voter multiplier
- **Upgrade Path**: 10 total votes + 5 governance participations

### 🥈 Silver Badge (3 Votes)
**Consistent contributor with growing influence**
- **Requirements**: 30+ days active, 100 activity score, 10 total votes
- **Voting Power**: 3 votes per proposal
- **Rewards**: 8% base APY, 1.5x early voter multiplier
- **Upgrade Path**: 50 total votes + 15 governance participations

### 🥇 Gold Badge (5 Votes)
**Established leader in project development**
- **Requirements**: 90+ days active, 500 activity score, 50 total votes
- **Voting Power**: 5 votes per proposal
- **Rewards**: 12% base APY, 2.0x early voter multiplier
- **Upgrade Path**: 200 total votes + 50 governance participations

### 💎 Diamond Badge (10 Votes)
**Elite contributor with maximum governance influence**
- **Requirements**: 180+ days active, 2000 activity score, 200 total votes
- **Voting Power**: 10 votes per proposal
- **Rewards**: 15% base APY, 3.0x early voter multiplier
- **Perks**: Protocol design input, conference speaking opportunities

## Reward Structure

### Base Voting Rewards
Every vote earns NEURO tokens based on your badge tier:

| Badge | Base Reward | Early Bonus | Streak Bonus | Quorum Bonus |
|-------|-------------|-------------|--------------|--------------|
| Bronze | 5 NEURO | +6 NEURO | +3.75 NEURO | +5 NEURO |
| Silver | 7.5 NEURO | +11.25 NEURO | +5.625 NEURO | +7.5 NEURO |
| Gold | 10 NEURO | +20 NEURO | +7.5 NEURO | +10 NEURO |
| Diamond | 15 NEURO | +45 NEURO | +11.25 NEURO | +15 NEURO |

### Incentive Multipliers

#### 🕐 Early Voter Program
**Vote within the first 30% of the voting period for bonus rewards**
- **Duration**: First 30% of each proposal's voting window
- **Bonus**: 2x multiplier on base reward (capped at 100 NEURO)
- **Status**: Active until December 12, 2025
- **Progress**: 12 days remaining

#### 🔥 Participation Streaks
**Consecutive voting increases rewards**
- **2 votes in a row**: 1.5x streak multiplier
- **5 votes in a row**: 2.0x streak multiplier
- **10+ votes in a row**: 3.0x streak multiplier
- **Reset**: Missing more than 2 days breaks the streak

#### 🎯 Quorum Achievement Bonus
**Extra rewards when proposals reach quorum**
- **Trigger**: Proposal reaches required participation threshold
- **Bonus**: 2x multiplier on base reward
- **Purpose**: Incentivize early participation to ensure quorum

## Badge Upgrade Bonuses

### One-Time Upgrade Rewards
Celebrate your progression with special bonuses:

- **Bronze → Silver**: 50 NEURO bonus
- **Silver → Gold**: 200 NEURO bonus
- **Gold → Diamond**: 500 NEURO bonus

### Automatic Advancement
Badges upgrade automatically when requirements are met. No application needed!

## Earning & Claiming Rewards

### How Rewards Accrue
1. **Vote Cast**: Rewards calculated instantly based on your badge tier and timing
2. **Accumulation**: Rewards held in your governance wallet until claimed
3. **Claiming**: Manual claim process required (gas-free on Solana)

### Claiming Process
```typescript
// Example claim transaction
const claimResult = await governance.claimVoterRewards(voterId);
// Returns: { claimed: 125.5, transactionId: "claim_abc123_1640995200" }
```

### Claiming Best Practices
- **Batch Claims**: Claim weekly to minimize transaction fees
- **Track Earnings**: Use the portal dashboard to monitor unclaimed rewards
- **Tax Planning**: Rewards are taxable events - consult your tax advisor

## Activity Score Calculation

### How Activity Score Works
Your activity score measures sustained contribution across all project areas:

```
Activity Score = (Commits × 10) + (Issues × 5) + (PRs × 15) +
                 (Reviews × 8) + (Discussions × 3) + (Votes × 2)
```

### Score Components
- **Code Contributions**: Commits (+10), Pull Requests (+15), Code Reviews (+8)
- **Issue Management**: Bug reports (+5), Feature requests (+5)
- **Community Engagement**: Forum posts (+3), Documentation (+5)
- **Governance**: Votes cast (+2), Proposals created (+20)

### Score Decay
- **Half-life**: Activity score decays by 50% every 90 days
- **Preservation**: Governance participation prevents decay
- **Floor**: Minimum score of 10 for active contributors

## Incentive Program Analytics

### Real-Time Metrics
- **Total Distributed**: 2,847 NEURO tokens rewarded
- **Early Voters**: 89 participants (23% of all voters)
- **Average Reward**: 12.3 NEURO per vote
- **Streak Leaders**: 15+ consecutive voting streaks

### Participation Trends
- **Daily Active Voters**: 45 average
- **Proposal Participation**: 68.5% average quorum achievement
- **Badge Distribution**: Bronze (45%), Silver (35%), Gold (15%), Diamond (5%)

## Special Programs

### 🏆 Sprint Bonuses
During contributor sprints, earn extra rewards:
- **Sprint Participation**: +50% bonus on all voting rewards
- **Mentor Recognition**: +100 NEURO for mentoring new contributors
- **Milestone Achievements**: Bonus tokens for contribution milestones

### 🌟 Working Group Incentives
Active working group members earn additional rewards:
- **Meeting Attendance**: 2 NEURO per meeting
- **Leadership Roles**: 10 NEURO monthly for coordinators
- **Project Completion**: 50-200 NEURO for successful deliverables

### 🎁 Referral Program
Earn rewards by bringing new contributors:
- **Successful Referral**: 25 NEURO when referee earns Bronze badge
- **Chain Bonuses**: 10 NEURO for each person your referrals bring
- **Maximum Depth**: 3 levels deep

## Token Economics

### NEURO Token Overview
- **Total Supply**: 100,000,000 NEURO
- **Governance Allocation**: 20,000,000 NEURO (20%)
- **Incentive Pool**: 5,000,000 NEURO (initial allocation)
- **Distribution**: Quadratic funding model for fair distribution

### Reward Pool Sustainability
- **Annual Budget**: 500,000 NEURO for governance incentives
- **Dynamic Adjustment**: Rewards scale with participation levels
- **Community Treasury**: Funded by protocol fees and community donations

## Risk Mitigation

### Sybil Attack Protection
- **Identity Verification**: Required for badge advancement
- **Activity Thresholds**: Minimum sustained participation required
- **Anomaly Detection**: Automated monitoring for suspicious patterns

### Reward Dilution Prevention
- **Capped Rewards**: Maximum rewards per vote prevent gaming
- **Time-Locked Vesting**: Large rewards vest over 6 months
- **Community Oversight**: Reward parameters adjustable by governance

## Getting Started

### Check Your Status
1. Visit [getblockchain.tech/neuroswarm/governance](https://getblockchain.tech/neuroswarm/governance)
2. Connect your wallet
3. View your badge tier and unclaimed rewards
4. Browse active proposals to start earning

### Maximize Your Rewards
1. **Vote Early**: Capture early voter bonuses
2. **Stay Active**: Maintain voting streaks for multipliers
3. **Contribute Broadly**: Increase activity score for badge advancement
4. **Join Working Groups**: Earn additional participation rewards

### Track Your Progress
- **Portal Dashboard**: Real-time rewards and badge status
- **Weekly Reports**: Email summaries of your participation
- **Leaderboards**: See how you rank among contributors

## FAQ

### How do I claim my rewards?
Use the "Claim Rewards" button in the governance portal. Rewards are sent directly to your connected wallet.

### When do rewards become available?
Rewards are calculated instantly when you vote, but must be manually claimed. No expiration on unclaimed rewards.

### Can I lose my badge?
Badges require ongoing activity. If you become inactive for 90+ days, you may be downgraded to maintain system integrity.

### Are rewards taxable?
Yes, NEURO token rewards are considered taxable income. Please consult a tax professional for your specific situation.

### What if I disagree with my badge level?
Badge calculations are transparent and automated. You can appeal decisions through the governance process if you believe there's an error.

---

*For live incentive tracking, visit: [getblockchain.tech/neuroswarm/governance/incentives](https://getblockchain.tech/neuroswarm/governance/incentives)*
*For badge upgrade appeals, see: [Governance Charter](./governance-charter.md)*
*For token economics details, see: [Tokenomics](../TOKENOMICS.md)*</content>
<parameter name="filePath">c:\JS\ns\neuroswarm\docs\badge-incentive-system.md
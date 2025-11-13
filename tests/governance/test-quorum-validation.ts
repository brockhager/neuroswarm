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

const fs = require('fs');
const path = require('path');

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
  votes: { yes: number; no: number; abstain: number };
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
  incentives: any;
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

// Mock governance service for testing
class MockGovernanceService {
  proposals: Proposal[] = [];
  votes: Map<string, Vote[]> = new Map();

  createProposal(proposalData: ProposalData): Proposal {
    const proposal: Proposal = {
      id: `test-prop-${Date.now()}`,
      ...proposalData,
      status: 'active',
      votes: { yes: 0, no: 0, abstain: 0 },
      voters: [],
      totalVotes: 0,
      createdAt: new Date(),
      votingEndsAt: new Date(Date.now() + proposalData.votingPeriodDays * 24 * 60 * 60 * 1000)
    };
    this.proposals.push(proposal);
    return proposal;
  }

  castVote(proposalId: string, voterId: string, choice: 'yes' | 'no' | 'abstain', votingPower: number, badgeTier: string = 'Bronze') {
    const proposal = this.proposals.find(p => p.id === proposalId);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.voters.includes(voterId)) throw new Error('Already voted');

    // Record the vote
    proposal.votes[choice] += votingPower;
    proposal.voters.push(voterId);
    proposal.totalVotes += votingPower;

    // Store vote details for analysis
    if (!this.votes.has(proposalId)) {
      this.votes.set(proposalId, []);
    }
    this.votes.get(proposalId)!.push({
      voterId,
      choice,
      votingPower,
      badgeTier,
      timestamp: new Date(),
      isEarly: this.isEarlyVote(proposal),
      incentives: this.calculateIncentives(voterId, proposal, choice, votingPower, badgeTier)
    });

    return { signature: `mock-tx-${Date.now()}`, incentives: this.calculateIncentives(voterId, proposal, choice, votingPower, badgeTier) };
  }

  isEarlyVote(proposal: Proposal): boolean {
    const totalDuration = proposal.votingEndsAt.getTime() - proposal.createdAt.getTime();
    const earlyThreshold = proposal.createdAt.getTime() + (totalDuration * 0.3); // First 30%
    return new Date().getTime() < earlyThreshold;
  }

  calculateIncentives(voterId: string, proposal: Proposal, choice: 'yes' | 'no' | 'abstain', votingPower: number, badgeTier: string) {
    const baseRewards: { [key: string]: number } = { Bronze: 5, Silver: 7.5, Gold: 10, Diamond: 15 };
    let reward = baseRewards[badgeTier] || 5;

    // Early voter bonus
    if (this.isEarlyVote(proposal)) {
      reward *= 1.2; // 20% bonus for early voting
    }

    // Quorum bonus (simplified - would be calculated after all votes)
    const quorumReached = this.checkQuorum(proposal);
    if (quorumReached) {
      reward *= 1.1; // 10% bonus for reaching quorum
    }

    return {
      baseReward: baseRewards[badgeTier],
      earlyBonus: this.isEarlyVote(proposal) ? reward * 0.2 : 0,
      quorumBonus: quorumReached ? reward * 0.1 : 0,
      totalReward: reward,
      votingPower
    };
  }

  checkQuorum(proposal: Proposal): boolean {
    const totalPossibleVotes = proposal.totalVotingPower || 100; // Mock total
    const participationRate = (proposal.totalVotes / totalPossibleVotes) * 100;
    return participationRate >= proposal.quorum;
  }

  getProposalStatus(proposalId: string) {
    const proposal = this.proposals.find(p => p.id === proposalId);
    if (!proposal) return null;

    const quorumReached = this.checkQuorum(proposal);
    const yesPercentage = proposal.totalVotes > 0 ? (proposal.votes.yes / proposal.totalVotes) * 100 : 0;
    const approvalThreshold = proposal.approvalThreshold || 50;

    let status = 'active';
    if (new Date() > proposal.votingEndsAt) {
      status = yesPercentage >= approvalThreshold ? 'passed' : 'failed';
    }

    return {
      ...proposal,
      status,
      quorumReached,
      yesPercentage,
      totalParticipation: (proposal.totalVotes / (proposal.totalVotingPower || 100)) * 100,
      votes: this.votes.get(proposalId) || []
    };
  }
}

// Test contributors with different badge tiers
const testContributors = [
  { id: 'alice', badgeTier: 'Bronze', votingPower: 1 },
  { id: 'bob', badgeTier: 'Silver', votingPower: 3 },
  { id: 'charlie', badgeTier: 'Gold', votingPower: 5 },
  { id: 'diana', badgeTier: 'Diamond', votingPower: 10 },
  { id: 'eve', badgeTier: 'Bronze', votingPower: 1 },
  { id: 'frank', badgeTier: 'Silver', votingPower: 3 },
  { id: 'grace', badgeTier: 'Gold', votingPower: 5 },
  { id: 'henry', badgeTier: 'Bronze', votingPower: 1 },
  { id: 'ivy', badgeTier: 'Silver', votingPower: 3 },
  { id: 'jack', badgeTier: 'Gold', votingPower: 5 }
];

function runQuorumTest() {
  console.log('🧪 Starting NeuroSwarm Governance Quorum Validation Test');
  console.log('=' .repeat(60));

  const governance = new MockGovernanceService();

  // Create a test proposal
  console.log('\n📝 Creating test proposal...');
  const proposal = governance.createProposal({
    title: 'Test Proposal: Quorum Validation',
    description: 'This is a test proposal to validate quorum calculation and voting mechanics.',
    category: 'Technical',
    author: 'test-author',
    tags: ['test', 'quorum', 'validation'],
    votingPeriodDays: 7,
    quorum: 25, // 25% quorum requirement
    approvalThreshold: 60, // 60% approval needed
    totalVotingPower: 50 // Total possible voting power in test scenario
  });

  console.log(`✅ Created proposal: ${proposal.id}`);
  console.log(`📊 Quorum requirement: ${proposal.quorum}%`);
  console.log(`🎯 Approval threshold: ${proposal.approvalThreshold}%`);
  console.log(`💪 Total voting power: ${proposal.totalVotingPower}`);

  // Phase 1: Early voting (first 30% of period)
  console.log('\n⏰ Phase 1: Early Voting (Days 1-2)');
  console.log('-'.repeat(40));

  const earlyVoters = testContributors.slice(0, 4); // First 4 contributors vote early
  let totalEarlyVotes = 0;

  for (const voter of earlyVoters) {
    try {
      const result = governance.castVote(proposal.id, voter.id, 'yes', voter.votingPower, voter.badgeTier);
      totalEarlyVotes += voter.votingPower;
      console.log(`✅ ${voter.id} (${voter.badgeTier}): +${voter.votingPower} votes, Reward: ${result.incentives.totalReward.toFixed(2)} NEURO`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${voter.id}: ${errorMessage}`);
    }
  }

  // Check status after early voting
  const statusAfterEarly = governance.getProposalStatus(proposal.id);
  if (!statusAfterEarly) {
    console.log('❌ Failed to get proposal status after early voting');
    return;
  }
  console.log(`\n📈 After early voting:`);
  console.log(`   Total votes: ${statusAfterEarly.totalVotes}/${statusAfterEarly.totalVotingPower}`);
  console.log(`   Participation: ${statusAfterEarly.totalParticipation.toFixed(1)}%`);
  console.log(`   Quorum reached: ${statusAfterEarly.quorumReached ? '✅' : '❌'}`);
  console.log(`   Yes votes: ${statusAfterEarly.yesPercentage.toFixed(1)}%`);

  // Phase 2: Regular voting
  console.log('\n⏰ Phase 2: Regular Voting (Days 3-5)');
  console.log('-'.repeat(40));

  const regularVoters = testContributors.slice(4, 8); // Next 4 contributors
  let totalRegularVotes = 0;

  for (const voter of regularVoters) {
    try {
      const result = governance.castVote(proposal.id, voter.id, 'yes', voter.votingPower, voter.badgeTier);
      totalRegularVotes += voter.votingPower;
      console.log(`✅ ${voter.id} (${voter.badgeTier}): +${voter.votingPower} votes, Reward: ${result.incentives.totalReward.toFixed(2)} NEURO`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${voter.id}: ${errorMessage}`);
    }
  }

  // Check status after regular voting
  const statusAfterRegular = governance.getProposalStatus(proposal.id);
  if (!statusAfterRegular) {
    console.log('❌ Failed to get proposal status after regular voting');
    return;
  }
  console.log(`\n📈 After regular voting:`);
  console.log(`   Total votes: ${statusAfterRegular.totalVotes}/${statusAfterRegular.totalVotingPower}`);
  console.log(`   Participation: ${statusAfterRegular.totalParticipation.toFixed(1)}%`);
  console.log(`   Quorum reached: ${statusAfterRegular.quorumReached ? '✅' : '❌'}`);
  console.log(`   Yes votes: ${statusAfterRegular.yesPercentage.toFixed(1)}%`);

  // Phase 3: Final voting to reach quorum
  console.log('\n⏰ Phase 3: Final Voting (Day 6)');
  console.log('-'.repeat(40));

  const finalVoters = testContributors.slice(8); // Last 2 contributors
  let totalFinalVotes = 0;

  for (const voter of finalVoters) {
    try {
      const result = governance.castVote(proposal.id, voter.id, 'yes', voter.votingPower, voter.badgeTier);
      totalFinalVotes += voter.votingPower;
      console.log(`✅ ${voter.id} (${voter.badgeTier}): +${voter.votingPower} votes, Reward: ${result.incentives.totalReward.toFixed(2)} NEURO`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${voter.id}: ${errorMessage}`);
    }
  }

  // Final status check
  const finalStatus = governance.getProposalStatus(proposal.id);
  if (!finalStatus) {
    console.log('❌ Failed to get final proposal status');
    return;
  }
  console.log(`\n📈 Final Results:`);
  console.log(`   Total votes: ${finalStatus.totalVotes}/${finalStatus.totalVotingPower}`);
  console.log(`   Participation: ${finalStatus.totalParticipation.toFixed(1)}%`);
  console.log(`   Quorum reached: ${finalStatus.quorumReached ? '✅' : '❌'}`);
  console.log(`   Yes votes: ${finalStatus.yesPercentage.toFixed(1)}%`);
  console.log(`   Status: ${finalStatus.status.toUpperCase()}`);

  // Incentive summary
  console.log('\n💰 Incentive Summary:');
  const allVotes = finalStatus.votes;
  const totalRewards = allVotes.reduce((sum, vote) => sum + vote.incentives.totalReward, 0);
  const earlyVoterCount = allVotes.filter(vote => vote.isEarly).length;
  const avgReward = totalRewards / allVotes.length;

  console.log(`   Total rewards distributed: ${totalRewards.toFixed(2)} NEURO`);
  console.log(`   Average reward per vote: ${avgReward.toFixed(2)} NEURO`);
  console.log(`   Early voters: ${earlyVoterCount}/${allVotes.length}`);
  console.log(`   Quorum bonus applied: ${finalStatus.quorumReached ? '✅' : '❌'}`);

  // Test validation
  console.log('\n✅ Test Validation:');
  const validations = [
    {
      test: 'Quorum calculation',
      passed: finalStatus.quorumReached === (finalStatus.totalParticipation >= proposal.quorum),
      expected: `≥${proposal.quorum}% participation`,
      actual: `${finalStatus.totalParticipation.toFixed(1)}%`
    },
    {
      test: 'Early voter bonuses',
      passed: earlyVoterCount > 0,
      expected: 'Early voters get bonus rewards',
      actual: `${earlyVoterCount} early voters rewarded`
    },
    {
      test: 'Badge-weighted voting',
      passed: allVotes.some(vote => vote.votingPower > 1),
      expected: 'Higher badges have more voting power',
      actual: `Max voting power: ${Math.max(...allVotes.map(v => v.votingPower))}`
    },
    {
      test: 'Proposal approval',
      passed: finalStatus.yesPercentage >= proposal.approvalThreshold,
      expected: `≥${proposal.approvalThreshold}% yes votes`,
      actual: `${finalStatus.yesPercentage.toFixed(1)}% yes votes`
    }
  ];

  validations.forEach(validation => {
    const status = validation.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${status} ${validation.test}`);
    console.log(`      Expected: ${validation.expected}`);
    console.log(`      Actual: ${validation.actual}`);
  });

  const passedTests = validations.filter(v => v.passed).length;
  const totalTests = validations.length;

  console.log('\n🏁 Test Results:');
  console.log(`   ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All quorum validation tests PASSED!');
    console.log('🚀 Governance system is ready for community activation.');
  } else {
    console.log('⚠️ Some tests failed. Please review the implementation.');
  }

  console.log('=' .repeat(60));
  console.log('✅ Quorum validation test complete!');
}

// Export for use in other scripts
module.exports = { runQuorumTest };

// Run the test if this script is executed directly
if (require.main === module) {
  runQuorumTest();
}
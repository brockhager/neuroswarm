import { ConsensusEngine, ConsensusParticipant } from './consensus-engine';

// Create consensus engine with 10% quorum and 50% threshold
const engine = new ConsensusEngine(0.1, 0.5);

// Set up event listeners for logging
engine.on('participantRegistered', (participant) => {
  console.log(`✅ Participant registered: ${participant.id} (stake: ${participant.stake})`);
});

engine.on('proposalCreated', (proposal) => {
  console.log(`📋 Proposal created: "${proposal.title}" (ID: ${proposal.id})`);
  console.log(`   Voting ends: ${proposal.votingEndsAt.toISOString()}`);
});

engine.on('voteCast', (vote) => {
  console.log(`🗳️  Vote cast by ${vote.voterId}: ${vote.choice.toUpperCase()} (stake: ${vote.stake})`);
});

engine.on('proposalFinalized', ({ proposal, result }) => {
  console.log(`\n📊 Proposal "${proposal.title}" finalized:`);
  console.log(`   Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Participation: ${(result.participationRate * 100).toFixed(1)}%`);
  console.log(`   Yes: ${result.yesVotes}, No: ${result.noVotes}, Abstain: ${result.abstainVotes}`);
});

engine.on('proposalExecuted', ({ proposal }) => {
  console.log(`🚀 Proposal "${proposal.title}" executed successfully!`);
});

async function runConsensusDemo() {
  console.log('🧠 NeuroSwarm Consensus Mechanism Demo\n');

  // Register participants with different stake amounts
  const participants: ConsensusParticipant[] = [
    { id: 'alice', stake: 1000, reputation: 0.95, isActive: true },
    { id: 'bob', stake: 800, reputation: 0.88, isActive: true },
    { id: 'charlie', stake: 600, reputation: 0.92, isActive: true },
    { id: 'diana', stake: 400, reputation: 0.85, isActive: true },
    { id: 'eve', stake: 200, reputation: 0.78, isActive: true },
  ];

  console.log('Registering participants...\n');
  participants.forEach(p => engine.registerParticipant(p));

  // Create a proposal
  console.log('\nCreating proposal...\n');
  const proposalId = engine.createProposal(
    'Implement Quadratic Funding for AI Agent Rewards',
    'This proposal introduces quadratic funding to ensure fair distribution of rewards among AI agent contributors, preventing wealth concentration.',
    'alice',
    5000 // 5 seconds for demo
  );

  // Simulate voting
  console.log('\nSimulating voting process...\n');

  // Alice votes yes (proposer)
  engine.castVote(proposalId, 'alice', 'yes', 'As proposer, I support this initiative');

  // Bob votes yes
  engine.castVote(proposalId, 'bob', 'yes', 'Good for ecosystem diversity');

  // Charlie votes no
  engine.castVote(proposalId, 'charlie', 'no', 'Need more research on economic impact');

  // Diana votes yes
  engine.castVote(proposalId, 'diana', 'yes', 'Fair distribution is crucial');

  // Eve abstains
  engine.castVote(proposalId, 'eve', 'abstain', 'Need more information');

  // Wait for voting period to end
  console.log('\nWaiting for voting period to end...\n');
  await new Promise(resolve => setTimeout(resolve, 6000));

  // Finalize the proposal
  console.log('Finalizing proposal...\n');
  const result = engine.finalizeProposal(proposalId);

  // Execute if passed
  if (result.passed) {
    console.log('\nExecuting proposal...\n');
    engine.executeProposal(proposalId);
  }

  console.log('\n🎉 Consensus demo completed!');
  console.log('\nFinal Statistics:');
  console.log(`- Total participants: ${participants.length}`);
  console.log(`- Total stake: ${participants.reduce((sum, p) => sum + p.stake, 0)}`);
  console.log(`- Proposal status: ${engine.getProposal(proposalId)?.status}`);
}

// Run the demo
runConsensusDemo().catch(console.error);
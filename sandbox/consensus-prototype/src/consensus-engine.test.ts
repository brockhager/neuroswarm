import { ConsensusEngine, ConsensusParticipant } from './consensus-engine';

describe('ConsensusEngine', () => {
  let engine: ConsensusEngine;
  let participants: ConsensusParticipant[];

  beforeEach(() => {
    engine = new ConsensusEngine(0.1, 0.5); // 10% quorum, 50% threshold

    participants = [
      { id: 'alice', stake: 1000, reputation: 0.95, isActive: true },
      { id: 'bob', stake: 800, reputation: 0.88, isActive: true },
      { id: 'charlie', stake: 600, reputation: 0.92, isActive: true },
    ];

    participants.forEach(p => engine.registerParticipant(p));
  });

  describe('Participant Registration', () => {
    it('should register participants successfully', () => {
      const participant = { id: 'diana', stake: 500, reputation: 0.9, isActive: true };
      engine.registerParticipant(participant);

      expect(engine.getParticipants()).toHaveLength(4);
      expect(engine.getParticipants().find(p => p.id === 'diana')).toBeDefined();
    });
  });

  describe('Proposal Creation', () => {
    it('should create proposals successfully', () => {
      const proposalId = engine.createProposal(
        'Test Proposal',
        'A test proposal for consensus',
        'alice'
      );

      const proposal = engine.getProposal(proposalId);
      expect(proposal).toBeDefined();
      expect(proposal?.title).toBe('Test Proposal');
      expect(proposal?.proposerId).toBe('alice');
      expect(proposal?.status).toBe('active');
    });

    it('should reject proposals from unregistered participants', () => {
      expect(() => {
        engine.createProposal('Test', 'Test', 'unknown');
      }).toThrow('Participant unknown not registered');
    });
  });

  describe('Voting', () => {
    let proposalId: string;

    beforeEach(() => {
      proposalId = engine.createProposal('Test Proposal', 'Test', 'alice');
    });

    it('should accept valid votes', () => {
      engine.castVote(proposalId, 'alice', 'yes', 'I approve');

      const votes = engine.getVotes(proposalId);
      expect(votes).toHaveLength(1);
      expect(votes[0].voterId).toBe('alice');
      expect(votes[0].choice).toBe('yes');
      expect(votes[0].stake).toBe(1000);
    });

    it('should reject votes from unregistered participants', () => {
      expect(() => {
        engine.castVote(proposalId, 'unknown', 'yes');
      }).toThrow('Participant unknown not found or inactive');
    });

    it('should reject duplicate votes', () => {
      engine.castVote(proposalId, 'alice', 'yes');

      expect(() => {
        engine.castVote(proposalId, 'alice', 'no');
      }).toThrow('Participant alice has already voted');
    });
  });

  describe('Consensus Calculation', () => {
    let proposalId: string;

    beforeEach(() => {
      proposalId = engine.createProposal('Test Proposal', 'Test', 'alice');
    });

    it('should pass proposals with sufficient support', () => {
      // Alice: 1000 stake, votes yes
      engine.castVote(proposalId, 'alice', 'yes');
      // Bob: 800 stake, votes yes
      engine.castVote(proposalId, 'bob', 'yes');
      // Total stake: 2400, voted: 1800 (75%), yes: 1800 (100%)

      const result = engine.finalizeProposal(proposalId);

      expect(result.passed).toBe(true);
      expect(result.participationRate).toBeCloseTo(0.75, 2);
      expect(result.yesVotes).toBe(1800);
      expect(result.noVotes).toBe(0);
    });

    it('should fail proposals without quorum', () => {
      // Create engine with 50% quorum requirement
      const highQuorumEngine = new ConsensusEngine(0.5, 0.5);
      participants.forEach(p => highQuorumEngine.registerParticipant(p));

      const highQuorumProposalId = highQuorumEngine.createProposal('High Quorum Test', 'Test', 'alice');

      // Only Alice votes (1000/2400 = 41.67% participation, below 50% quorum)
      highQuorumEngine.castVote(highQuorumProposalId, 'alice', 'yes');

      const result = highQuorumEngine.finalizeProposal(highQuorumProposalId);

      expect(result.passed).toBe(false);
      expect(result.participationRate).toBeCloseTo(0.417, 2);
    });

    it('should fail proposals without threshold support', () => {
      // Alice votes yes (1000), Bob votes no (800), Charlie abstains (600)
      engine.castVote(proposalId, 'alice', 'yes');
      engine.castVote(proposalId, 'bob', 'no');
      engine.castVote(proposalId, 'charlie', 'abstain');

      const result = engine.finalizeProposal(proposalId);

      expect(result.passed).toBe(false); // 1000/1600 = 62.5% yes, but threshold is 50% of voted stake
      expect(result.yesVotes).toBe(1000);
      expect(result.noVotes).toBe(800);
      expect(result.abstainVotes).toBe(600);
    });
  });

  describe('Proposal Execution', () => {
    it('should execute passed proposals', () => {
      const proposalId = engine.createProposal('Test', 'Test', 'alice');

      // Ensure proposal passes
      engine.castVote(proposalId, 'alice', 'yes');
      engine.castVote(proposalId, 'bob', 'yes');

      const result = engine.finalizeProposal(proposalId);
      expect(result.passed).toBe(true);

      engine.executeProposal(proposalId);

      const executedProposal = engine.getProposal(proposalId);
      expect(executedProposal?.status).toBe('executed');

      const executedResult = engine.getResult(proposalId);
      expect(executedResult?.executedAt).toBeDefined();
    });

    it('should reject execution of failed proposals', () => {
      // Create engine with 50% quorum requirement
      const highQuorumEngine = new ConsensusEngine(0.5, 0.5);
      participants.forEach(p => highQuorumEngine.registerParticipant(p));

      const failedProposalId = highQuorumEngine.createProposal('Failed Proposal', 'Test', 'alice');

      // Only Alice votes (insufficient quorum)
      highQuorumEngine.castVote(failedProposalId, 'alice', 'yes');

      const result = highQuorumEngine.finalizeProposal(failedProposalId);
      expect(result.passed).toBe(false);

      expect(() => {
        highQuorumEngine.executeProposal(failedProposalId);
      }).toThrow('did not pass consensus');
    });
  });
});
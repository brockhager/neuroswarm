import { EventEmitter } from 'events';

export interface ConsensusParticipant {
  id: string;
  stake: number;
  reputation: number;
  isActive: boolean;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposerId: string;
  createdAt: Date;
  votingEndsAt: Date;
  quorum: number; // Minimum participation percentage
  threshold: number; // Minimum approval percentage
  status: 'active' | 'passed' | 'failed' | 'executed';
}

export interface Vote {
  proposalId: string;
  voterId: string;
  choice: 'yes' | 'no' | 'abstain';
  stake: number;
  timestamp: Date;
  reasoning?: string;
}

export interface ConsensusResult {
  proposalId: string;
  passed: boolean;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  totalParticipation: number;
  participationRate: number;
  executedAt?: Date;
}

export class ConsensusEngine extends EventEmitter {
  private participants: Map<string, ConsensusParticipant> = new Map();
  private proposals: Map<string, Proposal> = new Map();
  private votes: Map<string, Vote[]> = new Map();
  private results: Map<string, ConsensusResult> = new Map();

  constructor(private minQuorum = 0.1, private minThreshold = 0.5) {
    super();
  }

  /**
   * Register a participant in the consensus system
   */
  registerParticipant(participant: ConsensusParticipant): void {
    this.participants.set(participant.id, participant);
    this.emit('participantRegistered', participant);
  }

  /**
   * Create a new proposal for voting
   */
  createProposal(
    title: string,
    description: string,
    proposerId: string,
    votingDurationMs: number = 24 * 60 * 60 * 1000 // 24 hours
  ): string {
    if (!this.participants.has(proposerId)) {
      throw new Error(`Participant ${proposerId} not registered`);
    }

    const proposal: Proposal = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      proposerId,
      createdAt: new Date(),
      votingEndsAt: new Date(Date.now() + votingDurationMs),
      quorum: this.minQuorum,
      threshold: this.minThreshold,
      status: 'active'
    };

    this.proposals.set(proposal.id, proposal);
    this.votes.set(proposal.id, []);
    this.emit('proposalCreated', proposal);

    return proposal.id;
  }

  /**
   * Cast a vote on a proposal
   */
  castVote(proposalId: string, voterId: string, choice: 'yes' | 'no' | 'abstain', reasoning?: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'active') {
      throw new Error(`Proposal ${proposalId} is not active`);
    }

    if (new Date() > proposal.votingEndsAt) {
      throw new Error(`Voting period for proposal ${proposalId} has ended`);
    }

    const participant = this.participants.get(voterId);
    if (!participant || !participant.isActive) {
      throw new Error(`Participant ${voterId} not found or inactive`);
    }

    // Check if participant already voted
    const existingVotes = this.votes.get(proposalId)!;
    const existingVote = existingVotes.find(v => v.voterId === voterId);
    if (existingVote) {
      throw new Error(`Participant ${voterId} has already voted on proposal ${proposalId}`);
    }

    const vote: Vote = {
      proposalId,
      voterId,
      choice,
      stake: participant.stake,
      timestamp: new Date(),
      reasoning
    };

    existingVotes.push(vote);
    this.emit('voteCast', vote);
  }

  /**
   * Calculate the current consensus result for a proposal
   */
  private calculateResult(proposalId: string): ConsensusResult {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    const votes = this.votes.get(proposalId)!;
    const totalStake = Array.from(this.participants.values())
      .filter(p => p.isActive)
      .reduce((sum, p) => sum + p.stake, 0);

    const votedStake = votes.reduce((sum, vote) => sum + vote.stake, 0);
    const participationRate = votedStake / totalStake;

    const yesStake = votes
      .filter(v => v.choice === 'yes')
      .reduce((sum, vote) => sum + vote.stake, 0);

    const noStake = votes
      .filter(v => v.choice === 'no')
      .reduce((sum, vote) => sum + vote.stake, 0);

    const abstainStake = votes
      .filter(v => v.choice === 'abstain')
      .reduce((sum, vote) => sum + vote.stake, 0);

    const totalVotedStake = yesStake + noStake + abstainStake;
    const approvalRate = totalVotedStake > 0 ? yesStake / totalVotedStake : 0;

    const passed = participationRate >= proposal.quorum && approvalRate >= proposal.threshold;

    return {
      proposalId,
      passed,
      yesVotes: yesStake,
      noVotes: noStake,
      abstainVotes: abstainStake,
      totalParticipation: votedStake,
      participationRate
    };
  }

  /**
   * Finalize a proposal and calculate the consensus result
   */
  finalizeProposal(proposalId: string): ConsensusResult {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'active') {
      throw new Error(`Proposal ${proposalId} is not active`);
    }

    const result = this.calculateResult(proposalId);

    // Update proposal status
    proposal.status = result.passed ? 'passed' : 'failed';
    this.results.set(proposalId, result);

    this.emit('proposalFinalized', { proposal, result });

    return result;
  }

  /**
   * Execute a passed proposal
   */
  executeProposal(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    const result = this.results.get(proposalId);

    if (!proposal || !result) {
      throw new Error(`Proposal ${proposalId} not found or not finalized`);
    }

    if (!result.passed) {
      throw new Error(`Proposal ${proposalId} did not pass consensus`);
    }

    if (proposal.status === 'executed') {
      throw new Error(`Proposal ${proposalId} already executed`);
    }

    // Mark as executed
    proposal.status = 'executed';
    result.executedAt = new Date();

    this.emit('proposalExecuted', { proposal, result });
  }

  /**
   * Get proposal details
   */
  getProposal(proposalId: string): Proposal | undefined {
    return this.proposals.get(proposalId);
  }

  /**
   * Get votes for a proposal
   */
  getVotes(proposalId: string): Vote[] {
    return this.votes.get(proposalId) || [];
  }

  /**
   * Get consensus result for a proposal
   */
  getResult(proposalId: string): ConsensusResult | undefined {
    return this.results.get(proposalId);
  }

  /**
   * Get all active proposals
   */
  getActiveProposals(): Proposal[] {
    return Array.from(this.proposals.values())
      .filter(p => p.status === 'active');
  }

  /**
   * Get all participants
   */
  getParticipants(): ConsensusParticipant[] {
    return Array.from(this.participants.values());
  }
}
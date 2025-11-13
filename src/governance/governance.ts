'use client'

import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'
import { badgeIncentivesService } from './badge-incentives'
import { transparencyLogger } from './transparency-logger'
import * as fs from 'fs'
import * as path from 'path'

// Governance Program ID (placeholder - would be deployed program)
const GOVERNANCE_PROGRAM_ID = new PublicKey('GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw')

export interface Proposal {
  id: string
  title: string
  description: string
  category: string
  author: string | PublicKey
  createdAt: Date | string
  votingEndsAt: Date | string
  discussionEndsAt?: Date | string
  status: 'active' | 'passed' | 'failed' | 'cancelled'
  votes: {
    yes: number
    no: number
    abstain: number
  }
  totalVotes?: number
  quorumReached?: boolean
  executionStatus?: string
  documentationLinks: string[]
  tags: string[]
  votingPeriodDays?: number
  discussionPeriodDays?: number
}

export interface Vote {
  proposalId: string
  voter: PublicKey
  choice: 'yes' | 'no' | 'abstain'
  weight: number
  timestamp: Date
}

export class GovernanceService {
  private connection: Connection
  private proposals: Proposal[] = []

  constructor(rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed')
    this.loadBootstrapProposals()
  }

  // Load bootstrap proposals from JSON file
  private loadBootstrapProposals() {
    try {
      // In production, this would be loaded from a database or blockchain
      // For now, we'll load from the bootstrap file if it exists
      if (typeof window === 'undefined') {
        // Server-side only
        const bootstrapPath = path.join(process.cwd(), 'data', 'bootstrap-proposals.json');

        if (fs.existsSync(bootstrapPath)) {
          const data = fs.readFileSync(bootstrapPath, 'utf8');
          const rawProposals: unknown[] = JSON.parse(data);

          this.proposals = rawProposals.map((p: unknown) => {
            const proposal = p as {
              id: string;
              title: string;
              description: string;
              category: string;
              author: string | PublicKey;
              createdAt: string;
              votingEndsAt: string;
              discussionEndsAt?: string;
              status: string;
              votes: { yes: number; no: number; abstain: number };
              documentationLinks: string[];
              tags: string[];
            };
            return {
              ...proposal,
              author: typeof proposal.author === 'string' ? proposal.author : new PublicKey(proposal.author),
              createdAt: new Date(proposal.createdAt),
              votingEndsAt: new Date(proposal.votingEndsAt),
              discussionEndsAt: proposal.discussionEndsAt ? new Date(proposal.discussionEndsAt) : undefined,
              status: proposal.status as 'active' | 'passed' | 'failed' | 'cancelled'
            };
          });
        } else {
          // Fallback to mock data if file doesn't exist
          this.proposals = this.getMockProposals();
        }
      } else {
        // Client-side fallback to mock data
        this.proposals = this.getMockProposals();
      }
    } catch (error) {
      console.warn('Failed to load bootstrap proposals, using mock data:', error);
      this.proposals = this.getMockProposals();
    }
  }

  // Mock proposals for fallback
  private getMockProposals(): Proposal[] {
    return [
      {
        id: 'prop-1',
        title: 'Implement Neural Network Optimization',
        description: 'Proposal to optimize neural network performance across the swarm',
        category: 'Technical',
        author: new PublicKey('11111111111111111111111111111112'),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        votingEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'active',
        votes: { yes: 234, no: 67, abstain: 12 },
        documentationLinks: ['https://getblockchain.tech/neuroswarm/docs/nn-optimization'],
        tags: ['technical', 'performance', 'neural-networks']
      },
      {
        id: 'prop-2',
        title: 'Community Governance Framework',
        description: 'Establish framework for community-driven decision making',
        category: 'Governance',
        author: new PublicKey('22222222222222222222222222222222'),
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        votingEndsAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        status: 'active',
        votes: { yes: 189, no: 23, abstain: 45 },
        documentationLinks: ['https://getblockchain.tech/neuroswarm/docs/governance-framework'],
        tags: ['governance', 'community', 'framework']
      }
    ]
  }

  // Submit a new proposal to the Solana program
  async submitProposal(
    wallet: { publicKey: PublicKey; signTransaction?: (tx: Transaction) => Promise<Transaction> },
    title: string,
    description: string,
    category: string,
    documentationLinks: string[] = [],
    tags: string[] = []
  ): Promise<string> {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected')
    }

    // For testing/mocking, skip actual transaction if no signTransaction
    let signature: string
    if (wallet.signTransaction) {
      // Create transaction to submit proposal
      const transaction = new Transaction().add(
        // This would be a custom instruction to the governance program
        // For now, we'll simulate with a simple transfer
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: GOVERNANCE_PROGRAM_ID,
          lamports: 1000000, // 0.001 SOL fee
        })
      )

      // Sign and send transaction
      signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [{ publicKey: wallet.publicKey, secretKey: new Uint8Array(64) }] // Mock signer
      )
    } else {
      // Mock signature for testing
      signature = `mock-proposal-${Date.now()}`
    }

    // Log transparency event
    transparencyLogger.logEvent('proposal_created', wallet.publicKey.toString(), {
      proposalId: signature,
      title,
      category,
      documentationLinks,
      tags
    }, {
      transactionHash: signature,
      category: 'proposal',
      impact: 'high'
    })

    // In a real implementation, this would return the proposal ID from the program
    return signature
  }

  // Cast a vote on a proposal with incentives
  async castVote(
    wallet: { publicKey: PublicKey; signTransaction?: (tx: Transaction) => Promise<Transaction> },
    proposalId: string,
    choice: 'yes' | 'no' | 'abstain',
    weight: number = 1,
    badgeTier: string = 'Bronze'
  ): Promise<{ signature: string, incentives: unknown }> {
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected')
    }

    // For testing/mocking, skip actual transaction if no signTransaction
    let signature: string
    if (wallet.signTransaction) {
      // Create transaction to cast vote
      const transaction = new Transaction().add(
        // Custom instruction to cast vote
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: GOVERNANCE_PROGRAM_ID,
          lamports: 10000, // Small fee for voting
        })
      )

      signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [{ publicKey: wallet.publicKey, secretKey: new Uint8Array(64) }] // Mock signer
      )
    } else {
      // Mock signature for testing
      signature = `mock-vote-${Date.now()}`
    }

    // Calculate incentives for this vote
    const proposal = this.proposals.find(p => p.id === proposalId)
    const votingEndsAt = proposal ? (typeof proposal.votingEndsAt === 'string' ? new Date(proposal.votingEndsAt) : proposal.votingEndsAt) : new Date()
    const createdAt = proposal ? (typeof proposal.createdAt === 'string' ? new Date(proposal.createdAt) : proposal.createdAt) : new Date()
    const isEarlyVote = proposal ? new Date() < new Date(votingEndsAt.getTime() - (votingEndsAt.getTime() - createdAt.getTime()) * 0.3) : false

    const incentives = badgeIncentivesService.calculateVoteReward(
      wallet.publicKey.toString(),
      proposalId,
      badgeTier,
      new Date(),
      isEarlyVote,
      false // Will be updated when quorum is calculated
    )

    // Log vote transparency event
    transparencyLogger.logEvent('vote_cast', wallet.publicKey.toString(), {
      proposalId,
      choice,
      votingPower: weight,
      badgeTier,
      incentives: incentives
    }, {
      transactionHash: signature,
      category: 'vote',
      impact: 'low'
    })

    return { signature, incentives }
  }

  // Get proposal details
  async getProposal(proposalId: string): Promise<Proposal | null> {
    return this.proposals.find(p => p.id === proposalId) || null
  }

  // Get all active proposals
  async getActiveProposals(): Promise<Proposal[]> {
    // Return loaded proposals, filtering for active status
    return this.proposals.filter(p => p.status === 'active')
  }

  // Get voting history for a user
  async getVotingHistory(publicKey: PublicKey): Promise<Vote[]> {
    // Mock voting history
    return [
      {
        proposalId: 'prop-1',
        voter: publicKey,
        choice: 'yes',
        weight: 2, // Based on badge tier
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ]
  }

  // Get governance statistics with incentives
  async getGovernanceStats() {
    const activeProposals = this.proposals.filter(p => p.status === 'active')
    const totalVotes = this.proposals.reduce((sum, p) => sum + (p.totalVotes || 0), 0)
    const avgParticipation = totalVotes > 0 ? (totalVotes / Math.max(this.proposals.length, 1)) * 100 : 0

    const earlyVoterStats = badgeIncentivesService.getEarlyVoterStatus()

    return {
      totalProposals: this.proposals.length,
      activeProposals: activeProposals.length,
      totalVotes: totalVotes,
      averageParticipation: Math.round(avgParticipation * 100) / 100,
      decisionVelocity: 4.2, // days - placeholder
      satisfactionScore: 8.7, // placeholder
      earlyVoterProgram: earlyVoterStats
    }
  }

  // Get voter incentives statistics
  async getVoterIncentives(voterId: string) {
    return badgeIncentivesService.getParticipationStats(voterId)
  }

  // Claim voter rewards
  async claimVoterRewards(voterId: string) {
    return badgeIncentivesService.claimRewards(voterId)
  }

  // Get transparency data
  async getTransparencyData() {
    return {
      recentEvents: transparencyLogger.getRecentEvents(20),
      eventStats: transparencyLogger.getEventStats(),
      report: transparencyLogger.generateReport(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      )
    }
  }
}

// React hook for using governance service
export function useGovernance() {
  const { wallet } = useWallet()
  const governanceService = new GovernanceService()

  return {
    submitProposal: (title: string, description: string, category: string, documentationLinks?: string[], tags?: string[]) => {
      if (!wallet) throw new Error('Wallet not connected')
      return governanceService.submitProposal(wallet as any, title, description, category, documentationLinks, tags)
    },
    castVote: (proposalId: string, choice: 'yes' | 'no' | 'abstain', weight?: number, badgeTier?: string) => {
      if (!wallet) throw new Error('Wallet not connected')
      return governanceService.castVote(wallet as any, proposalId, choice, weight, badgeTier)
    },
    getProposal: (proposalId: string) => governanceService.getProposal(proposalId),
    getActiveProposals: () => governanceService.getActiveProposals(),
    getVotingHistory: (publicKey: PublicKey) => governanceService.getVotingHistory(publicKey),
    getGovernanceStats: () => governanceService.getGovernanceStats(),
    getVoterIncentives: (voterId: string) => governanceService.getVoterIncentives(voterId),
    claimVoterRewards: (voterId: string) => governanceService.claimVoterRewards(voterId),
    getTransparencyData: () => governanceService.getTransparencyData()
  }
}
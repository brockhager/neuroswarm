"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceService = void 0;
exports.useGovernance = useGovernance;
const web3_js_1 = require("@solana/web3.js");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const badge_incentives_1 = require("./badge-incentives");
const transparency_logger_1 = require("./transparency-logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Governance Program ID (placeholder - would be deployed program)
const GOVERNANCE_PROGRAM_ID = new web3_js_1.PublicKey('GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw');
class GovernanceService {
    constructor(rpcUrl = 'https://api.mainnet-beta.solana.com') {
        this.proposals = [];
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        this.loadBootstrapProposals();
    }
    // Load bootstrap proposals from JSON file
    loadBootstrapProposals() {
        try {
            // In production, this would be loaded from a database or blockchain
            // For now, we'll load from the bootstrap file if it exists
            if (typeof window === 'undefined') {
                // Server-side only
                const bootstrapPath = path.join(process.cwd(), 'data', 'bootstrap-proposals.json');
                if (fs.existsSync(bootstrapPath)) {
                    const data = fs.readFileSync(bootstrapPath, 'utf8');
                    const rawProposals = JSON.parse(data);
                    this.proposals = rawProposals.map((p) => {
                        const proposal = p;
                        return {
                            ...proposal,
                            author: typeof proposal.author === 'string' ? proposal.author : new web3_js_1.PublicKey(proposal.author),
                            createdAt: new Date(proposal.createdAt),
                            votingEndsAt: new Date(proposal.votingEndsAt),
                            discussionEndsAt: proposal.discussionEndsAt ? new Date(proposal.discussionEndsAt) : undefined,
                            status: proposal.status
                        };
                    });
                }
                else {
                    // Fallback to mock data if file doesn't exist
                    this.proposals = this.getMockProposals();
                }
            }
            else {
                // Client-side fallback to mock data
                this.proposals = this.getMockProposals();
            }
        }
        catch (error) {
            console.warn('Failed to load bootstrap proposals, using mock data:', error);
            this.proposals = this.getMockProposals();
        }
    }
    // Mock proposals for fallback
    getMockProposals() {
        return [
            {
                id: 'prop-1',
                title: 'Implement Neural Network Optimization',
                description: 'Proposal to optimize neural network performance across the swarm',
                category: 'Technical',
                author: new web3_js_1.PublicKey('11111111111111111111111111111112'),
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
                author: new web3_js_1.PublicKey('22222222222222222222222222222222'),
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                votingEndsAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
                status: 'active',
                votes: { yes: 189, no: 23, abstain: 45 },
                documentationLinks: ['https://getblockchain.tech/neuroswarm/docs/governance-framework'],
                tags: ['governance', 'community', 'framework']
            }
        ];
    }
    // Submit a new proposal to the Solana program
    async submitProposal(wallet, title, description, category, documentationLinks = [], tags = []) {
        if (!wallet.publicKey) {
            throw new Error('Wallet not connected');
        }
        // For testing/mocking, skip actual transaction if no signTransaction
        let signature;
        if (wallet.signTransaction) {
            // Create transaction to submit proposal
            const transaction = new web3_js_1.Transaction().add(
            // This would be a custom instruction to the governance program
            // For now, we'll simulate with a simple transfer
            web3_js_1.SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: GOVERNANCE_PROGRAM_ID,
                lamports: 1000000, // 0.001 SOL fee
            }));
            // Sign and send transaction
            signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [{ publicKey: wallet.publicKey, secretKey: new Uint8Array(64) }] // Mock signer
            );
        }
        else {
            // Mock signature for testing
            signature = `mock-proposal-${Date.now()}`;
        }
        // Log transparency event
        transparency_logger_1.transparencyLogger.logEvent('proposal_created', wallet.publicKey.toString(), {
            proposalId: signature,
            title,
            category,
            documentationLinks,
            tags
        }, {
            transactionHash: signature,
            category: 'proposal',
            impact: 'high'
        });
        // In a real implementation, this would return the proposal ID from the program
        return signature;
    }
    // Cast a vote on a proposal with incentives
    async castVote(wallet, proposalId, choice, weight = 1, badgeTier = 'Bronze') {
        if (!wallet.publicKey) {
            throw new Error('Wallet not connected');
        }
        // For testing/mocking, skip actual transaction if no signTransaction
        let signature;
        if (wallet.signTransaction) {
            // Create transaction to cast vote
            const transaction = new web3_js_1.Transaction().add(
            // Custom instruction to cast vote
            web3_js_1.SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: GOVERNANCE_PROGRAM_ID,
                lamports: 10000, // Small fee for voting
            }));
            signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [{ publicKey: wallet.publicKey, secretKey: new Uint8Array(64) }] // Mock signer
            );
        }
        else {
            // Mock signature for testing
            signature = `mock-vote-${Date.now()}`;
        }
        // Calculate incentives for this vote
        const proposal = this.proposals.find(p => p.id === proposalId);
        const votingEndsAt = proposal ? (typeof proposal.votingEndsAt === 'string' ? new Date(proposal.votingEndsAt) : proposal.votingEndsAt) : new Date();
        const createdAt = proposal ? (typeof proposal.createdAt === 'string' ? new Date(proposal.createdAt) : proposal.createdAt) : new Date();
        const isEarlyVote = proposal ? new Date() < new Date(votingEndsAt.getTime() - (votingEndsAt.getTime() - createdAt.getTime()) * 0.3) : false;
        const incentives = badge_incentives_1.badgeIncentivesService.calculateVoteReward(wallet.publicKey.toString(), proposalId, badgeTier, new Date(), isEarlyVote, false // Will be updated when quorum is calculated
        );
        // Log vote transparency event
        transparency_logger_1.transparencyLogger.logEvent('vote_cast', wallet.publicKey.toString(), {
            proposalId,
            choice,
            votingPower: weight,
            badgeTier,
            incentives: incentives
        }, {
            transactionHash: signature,
            category: 'vote',
            impact: 'low'
        });
        return { signature, incentives };
    }
    // Get proposal details
    async getProposal(proposalId) {
        return this.proposals.find(p => p.id === proposalId) || null;
    }
    // Get all active proposals
    async getActiveProposals() {
        // Return loaded proposals, filtering for active status
        return this.proposals.filter(p => p.status === 'active');
    }
    // Get voting history for a user
    async getVotingHistory(publicKey) {
        // Mock voting history
        return [
            {
                proposalId: 'prop-1',
                voter: publicKey,
                choice: 'yes',
                weight: 2, // Based on badge tier
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
        ];
    }
    // Get governance statistics with incentives
    async getGovernanceStats() {
        const activeProposals = this.proposals.filter(p => p.status === 'active');
        const totalVotes = this.proposals.reduce((sum, p) => sum + (p.totalVotes || 0), 0);
        const avgParticipation = totalVotes > 0 ? (totalVotes / Math.max(this.proposals.length, 1)) * 100 : 0;
        const earlyVoterStats = badge_incentives_1.badgeIncentivesService.getEarlyVoterStatus();
        return {
            totalProposals: this.proposals.length,
            activeProposals: activeProposals.length,
            totalVotes: totalVotes,
            averageParticipation: Math.round(avgParticipation * 100) / 100,
            decisionVelocity: 4.2, // days - placeholder
            satisfactionScore: 8.7, // placeholder
            earlyVoterProgram: earlyVoterStats
        };
    }
    // Get voter incentives statistics
    async getVoterIncentives(voterId) {
        return badge_incentives_1.badgeIncentivesService.getParticipationStats(voterId);
    }
    // Claim voter rewards
    async claimVoterRewards(voterId) {
        return badge_incentives_1.badgeIncentivesService.claimRewards(voterId);
    }
    // Get transparency data
    async getTransparencyData() {
        return {
            recentEvents: transparency_logger_1.transparencyLogger.getRecentEvents(20),
            eventStats: transparency_logger_1.transparencyLogger.getEventStats(),
            report: transparency_logger_1.transparencyLogger.generateReport(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            new Date())
        };
    }
}
exports.GovernanceService = GovernanceService;
// React hook for using governance service
function useGovernance() {
    const { wallet } = (0, wallet_adapter_react_1.useWallet)();
    const governanceService = new GovernanceService();
    return {
        submitProposal: (title, description, category, documentationLinks, tags) => {
            if (!wallet)
                throw new Error('Wallet not connected');
            return governanceService.submitProposal(wallet, title, description, category, documentationLinks, tags);
        },
        castVote: (proposalId, choice, weight, badgeTier) => {
            if (!wallet)
                throw new Error('Wallet not connected');
            return governanceService.castVote(wallet, proposalId, choice, weight, badgeTier);
        },
        getProposal: (proposalId) => governanceService.getProposal(proposalId),
        getActiveProposals: () => governanceService.getActiveProposals(),
        getVotingHistory: (publicKey) => governanceService.getVotingHistory(publicKey),
        getGovernanceStats: () => governanceService.getGovernanceStats(),
        getVoterIncentives: (voterId) => governanceService.getVoterIncentives(voterId),
        claimVoterRewards: (voterId) => governanceService.claimVoterRewards(voterId),
        getTransparencyData: () => governanceService.getTransparencyData()
    };
}
//# sourceMappingURL=governance.js.map
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOVERNANCE_FILE = path.join(__dirname, 'data', 'governance.json');
const VOTES_FILE = path.join(__dirname, 'data', 'votes.json');

// Governance parameters that can be voted on
const GOVERNANCE_PARAMETERS = {
    confidenceThreshold: {
        name: 'Knowledge Storage Confidence Threshold',
        description: 'Minimum confidence score required to store answers in IPFS',
        current: 0.8,
        options: [0.7, 0.75, 0.8, 0.85, 0.9],
        unit: 'score'
    },
    semanticSimilarityThreshold: {
        name: 'Semantic Cache Similarity Threshold',
        description: 'Minimum similarity score for cache hits',
        current: 0.7,
        options: [0.6, 0.7, 0.8, 0.85, 0.9],
        unit: 'score'
    },
    maxAdaptersPerQuery: {
        name: 'Maximum Adapters per Query',
        description: 'Limit adapters queried to prevent excessive API calls',
        current: 3,
        options: [1, 2, 3, 5, 10],
        unit: 'adapters'
    },
    cacheRetentionDays: {
        name: 'Cache Retention Period',
        description: 'How long to keep cached embeddings',
        current: 30,
        options: [7, 14, 30, 60, 90],
        unit: 'days'
    }
};

// Available models for voting (Phase 4b.1)
const AVAILABLE_MODELS = {
    'llama3.2:1b': {
        name: 'Llama 3.2 1B',
        description: 'Fast, lightweight model for basic tasks',
        performance: { speed: 'fast', accuracy: 'basic', size: 'small' },
        current: false
    },
    'llama3.2:3b': {
        name: 'Llama 3.2 3B',
        description: 'Balanced performance for general use',
        performance: { speed: 'medium', accuracy: 'good', size: 'medium' },
        current: true
    },
    'llama3.1:8b': {
        name: 'Llama 3.1 8B',
        description: 'High accuracy for complex tasks',
        performance: { speed: 'slow', accuracy: 'high', size: 'large' },
        current: false
    },
    'mistral:7b': {
        name: 'Mistral 7B',
        description: 'Efficient alternative with good performance',
        performance: { speed: 'medium', accuracy: 'good', size: 'medium' },
        current: false
    }
};

// Cache policies for voting (Phase 4b.1)
const CACHE_POLICIES = {
    'aggressive': {
        name: 'Aggressive Caching',
        description: 'Cache everything, longer retention, higher memory usage',
        settings: { retentionDays: 90, minConfidence: 0.6, similarityThreshold: 0.8 },
        current: false
    },
    'balanced': {
        name: 'Balanced Caching',
        description: 'Moderate caching with balanced performance and storage',
        settings: { retentionDays: 30, minConfidence: 0.7, similarityThreshold: 0.7 },
        current: true
    },
    'conservative': {
        name: 'Conservative Caching',
        description: 'Minimal caching, lower memory usage, stricter quality',
        settings: { retentionDays: 14, minConfidence: 0.8, similarityThreshold: 0.6 },
        current: false
    }
};

class GovernanceService {
    constructor() {
        this.parameters = { ...GOVERNANCE_PARAMETERS };
        this.models = { ...AVAILABLE_MODELS };
        this.cachePolicies = { ...CACHE_POLICIES };
        this.votes = {};
        this.proposals = {};
        this.modelProposals = {};
        this.policyProposals = {};
        this.loadData();
    }

    loadData() {
        try {
            // Load governance state
            if (fs.existsSync(GOVERNANCE_FILE)) {
                const data = JSON.parse(fs.readFileSync(GOVERNANCE_FILE, 'utf8'));
                this.parameters = { ...this.parameters, ...data.parameters };
                this.models = { ...this.models, ...data.models };
                this.cachePolicies = { ...this.cachePolicies, ...data.cachePolicies };
                this.proposals = data.proposals || {};
                this.modelProposals = data.modelProposals || {};
                this.policyProposals = data.policyProposals || {};
            }

            // Load votes
            if (fs.existsSync(VOTES_FILE)) {
                this.votes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf8'));
            }
        } catch (error) {
            console.error('Failed to load governance data:', error);
        }
    }

    saveData() {
        try {
            const dataDir = path.dirname(GOVERNANCE_FILE);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            fs.writeFileSync(GOVERNANCE_FILE, JSON.stringify({
                parameters: this.parameters,
                models: this.models,
                cachePolicies: this.cachePolicies,
                proposals: this.proposals,
                modelProposals: this.modelProposals,
                policyProposals: this.policyProposals,
                lastUpdated: new Date().toISOString()
            }, null, 2));

            fs.writeFileSync(VOTES_FILE, JSON.stringify(this.votes, null, 2));
        } catch (error) {
            console.error('Failed to save governance data:', error);
        }
    }

    // Generate a unique voter ID (in production, this would be cryptographic)
    generateVoterId(identifier) {
        return crypto.createHash('sha256')
            .update(identifier + Date.now().toString())
            .digest('hex')
            .substring(0, 16);
    }

    // Create a new proposal for parameter change
    createProposal(parameterKey, proposedValue, proposerId, reason = '') {
        if (!this.parameters[parameterKey]) {
            throw new Error('Invalid parameter key');
        }

        if (!this.parameters[parameterKey].options.includes(proposedValue)) {
            throw new Error('Proposed value not in allowed options');
        }

        const proposalId = crypto.randomUUID();
        this.proposals[proposalId] = {
            id: proposalId,
            parameterKey,
            currentValue: this.parameters[parameterKey].current,
            proposedValue,
            proposerId,
            reason,
            createdAt: new Date().toISOString(),
            votes: { yes: 0, no: 0 },
            voters: new Set(),
            status: 'active', // active, passed, rejected, implemented
            votingEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        };

        this.saveData();
        return this.proposals[proposalId];
    }

    // Vote on a proposal
    voteOnProposal(proposalId, voterId, vote) {
        if (!this.proposals[proposalId]) {
            throw new Error('Proposal not found');
        }

        const proposal = this.proposals[proposalId];

        if (proposal.status !== 'active') {
            throw new Error('Proposal is not active');
        }

        if (new Date() > new Date(proposal.votingEndsAt)) {
            proposal.status = 'expired';
            this.saveData();
            throw new Error('Voting period has ended');
        }

        if (proposal.voters.has(voterId)) {
            throw new Error('Voter has already voted on this proposal');
        }

        if (!['yes', 'no'].includes(vote)) {
            throw new Error('Invalid vote. Must be "yes" or "no"');
        }

        // Record the vote
        if (!this.votes[voterId]) {
            this.votes[voterId] = {};
        }

        this.votes[voterId][proposalId] = {
            vote,
            timestamp: new Date().toISOString()
        };

        proposal.votes[vote]++;
        proposal.voters.add(voterId);

        // Check if proposal passes (simple majority for now)
        const totalVotes = proposal.votes.yes + proposal.votes.no;
        if (totalVotes >= 3) { // Minimum votes required
            if (proposal.votes.yes > proposal.votes.no) {
                proposal.status = 'passed';
                this.implementProposal(proposalId);
            } else {
                proposal.status = 'rejected';
            }
        }

        this.saveData();
        return proposal;
    }

    // Implement a passed proposal
    implementProposal(proposalId) {
        const proposal = this.proposals[proposalId];
        if (proposal.status !== 'passed') {
            throw new Error('Proposal has not passed');
        }

        // Update the parameter
        this.parameters[proposal.parameterKey].current = proposal.proposedValue;
        proposal.status = 'implemented';
        proposal.implementedAt = new Date().toISOString();

        console.log(`✅ Governance: ${proposal.parameterKey} updated to ${proposal.proposedValue}`);
        this.saveData();
    }

    // Get governance state including models and policies
    getGovernanceState() {
        const activeProposals = Object.values(this.proposals)
            .filter(p => p.status === 'active')
            .map(p => ({
                ...p,
                voters: Array.from(p.voters),
                timeRemaining: Math.max(0, new Date(p.votingEndsAt) - Date.now())
            }));

        const activeModelProposals = Object.values(this.modelProposals)
            .filter(p => p.status === 'active')
            .map(p => ({
                ...p,
                voters: Array.from(p.voters),
                timeRemaining: Math.max(0, new Date(p.votingEndsAt) - Date.now())
            }));

        const activePolicyProposals = Object.values(this.policyProposals)
            .filter(p => p.status === 'active')
            .map(p => ({
                ...p,
                voters: Array.from(p.voters),
                timeRemaining: Math.max(0, new Date(p.votingEndsAt) - Date.now())
            }));

        return {
            parameters: this.parameters,
            models: this.models,
            cachePolicies: this.cachePolicies,
            activeProposals,
            activeModelProposals,
            activePolicyProposals,
            totalProposals: Object.keys(this.proposals).length + Object.keys(this.modelProposals).length + Object.keys(this.policyProposals).length,
            totalVotes: Object.keys(this.votes).length
        };
    }

    // Get voting history for a voter
    getVoterHistory(voterId) {
        if (!this.votes[voterId]) {
            return [];
        }

        return Object.entries(this.votes[voterId]).map(([proposalId, voteData]) => ({
            proposalId,
            proposal: this.proposals[proposalId],
            vote: voteData.vote,
            timestamp: voteData.timestamp
        }));
    }

    // Get proposal details
    getProposal(proposalId) {
        const proposal = this.proposals[proposalId];
        if (!proposal) {
            throw new Error('Proposal not found');
        }

        return {
            ...proposal,
            voters: Array.from(proposal.voters),
            totalVotes: proposal.votes.yes + proposal.votes.no
        };
    }

    // Get governance statistics
    getStatistics() {
        const allProposals = Object.values(this.proposals);
        const stats = {
            totalProposals: allProposals.length,
            activeProposals: allProposals.filter(p => p.status === 'active').length,
            passedProposals: allProposals.filter(p => p.status === 'passed' || p.status === 'implemented').length,
            rejectedProposals: allProposals.filter(p => p.status === 'rejected').length,
            implementedChanges: allProposals.filter(p => p.status === 'implemented').length,
            totalVotes: Object.keys(this.votes).length,
            voterParticipation: Object.keys(this.votes).length
        };

        return stats;
    }
}

export default GovernanceService;
export { GOVERNANCE_PARAMETERS };
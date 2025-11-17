"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const governance_1 = require("../../src/governance/governance");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Mock wallet for testing
const mockWallet = {
    publicKey: new web3_js_1.PublicKey('11111111111111111111111111111112'),
    signTransaction: async (tx) => tx
};
async function submitBootstrapProposals() {
    const governance = new governance_1.GovernanceService();
    // Load proposal templates
    const roadmapTemplatePath = path_1.default.join(__dirname, '..', '..', 'docs', 'proposals', 'roadmap-priorities-template.md');
    const workingGroupTemplatePath = path_1.default.join(__dirname, '..', '..', 'docs', 'proposals', 'working-group-formation-template.md');
    try {
        // Read roadmap priorities template
        const roadmapContent = fs_1.default.readFileSync(roadmapTemplatePath, 'utf8');
        const roadmapTitle = 'Q1-Q2 Roadmap Priorities for NeuroSwarm Development';
        const roadmapDescription = roadmapContent; // Use full template as description
        // Submit roadmap proposal
        console.log('Submitting roadmap priorities proposal...');
        const roadmapId = await governance.submitProposal(mockWallet, roadmapTitle, roadmapDescription, 'Strategic', [
            'https://getblockchain.tech/neuroswarm/docs/roadmap',
            'https://getblockchain.tech/neuroswarm/docs/governance-charter'
        ], ['roadmap', 'priorities', 'q1-2024', 'q2-2024', 'strategic']);
        console.log(`Roadmap proposal submitted with ID: ${roadmapId}`);
        // Read working group template
        const workingGroupContent = fs_1.default.readFileSync(workingGroupTemplatePath, 'utf8');
        const workingGroupTitle = 'Establish Core Working Groups for NeuroSwarm Governance';
        const workingGroupDescription = workingGroupContent; // Use full template as description
        // Submit working group proposal
        console.log('Submitting working group formation proposal...');
        const workingGroupId = await governance.submitProposal(mockWallet, workingGroupTitle, workingGroupDescription, 'Governance', [
            'https://getblockchain.tech/neuroswarm/docs/working-groups',
            'https://getblockchain.tech/neuroswarm/docs/governance-charter',
            'https://getblockchain.tech/neuroswarm/docs/contributor-recognition'
        ], ['working-groups', 'governance', 'organization', 'community']);
        console.log(`Working group proposal submitted with ID: ${workingGroupId}`);
        console.log('✅ Bootstrap proposals submitted successfully!');
        console.log('Proposal IDs:', { roadmapId, workingGroupId });
    }
    catch (error) {
        console.error('❌ Failed to submit bootstrap proposals:', error);
    }
}
// Run the script
submitBootstrapProposals();
//# sourceMappingURL=submit-bootstrap-proposals.js.map
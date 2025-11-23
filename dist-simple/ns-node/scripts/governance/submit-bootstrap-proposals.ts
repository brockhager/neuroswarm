import { Transaction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import { GovernanceService } from '../../src/governance/governance';
import fs from 'fs';
import path from 'path';

// Mock wallet for testing
const mockWallet = {
  publicKey: new PublicKey('11111111111111111111111111111112'),
  signTransaction: async (tx: Transaction) => tx
};

async function submitBootstrapProposals() {
  const governance = new GovernanceService();

  // Load proposal templates
  const roadmapTemplatePath = path.join(__dirname, '..', '..', 'docs', 'proposals', 'roadmap-priorities-template.md');
  const workingGroupTemplatePath = path.join(__dirname, '..', '..', 'docs', 'proposals', 'working-group-formation-template.md');

  try {
    // Read roadmap priorities template
    const roadmapContent = fs.readFileSync(roadmapTemplatePath, 'utf8');
    const roadmapTitle = 'Q1-Q2 Roadmap Priorities for NeuroSwarm Development';
    const roadmapDescription = roadmapContent; // Use full template as description

    // Submit roadmap proposal
    console.log('Submitting roadmap priorities proposal...');
    const roadmapId = await governance.submitProposal(
      mockWallet,
      roadmapTitle,
      roadmapDescription,
      'Strategic',
      [
        'https://getblockchain.tech/neuroswarm/docs/roadmap',
        'https://getblockchain.tech/neuroswarm/docs/governance-charter'
      ],
      ['roadmap', 'priorities', 'q1-2024', 'q2-2024', 'strategic']
    );
    console.log(`Roadmap proposal submitted with ID: ${roadmapId}`);

    // Read working group template
    const workingGroupContent = fs.readFileSync(workingGroupTemplatePath, 'utf8');
    const workingGroupTitle = 'Establish Core Working Groups for NeuroSwarm Governance';
    const workingGroupDescription = workingGroupContent; // Use full template as description

    // Submit working group proposal
    console.log('Submitting working group formation proposal...');
    const workingGroupId = await governance.submitProposal(
      mockWallet,
      workingGroupTitle,
      workingGroupDescription,
      'Governance',
      [
        'https://getblockchain.tech/neuroswarm/docs/working-groups',
        'https://getblockchain.tech/neuroswarm/docs/governance-charter',
        'https://getblockchain.tech/neuroswarm/docs/contributor-recognition'
      ],
      ['working-groups', 'governance', 'organization', 'community']
    );
    console.log(`Working group proposal submitted with ID: ${workingGroupId}`);

    console.log('✅ Bootstrap proposals submitted successfully!');
    console.log('Proposal IDs:', { roadmapId, workingGroupId });

  } catch (error) {
    console.error('❌ Failed to submit bootstrap proposals:', error);
  }
}

// Run the script
submitBootstrapProposals();
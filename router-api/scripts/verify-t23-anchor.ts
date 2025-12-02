require('dotenv').config(); // Load .env for local testing

import { anchorAudit } from '../src/services/audit-anchoring';

// Ensure the necessary environment variables are set for a live run
if (!process.env.SOLANA_RPC_URL || process.env.SOLANA_RPC_URL === 'mock') {
  console.error('Error: SOLANA_RPC_URL must be set for T23 live verification.');
  process.exit(1);
}
if (!process.env.ROUTER_PRIVATE_KEY && !process.env.SOLANA_SIGNER_KEY) {
  console.error('Error: ROUTER_PRIVATE_KEY or SOLANA_SIGNER_KEY must be set for T23 live verification.');
  process.exit(1);
}

// Regex to check for a valid Solana transaction signature (base58, 87-88 chars)
const SOLANA_SIG_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

async function runT23Verification() {
  console.log(`Starting T23 Live Audit Anchoring Test against: ${process.env.SOLANA_RPC_URL}`);

  const testEvent = {
    event_type: 'CI_GOVERNANCE_TEST',
    timestamp: new Date().toISOString(),
    triggering_job_ids: ['CI_T23_JOB_001'],
    details: 'Automated CI test for on-chain audit anchoring.',
    metadata: { ci_run_id: process.env.GITHUB_RUN_ID || 'local' }
  };

  try {
    const result = await anchorAudit(testEvent as any);

    console.log('\n--- T23 Verification Results ---');
    console.log(`Audit Hash: ${result.audit_hash}`);
    console.log(`IPFS CID (Mock/Real): ${result.ipfs_cid}`);
    console.log(`TX Signature: ${result.transaction_signature}`);
    console.log(`Notified Governance: ${result.governance_notified}`);

    if (!result.transaction_signature || result.transaction_signature.startsWith('mock_tx_') || !SOLANA_SIG_REGEX.test(result.transaction_signature)) {
      throw new Error(`Anchoring failed. Expected a real Solana signature, got: ${result.transaction_signature}`);
    }

    console.log('\n✅ T23 Live Anchor Success: Real Solana TX Signature retrieved.');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ T23 Live Anchor Failure:', error?.message || error);
    process.exit(2);
  }
}

runT23Verification();

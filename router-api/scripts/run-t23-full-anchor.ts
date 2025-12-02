import { config } from 'dotenv';
import { anchorAudit, AuditAnchorResult } from '../src/services/audit-anchoring';
import { PublicKey } from '@solana/web3.js';
import * as path from 'path';

// Load .env file from the root directory for local runs
config({ path: path.resolve(process.cwd(), '.env') });

// --- Configuration Validation ---
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL;
const ROUTER_PRIVATE_KEY = process.env.ROUTER_PRIVATE_KEY || process.env.SOLANA_SIGNER_KEY;
const IPFS_API_URL = process.env.IPFS_API_URL;

if (!SOLANA_RPC_URL || SOLANA_RPC_URL === 'mock') {
  console.error("❌ Error: SOLANA_RPC_URL must be set to a real Devnet endpoint.");
  process.exit(1);
}
if (!ROUTER_PRIVATE_KEY) {
  console.error("❌ Error: ROUTER_PRIVATE_KEY/SOLANA_SIGNER_KEY must be set.");
  process.exit(1);
}
if (!IPFS_API_URL || IPFS_API_URL === 'mock') {
  console.error("❌ Error: IPFS_API_URL must be set to a real pinning service endpoint.");
  process.exit(1);
}

// --- Verification Regexes ---
const SOLANA_SIG_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
// Simple check for Qm/bafy CID format
const IPFS_CID_REGEX = /^(Qm|bafy)/;

async function runT23FullAnchorTest() {
  console.log(`\n======================================================`);
  console.log(`🚀 T23 FULL ANCHOR PRE-FLIGHT (Devnet + Real IPFS) 🚀`);
  console.log(`======================================================`);
  console.log(`RPC Target: ${SOLANA_RPC_URL}`);
  console.log(`IPFS Target: ${IPFS_API_URL}`);
  
  const testEvent = {
    event_type: 'T23_PREFLIGHT_TEST',
    timestamp: new Date().toISOString(),
    triggering_job_ids: ['CI_T23_FULL_001'],
    details: 'Final pre-flight validation of resilient pin-then-anchor flow.',
    metadata: { 
      ci_run_id: process.env.GITHUB_RUN_ID || 'local_preflight',
      signer_pubkey: (() => {
        try {
          const key = JSON.parse(ROUTER_PRIVATE_KEY);
          // key is secret key array; derive pubkey from last 32 bytes
          return new PublicKey(Uint8Array.from(key.slice(32))).toBase58();
        } catch (e) {
          return 'unknown';
        }
      })()
    }
  };

  let result: AuditAnchorResult;
  try {
    // EXECUTE the hardened, resilient T23 flow
    result = await anchorAudit(testEvent as any);

    console.log('\n--- T23 Verification Results ---');
    console.log(`Audit Hash (SHA-256): ${result.audit_hash}`);
    console.log(`IPFS CID (Payload): ${result.ipfs_cid}`);
    console.log(`TX Signature (On-Chain): ${result.transaction_signature}`);
    console.log(`Governance Notified: ${result.governance_notified}`);

    // --- ASSERTIONS ---
    let success = true;

    // 1. Assert IPFS CID is real (not mock)
    if (!IPFS_CID_REGEX.test(result.ipfs_cid) || result.ipfs_cid.length < 40 || result.ipfs_cid.startsWith('Qm' + result.audit_hash.substring(0, 44))) {
        console.error(`❌ ASSERTION FAILED: IPFS CID is invalid or looks like a mock.`);
        success = false;
    } else {
        console.log("✅ IPFS CID looks valid.");
    }

    // 2. Assert TX Signature is real (not mock)
    if (!SOLANA_SIG_REGEX.test(result.transaction_signature || '') || (result.transaction_signature || '').startsWith('mock_tx_')) {
      console.error(`❌ ASSERTION FAILED: Expected a real Solana signature, got: ${result.transaction_signature}`);
      success = false;
    } else {
      console.log("✅ Solana TX Signature looks valid.");
      console.log(`   Explorer Link: https://explorer.solana.com/tx/${result.transaction_signature}?cluster=devnet`);
    }

    if (success) {
      console.log(`\n🎉 T23 FULL ANCHOR PRE-FLIGHT PASSED. The system is ready for gated CI.`);
      process.exit(0);
    } else {
      throw new Error("T23 Full Anchor Pre-flight failed one or more assertions.");
    }

  } catch (error: any) {
    console.error(`\n======================================================`);
    console.error(`❌ T23 FULL ANCHOR PRE-FLIGHT FAILURE:`, error.message);
    console.error(`======================================================`);
    process.exit(1);
  }
}

runT23FullAnchorTest();

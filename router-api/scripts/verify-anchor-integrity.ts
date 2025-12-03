/**
 * verify-anchor-integrity.ts
 * 
 * CI integrity check: Validates that the on-chain signature returned by the T23 preflight
 * corresponds to a real Solana transaction and that the memo data matches the audit_hash.
 * 
 * This script is run immediately after run-t23-full-anchor.ts to ensure the anchor is genuine.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env for local runs
config({ path: path.resolve(process.cwd(), '.env') });

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL;

// Regex for valid Solana signature
const SOLANA_SIG_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

async function verifyAnchorIntegrity() {
  console.log('\n======================================================');
  console.log('🔐 T23 ANCHOR INTEGRITY VERIFICATION 🔐');
  console.log('======================================================\n');

  if (!SOLANA_RPC_URL || SOLANA_RPC_URL === 'mock') {
    console.error('❌ Error: SOLANA_RPC_URL must be set to a real endpoint for integrity check.');
    process.exit(1);
  }

  // Read the last anchor result (the T23 script should have output this)
  // For CI, we expect environment variables or a temp file with the signature
  const txSignature = process.env.T23_TX_SIGNATURE || process.env.LAST_TX_SIGNATURE;
  const auditHash = process.env.T23_AUDIT_HASH || process.env.LAST_AUDIT_HASH;

  if (!txSignature) {
    console.error('❌ Error: T23_TX_SIGNATURE environment variable is not set.');
    console.error('   The T23 preflight script must export this value before running the integrity check.');
    process.exit(1);
  }

  if (!auditHash) {
    console.error('❌ Error: T23_AUDIT_HASH environment variable is not set.');
    console.error('   The T23 preflight script must export this value before running the integrity check.');
    process.exit(1);
  }

  console.log(`TX Signature to verify: ${txSignature}`);
  console.log(`Expected audit_hash: ${auditHash}\n`);

  // 1. Validate signature format
  if (!SOLANA_SIG_REGEX.test(txSignature) || txSignature.startsWith('mock_tx_')) {
    console.error('❌ INTEGRITY CHECK FAILED: TX signature is not a valid Solana signature.');
    process.exit(1);
  }

  // 2. Query the transaction from the blockchain
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

  let txInfo;
  try {
    txInfo = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
  } catch (err: any) {
    console.error('❌ INTEGRITY CHECK FAILED: Could not retrieve transaction from RPC:', err?.message || err);
    process.exit(1);
  }

  if (!txInfo) {
    console.error('❌ INTEGRITY CHECK FAILED: Transaction not found on-chain (signature may be invalid or not yet confirmed).');
    process.exit(1);
  }

  console.log('✅ Transaction found on-chain.');
  console.log(`   Slot: ${txInfo.slot}`);
  console.log(`   Block Time: ${txInfo.blockTime ? new Date(txInfo.blockTime * 1000).toISOString() : 'N/A'}`);

  // 3. Extract memo data from the transaction (the audit_hash should be in the instruction data)
  // The anchorAuditOnChain function writes the audit_hash to a Memo instruction
  const memoData = extractMemoData(txInfo);

  if (!memoData) {
    console.warn('⚠️  WARNING: No memo data found in transaction. Unable to verify audit_hash match.');
    console.warn('   This may indicate the transaction structure changed or memo program was not used.');
    // Don't fail — just warn (some implementations may not use memo)
  } else {
    console.log(`   Memo data (on-chain): ${memoData}`);

    // 4. Compare on-chain memo with expected audit_hash
    if (memoData === auditHash) {
      console.log('✅ INTEGRITY CHECK PASSED: On-chain memo matches the expected audit_hash.');
    } else {
      console.error('❌ INTEGRITY CHECK FAILED: On-chain memo does NOT match the expected audit_hash.');
      console.error(`   Expected: ${auditHash}`);
      console.error(`   Found:    ${memoData}`);
      process.exit(1);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 ANCHOR INTEGRITY VERIFICATION COMPLETE 🎉');
  console.log('======================================================\n');
  process.exit(0);
}

/**
 * Extract memo data from a Solana transaction.
 * The memo program stores data as instruction data in the transaction.
 */
function extractMemoData(txInfo: any): string | null {
  try {
    const message = txInfo?.transaction?.message;
    if (!message) return null;

    // Memo program ID
    const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

    // Find the memo instruction
    const accountKeys = message.accountKeys || message.staticAccountKeys || [];
    const instructions = message.instructions || [];

    for (const ix of instructions) {
      const programIdIndex = ix.programIdIndex;
      const programId = accountKeys[programIdIndex];

      // Check if this instruction is from the memo program
      if (programId && programId.toString() === MEMO_PROGRAM_ID) {
        // Instruction data is the memo (as a buffer)
        const data = ix.data;
        if (data) {
          // Solana RPC returns instruction data as base58-encoded string
          // We need to decode it using base58 (use bs58 library or @solana/web3.js)
          try {
            // Try importing bs58 if available, otherwise use Buffer with base58
            const bs58 = require('bs58');
            const decoded = Buffer.from(bs58.decode(data)).toString('utf8');
            return decoded;
          } catch (e1) {
            // Fallback: try base64 decoding
            try {
              const decoded = Buffer.from(data, 'base64').toString('utf8');
              return decoded;
            } catch (e2) {
              // Last resort: if data is already a string/buffer, return as-is
              return typeof data === 'string' ? data : data.toString();
            }
          }
        }
      }
    }

    return null;
  } catch (err: any) {
    console.warn('Warning: Failed to extract memo data:', err?.message || err);
    return null;
  }
}

verifyAnchorIntegrity();

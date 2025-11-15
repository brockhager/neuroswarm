#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

// Load environment variables
require('dotenv').config();

interface AnchorFingerprint {
  action: string;
  fingerprints: Record<string, string>;
  algo: string;
  format: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/**
 * Convert PEM to DER format for consistent hashing
 */
function pemToDer(pemContent: string): Buffer {
  const base64 = pemContent
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s/g, '');
  return Buffer.from(base64, 'base64');
}

/**
 * Compute SHA-256 hash of DER-encoded key
 */
function computeSha256(derBuffer: Buffer): string {
  return crypto.createHash('sha256').update(derBuffer).digest('hex');
}

/**
 * Load and validate a key file
 */
function loadKeyFile(filePath: string, description: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('-----BEGIN')) {
    throw new Error(`${description} is not in valid PEM format`);
  }
  return content;
}

/**
 * Load and validate config file
 */
function loadConfigFile(filePath: string, description: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    JSON.parse(content);
  } catch (error) {
    throw new Error(`${description} is not valid JSON: ${error}`);
  }
  return content;
}

/**
 * Generate local fingerprints for genesis verification
 */
function generateLocalGenesisFingerprints(): Record<string, string> {
  console.log('🔐 Generating local genesis fingerprints...\n');

  const founderPubPath = path.resolve(process.env.FOUNDER_PUBLIC_KEY_PATH!);
  const adminPubPath = path.resolve(process.env.FOUNDER_PUBLIC_KEY_PATH!.replace('founder.jwt.pub', 'admin-node.jwt.pub'));
  const genesisPath = path.resolve(process.cwd(), '..', process.env.GENESIS_CONFIG_PATH!.replace(/^\//, ''));

  console.log('Loading local files:');
  console.log(`  Founder public key: ${founderPubPath}`);
  console.log(`  Admin public key: ${adminPubPath}`);
  console.log(`  Genesis config: ${genesisPath}\n`);

  const founderPubPem = loadKeyFile(founderPubPath, 'Founder public key');
  const adminPubPem = loadKeyFile(adminPubPath, 'Admin public key');
  const genesisJson = loadConfigFile(genesisPath, 'Genesis config');

  const founderDer = pemToDer(founderPubPem);
  const adminDer = pemToDer(adminPubPem);
  const genesisDer = Buffer.from(genesisJson, 'utf8');

  const fingerprints = {
    founder_pub_sha256: computeSha256(founderDer),
    admin_pub_sha256: computeSha256(adminDer),
    genesis_sha256: computeSha256(genesisDer)
  };

  console.log('Local fingerprints:');
  Object.entries(fingerprints).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log();

  return fingerprints;
}

/**
 * Generate local fingerprints for key rotation verification
 */
function generateLocalKeyRotationFingerprints(newKeyPath: string, oldKeyPath: string): Record<string, string> {
  console.log('🔄 Generating local key rotation fingerprints...\n');

  const newKeyPem = loadKeyFile(newKeyPath, 'New key');
  const oldKeyPem = loadKeyFile(oldKeyPath, 'Old key');

  const newKeyDer = pemToDer(newKeyPem);
  const oldKeyDer = pemToDer(oldKeyPem);

  const fingerprints = {
    new_key_sha256: computeSha256(newKeyDer),
    old_key_sha256: computeSha256(oldKeyDer)
  };

  console.log('Local key rotation fingerprints:');
  Object.entries(fingerprints).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log();

  return fingerprints;
}

/**
 * Generate local fingerprints for policy update verification
 */
function generateLocalPolicyFingerprints(policyPath: string): Record<string, string> {
  console.log('📋 Generating local policy fingerprints...\n');

  const policyContent = loadConfigFile(policyPath, 'Policy config');
  const policyDer = Buffer.from(policyContent, 'utf8');

  const fingerprints = {
    policy_sha256: computeSha256(policyDer)
  };

  console.log('Local policy fingerprints:');
  console.log(`  policy_sha256: ${fingerprints.policy_sha256}\n`);

  return fingerprints;
}

/**
 * Fetch memo from Solana transaction
 */
function fetchMemoFromTransaction(txSignature: string): AnchorFingerprint | null {
  console.log(`📡 Fetching memo from transaction: ${txSignature}\n`);

  try {
    const command = `solana confirm ${txSignature} --output json`;
    const output = execSync(command, { encoding: 'utf8' });

    const txData = JSON.parse(output);

    if (txData && txData.transaction && txData.transaction.message) {
      const instructions = txData.transaction.message.instructions;

      for (const instruction of instructions) {
        if (instruction.programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
          const memoData = Buffer.from(instruction.data, 'base64').toString('utf8');
          console.log('Found memo data:', memoData);

          try {
            const memoJson = JSON.parse(memoData);
            return memoJson as AnchorFingerprint;
          } catch (error) {
            console.log('Memo data is not valid JSON');
            return null;
          }
        }
      }
    }

    console.log('No memo found in transaction');
    return null;

  } catch (error) {
    console.error('Failed to fetch transaction:', error);
    return null;
  }
}

/**
 * Compare fingerprints and return detailed results
 */
function compareFingerprints(local: Record<string, string>, blockchain: Record<string, string> | null, anchorType: string): { passed: boolean; results: Array<{ name: string; passed: boolean; local: string; blockchain: string }> } {
  console.log(`🔍 Comparing ${anchorType} fingerprints...\n`);

  if (!blockchain) {
    console.log('❌ No blockchain fingerprints found');
    return { passed: false, results: [] };
  }

  const results = Object.keys(local).map(key => {
    const localValue = local[key];
    const blockchainValue = blockchain[key];
    const passed = localValue === blockchainValue;

    return {
      name: key,
      passed,
      local: localValue,
      blockchain: blockchainValue || 'NOT_FOUND'
    };
  });

  const passed = results.every(result => result.passed);

  console.log(`${anchorType.toUpperCase()} Fingerprint Comparison:`);
  console.log('=====================================');

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}:`);
    console.log(`    Local:      ${result.local}`);
    console.log(`    Blockchain: ${result.blockchain}`);
    console.log(`    Match:      ${result.passed}`);
    console.log();
  });

  return { passed, results };
}

/**
 * Main verification execution
 */
function main() {
  try {
    console.log('🔍 NeuroSwarm Governance Verification Tool');
    console.log('===========================================\n');

    const txSignature = process.argv[2];
    const anchorType = process.argv[3] || 'genesis';

    if (!txSignature) {
      console.log('Usage: npm run verify-governance <TRANSACTION_SIGNATURE> [ANCHOR_TYPE] [OPTIONS]');
      console.log();
      console.log('Available anchor types:');
      console.log('  genesis          - Verify founder keys and genesis config');
      console.log('  key-rotation     - Verify key rotation (requires --new-key and --old-key)');
      console.log('  policy-update    - Verify policy update (requires --policy-file)');
      console.log();
      console.log('Examples:');
      console.log('  npm run verify-governance 5xHx5Y... genesis');
      console.log('  npm run verify-governance 5xHx5Y... key-rotation --new-key=./new-key.pem --old-key=./old-key.pem');
      console.log('  npm run verify-governance 5xHx5Y... policy-update --policy-file=./policy.json');
      console.log();
      console.log('The transaction signature can be found in the governance logs after anchoring.');
      process.exit(1);
    }

    // Generate local fingerprints based on anchor type
    let localFingerprints: Record<string, string>;
    let anchorTypeDisplay: string;

    switch (anchorType) {
      case 'genesis':
        localFingerprints = generateLocalGenesisFingerprints();
        anchorTypeDisplay = 'Genesis';
        break;

      case 'key-rotation': {
        const newKeyPath = process.argv.find(arg => arg.startsWith('--new-key='))?.split('=')[1];
        const oldKeyPath = process.argv.find(arg => arg.startsWith('--old-key='))?.split('=')[1];

        if (!newKeyPath || !oldKeyPath) {
          console.log('❌ Key rotation verification requires --new-key and --old-key parameters');
          process.exit(1);
        }

        localFingerprints = generateLocalKeyRotationFingerprints(newKeyPath, oldKeyPath);
        anchorTypeDisplay = 'Key Rotation';
        break;
      }

      case 'policy-update': {
        const policyPath = process.argv.find(arg => arg.startsWith('--policy-file='))?.split('=')[1];

        if (!policyPath) {
          console.log('❌ Policy update verification requires --policy-file parameter');
          process.exit(1);
        }

        localFingerprints = generateLocalPolicyFingerprints(policyPath);
        anchorTypeDisplay = 'Policy Update';
        break;
      }

      default:
        console.log(`❌ Unknown anchor type: ${anchorType}`);
        process.exit(1);
    }

    // Fetch blockchain fingerprints
    const blockchainAnchor = fetchMemoFromTransaction(txSignature);

    if (!blockchainAnchor) {
      console.log('❌ Could not retrieve anchor data from blockchain');
      process.exit(1);
    }

    // Verify anchor type matches
    if (blockchainAnchor.action !== anchorType) {
      console.log(`❌ Anchor type mismatch!`);
      console.log(`    Expected: ${anchorType}`);
      console.log(`    Found:    ${blockchainAnchor.action}`);
      process.exit(1);
    }

    // Compare fingerprints
    const comparison = compareFingerprints(localFingerprints, blockchainAnchor.fingerprints, anchorTypeDisplay);

    console.log('🎯 Verification Result:');
    console.log('======================');

    if (comparison.passed) {
      console.log('✅ SUCCESS: All fingerprints match!');
      console.log(`   NeuroSwarm ${anchorTypeDisplay.toLowerCase()} integrity verified.`);
      console.log('   Governance action is authentic and properly anchored.');
    } else {
      console.log('❌ FAILURE: Fingerprint mismatch detected!');
      console.log('   This may indicate tampering or incorrect configuration.');
      console.log('   Please contact the NeuroSwarm team for assistance.');
      process.exit(1);
    }

    // Additional metadata display
    if (blockchainAnchor.metadata) {
      console.log('\n📋 Anchor Metadata:');
      console.log(JSON.stringify(blockchainAnchor.metadata, null, 2));
    }

  } catch (error) {
    console.error('❌ Error during governance verification:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export {
  generateLocalGenesisFingerprints,
  generateLocalKeyRotationFingerprints,
  generateLocalPolicyFingerprints,
  fetchMemoFromTransaction,
  compareFingerprints
};
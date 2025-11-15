#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

// Load environment variables
require('dotenv').config();

interface AnchorData {
  action: string;
  fingerprints: Record<string, string>;
  algo: string;
  format: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface GovernanceLogEntry {
  timestamp: string;
  action: string;
  actor: string;
  details: {
    tx_signature?: string;
    memo_content: string;
    blockchain: string;
    purpose: string;
    anchor_type: string;
    fingerprints: Record<string, string>;
  };
  signature?: string;
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
 * Generate fingerprints for genesis anchoring
 */
function generateGenesisFingerprints(): Record<string, string> {
  console.log('🏛️ Generating genesis fingerprints...\n');

  const founderPubPath = path.resolve(process.env.FOUNDER_PUBLIC_KEY_PATH!);
  const adminPubPath = path.resolve(process.env.FOUNDER_PUBLIC_KEY_PATH!.replace('founder.jwt.pub', 'admin-node.jwt.pub'));
  const genesisPath = path.resolve(process.cwd(), '..', process.env.GENESIS_CONFIG_PATH!.replace(/^\//, ''));

  console.log('Loading files:');
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

  console.log('Fingerprints computed:');
  Object.entries(fingerprints).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log();

  return fingerprints;
}

/**
 * Generate fingerprints for key rotation
 */
function generateKeyRotationFingerprints(newKeyPath: string, oldKeyPath: string): Record<string, string> {
  console.log('🔄 Generating key rotation fingerprints...\n');

  const newKeyPem = loadKeyFile(newKeyPath, 'New key');
  const oldKeyPem = loadKeyFile(oldKeyPath, 'Old key');

  const newKeyDer = pemToDer(newKeyPem);
  const oldKeyDer = pemToDer(oldKeyPem);

  const fingerprints = {
    new_key_sha256: computeSha256(newKeyDer),
    old_key_sha256: computeSha256(oldKeyDer)
  };

  console.log('Key rotation fingerprints:');
  Object.entries(fingerprints).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log();

  return fingerprints;
}

/**
 * Generate fingerprints for policy update
 */
function generatePolicyUpdateFingerprints(policyPath: string): Record<string, string> {
  console.log('📋 Generating policy update fingerprints...\n');

  const policyContent = loadConfigFile(policyPath, 'Policy config');
  const policyDer = Buffer.from(policyContent, 'utf8');

  const fingerprints = {
    policy_sha256: computeSha256(policyDer)
  };

  console.log('Policy fingerprints:');
  console.log(`  policy_sha256: ${fingerprints.policy_sha256}\n`);

  return fingerprints;
}

/**
 * Anchor data to Solana blockchain using SPL Memo
 */
function anchorToSolana(anchorData: AnchorData): string {
  console.log('⛓️ Preparing blockchain anchoring...\n');

  const memoContent = JSON.stringify({
    action: anchorData.action,
    fingerprints: anchorData.fingerprints,
    algo: anchorData.algo,
    format: anchorData.format,
    timestamp: anchorData.timestamp,
    ...(anchorData.metadata && { metadata: anchorData.metadata })
  });

  console.log('Memo content:');
  console.log(memoContent);
  console.log();

  let solanaAvailable = false;
  try {
    execSync('solana --version', { stdio: 'pipe' });
    solanaAvailable = true;
  } catch (error) {
    console.log('⚠️  Solana CLI not found on this system.');
    console.log('   To complete blockchain anchoring, install Solana CLI:');
    console.log('   https://docs.solana.com/cli/install-solana-cli-tools');
    console.log();
  }

  if (solanaAvailable) {
    console.log('Checking Solana configuration...');
    try {
      const configOutput = execSync('solana config get', { encoding: 'utf8' });
      console.log(configOutput);
    } catch (error) {
      console.log('⚠️  Solana config not found. Please configure:');
      console.log('   solana config set --url https://api.mainnet-beta.solana.com');
      console.log();
    }
  }

  console.log('📝 MANUAL STEP REQUIRED:');
  console.log('Execute this command with your funded Solana account:');
  console.log(`solana transfer --allow-unfunded-recipient --memo "${memoContent}" <FOUNDER_KEYPAIR> <RECIPIENT> 0.000000001`);
  console.log();
  console.log('Replace:');
  console.log('  <FOUNDER_KEYPAIR> with your keypair path (e.g., ~/.config/solana/id.json)');
  console.log('  <RECIPIENT> with any valid Solana address (e.g., your own address)');
  console.log('The transaction will be recorded on-chain with the governance action.');
  console.log();

  return 'MANUAL_EXECUTION_REQUIRED';
}

/**
 * Log anchoring action to governance logs
 */
function logAnchoring(txSignature: string, anchorData: AnchorData): void {
  const logEntry: GovernanceLogEntry = {
    timestamp: new Date().toISOString(),
    action: anchorData.action,
    actor: 'founder',
    details: {
      tx_signature: txSignature,
      memo_content: JSON.stringify({
        action: anchorData.action,
        fingerprints: anchorData.fingerprints,
        algo: anchorData.algo,
        format: anchorData.format,
        timestamp: anchorData.timestamp,
        ...(anchorData.metadata && { metadata: anchorData.metadata })
      }),
      blockchain: 'solana-mainnet',
      purpose: `Public verification of ${anchorData.action}`,
      anchor_type: anchorData.action,
      fingerprints: anchorData.fingerprints
    }
  };

  const govKeyPath = path.resolve(process.env.GOVERNANCE_PRIVATE_KEY_PATH!);
  const privateKey = fs.readFileSync(govKeyPath, 'utf8');

  const dataToSign = JSON.stringify({
    timestamp: logEntry.timestamp,
    action: logEntry.action,
    actor: logEntry.actor,
    details: logEntry.details
  });

  const sign = crypto.createSign('SHA256');
  sign.update(dataToSign);
  logEntry.signature = sign.sign(privateKey, 'hex');

  const govDir = process.env.GOVERNANCE_DIR || process.env.NEURO_GOVERNANCE_DIR || 'governance';
  const logPath = path.join(process.cwd(), '..', govDir, 'wp_publish_log.jsonl');
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(logPath, logLine);

  console.log('✅ Governance action logged to records');
  console.log(`   Log file: ${logPath}`);
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('🏛️ NeuroSwarm Governance Anchoring Tool');
    console.log('=======================================\n');

    const actionType = process.argv[2];

    if (!actionType) {
      console.log('Usage: npm run anchor-governance <action_type> [options]');
      console.log();
      console.log('Available actions:');
      console.log('  genesis          - Anchor founder keys and genesis config');
      console.log('  key-rotation     - Anchor key rotation (requires --new-key and --old-key)');
      console.log('  policy-update    - Anchor policy update (requires --policy-file)');
      console.log();
      console.log('Examples:');
      console.log('  npm run anchor-governance genesis');
      console.log('  npm run anchor-governance key-rotation --new-key=./new-key.pem --old-key=./old-key.pem');
      console.log('  npm run anchor-governance policy-update --policy-file=./policy.json');
      process.exit(1);
    }

    let fingerprints: Record<string, string>;
    let metadata: Record<string, any> = {};

    switch (actionType) {
      case 'genesis':
        fingerprints = generateGenesisFingerprints();
        break;

      case 'key-rotation': {
        const newKeyPath = process.argv.find(arg => arg.startsWith('--new-key='))?.split('=')[1];
        const oldKeyPath = process.argv.find(arg => arg.startsWith('--old-key='))?.split('=')[1];

        if (!newKeyPath || !oldKeyPath) {
          console.log('❌ Key rotation requires --new-key and --old-key parameters');
          process.exit(1);
        }

        fingerprints = generateKeyRotationFingerprints(newKeyPath, oldKeyPath);
        metadata = { new_key_path: newKeyPath, old_key_path: oldKeyPath };
        break;
      }

      case 'policy-update': {
        const policyPath = process.argv.find(arg => arg.startsWith('--policy-file='))?.split('=')[1];

        if (!policyPath) {
          console.log('❌ Policy update requires --policy-file parameter');
          process.exit(1);
        }

        fingerprints = generatePolicyUpdateFingerprints(policyPath);
        metadata = { policy_file: policyPath };
        break;
      }

      default:
        console.log(`❌ Unknown action type: ${actionType}`);
        process.exit(1);
    }

    const anchorData: AnchorData = {
      action: actionType,
      fingerprints,
      algo: 'SHA-256',
      format: 'SPKI',
      timestamp: new Date().toISOString(),
      metadata
    };

    console.log('📋 Anchor Data Summary:');
    console.log(JSON.stringify(anchorData, null, 2));
    console.log();

    const txSignature = anchorToSolana(anchorData);
    logAnchoring(txSignature, anchorData);

    console.log('\n🎉 Governance anchoring preparation complete!');
    console.log('==============================================');
    console.log('Next steps:');
    console.log('1. Execute the Solana memo transaction shown above');
    console.log('2. Update the governance log with the actual transaction signature');
    console.log('3. Share the fingerprints for public verification');

  } catch (error) {
    console.error('❌ Error during governance anchoring:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export {
  generateGenesisFingerprints,
  generateKeyRotationFingerprints,
  generatePolicyUpdateFingerprints,
  anchorToSolana,
  logAnchoring
};
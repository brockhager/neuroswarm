#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

// Load environment variables
require('dotenv').config();

interface KeyFingerprint {
  founder_pub_sha256: string;
  admin_pub_sha256: string;
  genesis_sha256: string;
  algo: string;
  format: string;
  timestamp: string;
}

/**
 * Convert PEM to DER format for consistent hashing
 */
function pemToDer(pemContent: string): Buffer {
  // Remove PEM headers and footers, decode base64
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

  // Basic validation
  if (!content.includes('-----BEGIN')) {
    throw new Error(`${description} is not in valid PEM format`);
  }

  return content;
}

/**
 * Load and validate genesis config
 */
function loadGenesisConfig(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Genesis config not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Basic JSON validation
  try {
    JSON.parse(content);
  } catch (error) {
    throw new Error(`Genesis config is not valid JSON: ${error}`);
  }

  return content;
}

/**
 * Generate key fingerprints
 */
function generateFingerprints(): KeyFingerprint {
  console.log('🔐 Generating key fingerprints for blockchain anchoring...\n');

  // Load keys
  const founderPubPath = path.resolve(process.env.FOUNDER_PUBLIC_KEY_PATH!);
  const adminPubPath = path.resolve(process.env.FOUNDER_PUBLIC_KEY_PATH!.replace('founder.jwt.pub', 'admin-node.jwt.pub'));
  const genesisPath = path.resolve(process.cwd(), '..', process.env.GENESIS_CONFIG_PATH!.replace(/^\//, ''));

  console.log('Loading files:');
  console.log(`  Founder public key: ${founderPubPath}`);
  console.log(`  Admin public key: ${adminPubPath}`);
  console.log(`  Genesis config: ${genesisPath}`);
  console.log();

  const founderPubPem = loadKeyFile(founderPubPath, 'Founder public key');
  const adminPubPem = loadKeyFile(adminPubPath, 'Admin public key');
  const genesisJson = loadGenesisConfig(genesisPath);

  // Convert to DER and hash
  console.log('Computing SHA-256 fingerprints...');

  const founderDer = pemToDer(founderPubPem);
  const adminDer = pemToDer(adminPubPem);
  const genesisDer = Buffer.from(genesisJson, 'utf8');

  const founderHash = computeSha256(founderDer);
  const adminHash = computeSha256(adminDer);
  const genesisHash = computeSha256(genesisDer);

  console.log(`  Founder public key: ${founderHash}`);
  console.log(`  Admin public key: ${adminHash}`);
  console.log(`  Genesis config: ${genesisHash}`);
  console.log();

  return {
    founder_pub_sha256: founderHash,
    admin_pub_sha256: adminHash,
    genesis_sha256: genesisHash,
    algo: 'SHA-256',
    format: 'SPKI',
    timestamp: new Date().toISOString()
  };
}

/**
 * Anchor fingerprints to Solana blockchain using SPL Memo
 */
function anchorToSolana(fingerprints: KeyFingerprint): string {
  console.log('⛓️ Anchoring fingerprints to Solana blockchain...\n');

  // Create memo content (compact JSON)
  const memoContent = JSON.stringify({
    founder_pub_sha256: fingerprints.founder_pub_sha256,
    admin_pub_sha256: fingerprints.admin_pub_sha256,
    genesis_sha256: fingerprints.genesis_sha256,
    algo: fingerprints.algo,
    format: fingerprints.format
  });

  console.log('Memo content:');
  console.log(memoContent);
  console.log();

  // Check if Solana CLI is available
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
    // Get current Solana config
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

  // Create memo transaction command
  console.log('📝 MANUAL STEP REQUIRED:');
  console.log('Execute this command with your funded Solana account:');
  console.log(`solana transfer --allow-unfunded-recipient --memo "${memoContent}" <FOUNDER_KEYPAIR> <RECIPIENT> 0.000000001`);
  console.log();
  console.log('Replace:');
  console.log('  <FOUNDER_KEYPAIR> with your keypair path (e.g., ~/.config/solana/id.json)');
  console.log('  <RECIPIENT> with any valid Solana address (e.g., your own address)');
  console.log('The transaction will be recorded on-chain with the key fingerprints.');
  console.log();

  // For now, return a placeholder signature
  return 'MANUAL_EXECUTION_REQUIRED';
}

/**
 * Log anchoring action to governance logs
 */
function logAnchoring(txSignature: string, memoContent: string): void {
  const logEntry: any = {
    timestamp: new Date().toISOString(),
    action: 'genesis_anchor',
    actor: 'founder',
    details: {
      tx_signature: txSignature,
      memo_content: memoContent,
      blockchain: 'solana-mainnet',
      purpose: 'Public verification of founder keys and genesis configuration'
    }
  };

  // Load governance private key for signing
  const govKeyPath = path.resolve(process.env.GOVERNANCE_PRIVATE_KEY_PATH!);
  const privateKey = fs.readFileSync(govKeyPath, 'utf8');

  // Create signature
  const dataToSign = JSON.stringify({
    timestamp: logEntry.timestamp,
    action: logEntry.action,
    actor: logEntry.actor,
    details: logEntry.details
  });

  const sign = crypto.createSign('SHA256');
  sign.update(dataToSign);
  logEntry.signature = sign.sign(privateKey, 'hex');

  // Write to governance log
  const logPath = path.join(process.cwd(), '..', 'wp_publish_log.jsonl');
  const logLine = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(logPath, logLine);

  console.log('✅ Anchoring action logged to governance records');
  console.log(`   Log file: ${logPath}`);
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('🏛️ NeuroSwarm Genesis Anchoring Tool');
    console.log('=====================================\n');

    // Generate fingerprints
    const fingerprints = generateFingerprints();

    // Display fingerprints
    console.log('📋 Key Fingerprints:');
    console.log(JSON.stringify(fingerprints, null, 2));
    console.log();

    // Save fingerprints to file
    const fingerprintPath = path.join(process.cwd(), 'genesis-fingerprints.json');
    fs.writeFileSync(fingerprintPath, JSON.stringify(fingerprints, null, 2));
    console.log(`💾 Fingerprints saved to: ${fingerprintPath}`);
    console.log();

    // Anchor to blockchain (manual step)
    const txSignature = anchorToSolana(fingerprints);

    // Log the action
    const memoContent = JSON.stringify({
      founder_pub_sha256: fingerprints.founder_pub_sha256,
      admin_pub_sha256: fingerprints.admin_pub_sha256,
      genesis_sha256: fingerprints.genesis_sha256,
      algo: fingerprints.algo,
      format: fingerprints.format
    });

    logAnchoring(txSignature, memoContent);

    console.log('\n🎉 Genesis anchoring preparation complete!');
    console.log('=====================================');
    console.log('Next steps:');
    console.log('1. Execute the Solana memo transaction shown above');
    console.log('2. Update the governance log with the actual transaction signature');
    console.log('3. Share the fingerprints for public verification');

  } catch (error) {
    console.error('❌ Error during genesis anchoring:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateFingerprints, anchorToSolana, logAnchoring };
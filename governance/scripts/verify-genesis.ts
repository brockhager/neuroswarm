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
  timestamp?: string;
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
 * Generate local fingerprints for comparison
 */
function generateLocalFingerprints(): KeyFingerprint {
  console.log('🔐 Generating local key fingerprints...\n');

  // Load keys
  const founderPubPath = path.resolve(process.env.FOUNDER_PUBLIC_KEY_PATH!);
  const adminPubPath = path.resolve(process.env.FOUNDER_PUBLIC_KEY_PATH!.replace('founder.jwt.pub', 'admin-node.jwt.pub'));
  const genesisPath = path.resolve(process.cwd(), '..', process.env.GENESIS_CONFIG_PATH!.replace(/^\//, ''));

  console.log('Loading local files:');
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
    format: 'SPKI'
  };
}

/**
 * Fetch memo from Solana transaction
 */
function fetchMemoFromTransaction(txSignature: string): KeyFingerprint | null {
  console.log(`📡 Fetching memo from transaction: ${txSignature}\n`);

  try {
    // Get transaction details using Solana CLI
    const command = `solana confirm ${txSignature} --output json`;
    const output = execSync(command, { encoding: 'utf8' });

    const txData = JSON.parse(output);

    // Extract memo from transaction
    if (txData && txData.transaction && txData.transaction.message) {
      const instructions = txData.transaction.message.instructions;

      for (const instruction of instructions) {
        // Look for Memo program (MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)
        if (instruction.programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
          const memoData = Buffer.from(instruction.data, 'base64').toString('utf8');
          console.log('Found memo data:', memoData);

          try {
            const memoJson = JSON.parse(memoData);
            return memoJson as KeyFingerprint;
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
 * Compare fingerprints
 */
function compareFingerprints(local: KeyFingerprint, blockchain: KeyFingerprint | null): boolean {
  console.log('🔍 Comparing fingerprints...\n');

  if (!blockchain) {
    console.log('❌ No blockchain fingerprints found');
    return false;
  }

  let allMatch = true;

  console.log('Fingerprint Comparison:');
  console.log('=======================');

  const checks = [
    { name: 'Founder Public Key', local: local.founder_pub_sha256, blockchain: blockchain.founder_pub_sha256 },
    { name: 'Admin Public Key', local: local.admin_pub_sha256, blockchain: blockchain.admin_pub_sha256 },
    { name: 'Genesis Config', local: local.genesis_sha256, blockchain: blockchain.genesis_sha256 }
  ];

  for (const check of checks) {
    const match = check.local === check.blockchain;
    const status = match ? '✅' : '❌';

    console.log(`${status} ${check.name}:`);
    console.log(`    Local:      ${check.local}`);
    console.log(`    Blockchain: ${check.blockchain}`);
    console.log(`    Match:      ${match}`);
    console.log();

    if (!match) {
      allMatch = false;
    }
  }

  return allMatch;
}

/**
 * Main verification execution
 */
function main() {
  try {
    console.log('🔍 NeuroSwarm Genesis Verification Tool');
    console.log('=======================================\n');

    // Get transaction signature from command line or prompt
    const txSignature = process.argv[2];

    if (!txSignature) {
      console.log('Usage: npm run verify-genesis <TRANSACTION_SIGNATURE>');
      console.log('Example: npm run verify-genesis 5xHx5Y...');
      console.log();
      console.log('The transaction signature can be found in the governance logs after anchoring.');
      process.exit(1);
    }

    // Generate local fingerprints
    const localFingerprints = generateLocalFingerprints();

    // Fetch blockchain fingerprints
    const blockchainFingerprints = fetchMemoFromTransaction(txSignature);

    // Compare
    const verified = compareFingerprints(localFingerprints, blockchainFingerprints);

    console.log('🎯 Verification Result:');
    console.log('======================');

    if (verified) {
      console.log('✅ SUCCESS: All fingerprints match!');
      console.log('   NeuroSwarm genesis integrity verified.');
      console.log('   Founder keys and genesis config are authentic.');
    } else {
      console.log('❌ FAILURE: Fingerprint mismatch detected!');
      console.log('   This may indicate tampering or incorrect configuration.');
      console.log('   Please contact the NeuroSwarm team for assistance.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateLocalFingerprints, fetchMemoFromTransaction, compareFingerprints };
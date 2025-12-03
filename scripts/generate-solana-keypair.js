#!/usr/bin/env node
/**
 * Generate a Solana keypair for testing purposes
 * Outputs the keypair in the JSON array format required by @solana/web3.js
 */

import { Keypair } from '@solana/web3.js';

// Generate a new random keypair
const keypair = Keypair.generate();

// Get the secret key as a Uint8Array (64 bytes)
const secretKey = keypair.secretKey;

// Convert to regular array for JSON serialization
const secretKeyArray = Array.from(secretKey);

// Get the public key for reference
const publicKey = keypair.publicKey.toBase58();

console.log('\n='.repeat(80));
console.log('SOLANA KEYPAIR GENERATED FOR TESTING');
console.log('='.repeat(80));
console.log('\n⚠️  WARNING: This is a TEST keypair. Do NOT use for production or real funds!\n');

console.log('Public Key (Base58):');
console.log(publicKey);
console.log('\nSecret Key (JSON Array Format - use this for ROUTER_PRIVATE_KEY):');
console.log(JSON.stringify(secretKeyArray));

console.log('\n' + '='.repeat(80));
console.log('INSTRUCTIONS:');
console.log('='.repeat(80));
console.log('1. Copy the JSON array above (the [1,2,3,...] format)');
console.log('2. Go to: https://github.com/brockhager/neuroswarm/settings/secrets/actions');
console.log('3. Edit or create ROUTER_PRIVATE_KEY');
console.log('4. Paste the JSON array as the secret value');
console.log('5. Save the secret');
console.log('\nFor Devnet testing, also set:');
console.log('SOLANA_RPC_URL = https://api.devnet.solana.com');
console.log('='.repeat(80) + '\n');

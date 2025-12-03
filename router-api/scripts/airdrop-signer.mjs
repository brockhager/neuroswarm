import fs from 'fs';
import { Keypair, Connection, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';

(async () => {
  try {
    const secretStr = process.env.ROUTER_PRIVATE_KEY;
    if (!secretStr) {
      console.error('ERROR: ROUTER_PRIVATE_KEY is not set in environment.');
      process.exit(1);
    }

    // Parse the JSON array secret safely
    const secret = JSON.parse(secretStr);
    if (!Array.isArray(secret)) {
      console.error('ERROR: ROUTER_PRIVATE_KEY secret is not a JSON array of bytes.');
      process.exit(1);
    }

    const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
    const pubkey = keypair.publicKey.toBase58();
    console.log('Derived Router Signer Public Key:', pubkey);

    const conn = new Connection(clusterApiUrl('devnet'), 'confirmed');

    // Check existing balance
    const curBalance = await conn.getBalance(keypair.publicKey);
    console.log('Current balance (SOL):', (curBalance / LAMPORTS_PER_SOL).toFixed(9));

    if (curBalance >= LAMPORTS_PER_SOL) {
      console.log('Already has >= 1 SOL; skipping airdrop.');
      process.exit(0);
    }

    console.log('Requesting 1 SOL airdrop to', pubkey);
    const sig = await conn.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);
    console.log('Airdrop tx signature:', sig);

    // Wait for confirmation
    const confirmed = await conn.confirmTransaction(sig, 'confirmed');
    if (!confirmed.value || confirmed.value.err) {
      console.error('Airdrop confirmation failed or indicated an error:', confirmed.value);
      process.exit(1);
    }

    const newBalance = await conn.getBalance(keypair.publicKey);
    console.log(`New balance (SOL): ${(newBalance / LAMPORTS_PER_SOL).toFixed(9)}`);
    console.log('Airdrop completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error running airdrop script:', err?.message || err);
    process.exit(1);
  }
})();

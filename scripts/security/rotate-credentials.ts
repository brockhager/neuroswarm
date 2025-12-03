#!/usr/bin/env ts-node
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function generateSolanaKeypairArray(): number[] {
  // Solana keypairs are 64 bytes (private + public) in many exports; generate 64 random bytes
  return Array.from(randomBytes(64));
}

function generateGovernanceTokenHex(): string {
  // 32 bytes => 64 hex characters
  return randomBytes(32).toString('hex');
}

function saveSecrets(outDir: string, routerKey: number[], govToken: string) {
  fs.mkdirSync(outDir, { recursive: true });
  const routerPath = path.join(outDir, 'ROUTER_PRIVATE_KEY.json');
  const govPath = path.join(outDir, 'GOVERNANCE_SERVICE_TOKEN.txt');
  fs.writeFileSync(routerPath, JSON.stringify(routerKey, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.writeFileSync(govPath, govToken, { encoding: 'utf8', mode: 0o600 });
  return { routerPath, govPath };
}

async function main() {
  const routerKey = generateSolanaKeypairArray();
  const govToken = generateGovernanceTokenHex();

  const ts = Date.now();
  const outDir = path.resolve(process.cwd(), 'secrets', `rotated-${ts}`);

  const { routerPath, govPath } = saveSecrets(outDir, routerKey, govToken);

  // Print the secrets to stdout for immediate admin action (DO NOT COMMIT)
  console.log('=== ROTATED CREDENTIALS (T28) ===');
  console.log('ROUTER_PRIVATE_KEY (Solana private-key JSON array):');
  console.log(JSON.stringify(routerKey));
  console.log('');
  console.log('GOVERNANCE_SERVICE_TOKEN (64-char hex):');
  console.log(govToken);
  console.log('');
  console.log('Files written (do NOT commit):');
  console.log(`  - ${routerPath}`);
  console.log(`  - ${govPath}`);
  console.log('');
  console.log('IMPORTANT: Update GitHub Actions / Secrets and live Admin Node with these values immediately.');
}

main().catch((err) => {
  console.error('Rotation script failed:', err?.message || err);
  process.exit(1);
});

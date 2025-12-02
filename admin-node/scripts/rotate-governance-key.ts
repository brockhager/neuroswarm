#!/usr/bin/env ts-node
/*
 * rotate-governance-key.ts
 * CLI to rotate the governance signing key used by admin-node TimelineService.
 * Usage:
 *   npx ts-node scripts/rotate-governance-key.ts --out <path/to/private.key>
 * If no --out is provided the env var GOVERNANCE_PRIVATE_KEY_PATH will be used.
 */
import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import path from 'path';

function usage() {
  console.log('Usage: ts-node rotate-governance-key.ts --out <privateKeyPath> [--public <publicKeyPath>]');
}

const argv = process.argv.slice(2);
let outIndex = argv.indexOf('--out');
let publicIndex = argv.indexOf('--public');

const outPath = outIndex >= 0 ? argv[outIndex + 1] : process.env.GOVERNANCE_PRIVATE_KEY_PATH;
const pubPath = publicIndex >= 0 ? argv[publicIndex + 1] : (outPath ? `${outPath}.pub` : undefined);

if (!outPath) {
  console.error('Error: Missing output private key path (use --out or set GOVERNANCE_PRIVATE_KEY_PATH env var)');
  usage();
  process.exit(1);
}

function backupIfExists(p: string) {
  if (fs.existsSync(p)) {
    const bak = `${p}.bak.${Date.now()}`;
    fs.copyFileSync(p, bak);
    console.log(`Existing file backed up to: ${bak}`);
  }
}

try {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  backupIfExists(outPath);
  fs.writeFileSync(outPath, privateKey, { mode: 0o600 });
  console.log(`Wrote new private key: ${outPath}`);

  if (pubPath) {
    backupIfExists(pubPath);
    fs.writeFileSync(pubPath, publicKey, { mode: 0o644 });
    console.log(`Wrote public key: ${pubPath}`);
  }

  console.log('\nRotation complete. Please update the environment variable GOVERNANCE_PRIVATE_KEY_PATH to point to the new key and restart admin-node.');
  process.exit(0);
} catch (err: any) {
  console.error('Failed to rotate governance key:', err?.message || err);
  process.exit(1);
}

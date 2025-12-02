#!/usr/bin/env ts-node
/**
 * verify-timeline-signatures.ts
 * Verify signatures in a JSONL governance timeline using a public key file.
 * Usage:
 *  npx ts-node scripts/verify-timeline-signatures.ts --timeline <path> --pub <publicKeyPath>
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function usage() {
  console.log('Usage: ts-node verify-timeline-signatures.ts --timeline <path> --pub <publicKeyPath>');
}

const argv = process.argv.slice(2);
const tIndex = argv.indexOf('--timeline');
const pIndex = argv.indexOf('--pub');

const timelinePath = tIndex >= 0 ? argv[tIndex + 1] : process.env.GOVERNANCE_TIMELINE_PATH || path.join(process.cwd(), '..', 'governance', 'timeline', 'governance-timeline.jsonl');
const publicKeyPath = pIndex >= 0 ? argv[pIndex + 1] : process.env.GOVERNANCE_PUBLIC_KEY_PATH;

if (!timelinePath || !fs.existsSync(timelinePath)) {
  console.error('Timeline file not found or not provided.');
  usage();
  process.exit(2);
}

if (!publicKeyPath || !fs.existsSync(publicKeyPath)) {
  console.error('Public key file not found. Provide with --pub or set GOVERNANCE_PUBLIC_KEY_PATH');
  usage();
  process.exit(2);
}

const pubKey = fs.readFileSync(publicKeyPath, 'utf8');

const lines = fs.readFileSync(timelinePath, 'utf8').split('\n').filter(Boolean);

let verified = 0, failed = 0, unsigned = 0;

for (const line of lines) {
  try {
    const entry = JSON.parse(line) as any;
    if (!entry.signature) {
      unsigned++;
      continue;
    }

    // Try timeline signing format (timeline-service)
    const candidate1 = JSON.stringify({ id: entry.id, timestamp: entry.timestamp, action: entry.action, actor: entry.actor, txSignature: entry.txSignature, memoContent: entry.memoContent, fingerprints: entry.fingerprints, verificationStatus: entry.verificationStatus, details: entry.details });
    const candidate2 = JSON.stringify({ timestamp: entry.timestamp, action: entry.action, actor: entry.actor, details: entry.details });

    const tryVerify = (data: string) => {
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      return verify.verify(pubKey, entry.signature, 'hex');
    };

    let ok = false;
    try { ok = tryVerify(candidate1); } catch (_) { ok = false; }
    if (!ok) {
      try { ok = tryVerify(candidate2); } catch (_) { ok = false; }
    }

    if (ok) verified++; else failed++;
  } catch (err) {
    failed++;
  }
}

console.log(`Timeline verification complete — lines=${lines.length}, verified=${verified}, failed=${failed}, unsigned=${unsigned}`);
process.exit(failed > 0 ? 1 : 0);

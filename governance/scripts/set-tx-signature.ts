import fs from 'fs';
import path from 'path';

function usage() {
  console.error('Usage: npx ts-node scripts/set-tx-signature.ts <txSignature> [<genesis_sha256>]');
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) usage();
  const txSignature = args[0];
  const targetHash = args[1];

  const root = path.join(process.cwd(), '..');
  const timelinePath = path.join(root, 'governance-timeline.jsonl');
  if (!fs.existsSync(timelinePath)) {
    console.error('Timeline file not found:', timelinePath);
    process.exit(1);
  }

  const lines = fs.readFileSync(timelinePath, 'utf8').split('\n').filter(l => l.trim());
  const entries = lines.map(l => JSON.parse(l));

  // Find entry: match genesis action and optionally matching genesis_sha256
  let idx = -1;
  if (targetHash) {
    idx = entries.findIndex(e => (e.action === 'genesis' || e.action === 'genesis-anchor') && ((e.fingerprints && (e.fingerprints.genesis_sha256)) === targetHash));
  }
  if (idx === -1) {
    // fallback to latest genesis entry
    idx = entries.findIndex(e => e.action === 'genesis' || e.action === 'genesis-anchor');
    if (idx !== -1) idx = entries.length - 1 - entries.slice().reverse().findIndex(e => e.action === 'genesis' || e.action === 'genesis-anchor');
  }

  if (idx === -1) {
    console.error('No genesis entry to update found');
    process.exit(1);
  }

  // Update entry
  const entry = entries[idx];
  entry.txSignature = txSignature;
  entry.details = entry.details || {};
  entry.details.tx_signature = txSignature;
  entry.verificationStatus = 'verified';

  entries[idx] = entry;
  fs.writeFileSync(timelinePath, entries.map(e => JSON.stringify(e)).join('\n') + '\n');
  console.log('Updated entry', entry.id, 'with txSignature', txSignature);
}

main();

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const timelinePath = path.join(__dirname, '..', 'governance-timeline.jsonl');

const entry = {
  id: randomUUID(),
  timestamp: new Date().toISOString(),
  action: 'genesis',
  actor: 'founder',
  txSignature: 'E2E_SIG',
  memoContent: 'E2E test genesis',
  fingerprints: { genesis_sha256: 'E2E_HASH' },
  verificationStatus: 'verified',
  explorerUrl: 'https://explorer.solana.com/tx/E2E_SIG',
  details: {},
};

let content = '';
if (fs.existsSync(timelinePath)) {
  content = fs.readFileSync(timelinePath, 'utf8');
}
content = content + JSON.stringify(entry) + '\n';
fs.writeFileSync(timelinePath, content, 'utf8');
console.log('Seeded e2e timeline entry:', entry.id);

process.exit(0);

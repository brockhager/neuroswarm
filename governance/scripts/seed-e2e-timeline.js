#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { randomUUID, createHash } from 'crypto';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const timelinePath = path.join(__dirname, '..', 'timeline', 'governance-timeline.jsonl');
// Also write to the repository root path so AnchorService (which expects ../governance-timeline.jsonl) reads seeded entries
const workspaceRootTimelinePath = path.join(__dirname, '..', '..', 'governance', 'timeline', 'governance-timeline.jsonl');

// Compute the actual genesis hash from admin-genesis.json
const genesisPath = path.join(__dirname, '..', '..', 'docs', 'admin', 'admin-genesis.json');
let genesisSha256 = 'missing';
if (fs.existsSync(genesisPath)) {
  const genesisJson = fs.readFileSync(genesisPath, 'utf8');
  genesisSha256 = createHash('sha256').update(genesisJson, 'utf8').digest('hex');
} else {
  console.warn('admin-genesis.json not found; seeding timeline will use fingerprint="missing"');
}

const entry = {
  id: randomUUID(),
  timestamp: new Date().toISOString(),
  action: 'genesis',
  actor: 'founder',
  txSignature: 'E2E_SIG',
  memoContent: 'E2E test genesis',
  fingerprints: { genesis_sha256: genesisSha256 },
  verificationStatus: 'verified',
  explorerUrl: 'https://explorer.solana.com/tx/E2E_SIG',
  details: {},
};

let content = '';
if (fs.existsSync(timelinePath)) {
  content = fs.readFileSync(timelinePath, 'utf8');
  // If a similar genesis entry already exists, skip to avoid duplicate seeds
  if (content.includes('"action":"genesis"') && content.includes('E2E test genesis')) {
    console.log('E2E genesis entry already present; skipping seed');
  } else {
    content = content + JSON.stringify(entry) + '\n';
    fs.writeFileSync(timelinePath, content, 'utf8');
  }
} else {
  content = JSON.stringify(entry) + '\n';
  fs.writeFileSync(timelinePath, content, 'utf8');
}
// Also write a copy to the workspace root timeline path for services that read from ../governance-timeline.jsonl
// This ensures seeded data is available where AnchorService expects it in tests/CI
let rootContent = '';
if (fs.existsSync(workspaceRootTimelinePath)) {
  rootContent = fs.readFileSync(workspaceRootTimelinePath, 'utf8');
  if (!rootContent.includes('"action":"genesis"') || !rootContent.includes('E2E test genesis')) {
    rootContent = rootContent + JSON.stringify(entry) + '\n';
    fs.writeFileSync(workspaceRootTimelinePath, rootContent, 'utf8');
  } else {
    console.log('Workspace root timeline already contains E2E genesis; skipping copy');
  }
} else {
  rootContent = JSON.stringify(entry) + '\n';
  fs.writeFileSync(workspaceRootTimelinePath, rootContent, 'utf8');
}
console.log('Seeded e2e timeline entry:', entry.id);

process.exit(0);

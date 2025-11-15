#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface MoveEntry {
  contributorId: string;
  oldPath: string;
  newPath: string;
  timestamp: string;
}

const movesFile = process.argv[2];
const contributorId = process.argv[3] || 'automated-cleanup';

if (!movesFile) {
  console.error('Usage: ts-node log-file-moves.ts <moves.json> [contributorId]');
  process.exit(1);
}

const raw = fs.readFileSync(movesFile, 'utf8');
const moves = JSON.parse(raw) as Array<{ oldPath: string; newPath: string }>;

const timelinePath = process.env.GOVERNANCE_TIMELINE_PATH
  ? path.resolve(process.env.GOVERNANCE_TIMELINE_PATH)
  : path.resolve(process.cwd(), '..', 'governance-timeline.jsonl');

for (const m of moves) {
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action: 'repo_cleanup',
    actor: contributorId,
    fingerprints: {},
    verificationStatus: 'pending',
    details: {
      oldPath: m.oldPath,
      newPath: m.newPath,
    },
    signature: undefined,
  };

  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(timelinePath, line); 
  console.log('Logged move:', m.oldPath, '->', m.newPath);
}

console.log('All moves logged to', timelinePath);

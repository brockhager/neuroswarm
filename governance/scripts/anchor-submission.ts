#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

require('dotenv').config();

interface AnchorData {
  action: string;
  fingerprints: Record<string, string>;
  algo: string;
  format: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface GovernanceLogEntry {
  timestamp: string;
  action: string;
  actor: string;
  details: any;
  signature?: string;
}

function anchorToSolana(anchorData: AnchorData): string {
  const memoContent = JSON.stringify(anchorData);
  console.log('Memo content for submission anchor:');
  console.log(memoContent);
  console.log();

  let solanaAvailable = false;
  try {
    execSync('solana --version', { stdio: 'pipe' });
    solanaAvailable = true;
  } catch (error) {
    console.log('Solana CLI not found; manual execution required.');
  }

  console.log('MANUAL_EXECUTION_REQUIRED');

  if (solanaAvailable) {
    console.log('Execute the following Solana CLI command (with funded keypair):');
    console.log(`solana transfer --allow-unfunded-recipient --memo '${memoContent}' <FOUNDER_KEYPAIR> <RECIPIENT> 0.000000001`);
  }

  return 'MANUAL_EXECUTION_REQUIRED';
}

function logAnchoring(txSignature: string, anchorData: AnchorData): void {
  const logEntry: GovernanceLogEntry = {
    timestamp: new Date().toISOString(),
    action: anchorData.action,
    actor: 'founder',
    details: {
      tx_signature: txSignature,
      memo_content: JSON.stringify(anchorData),
      blockchain: 'solana-mainnet',
      purpose: `Submission public verification`,
      anchor_type: anchorData.action,
      fingerprints: anchorData.fingerprints,
      metadata: anchorData.metadata || {}
    }
  };

  try {
    const govKeyPath = path.resolve(process.env.GOVERNANCE_PRIVATE_KEY_PATH || '');
    let signature = undefined;
    if (govKeyPath && fs.existsSync(govKeyPath)) {
      const privateKey = fs.readFileSync(govKeyPath, 'utf8');
      const dataToSign = JSON.stringify({ timestamp: logEntry.timestamp, action: logEntry.action, actor: logEntry.actor, details: logEntry.details });
      const sign = crypto.createSign('SHA256');
      sign.update(dataToSign);
      signature = sign.sign(privateKey, 'hex');
      (logEntry as any).signature = signature;
    }

    const logPath = (() => {
      if (process.env.WP_PUBLISH_LOG_PATH) return path.resolve(process.env.WP_PUBLISH_LOG_PATH);
      const govDir = process.env.GOVERNANCE_DIR || process.env.NEURO_GOVERNANCE_DIR || 'governance';
      return path.join(process.cwd(), '..', govDir, 'wp_publish_log.jsonl');
    })();
    const line = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logPath, line);
    console.log('Anchoring logged to governance publish log:', logPath);
  } catch (error) {
    console.error('Failed to write governance log: ', error);
  }
}

function main() {
  const hashArg = process.argv.find(a => a.startsWith('--hash='))?.split('=')[1];
  const actorArg = process.argv.find(a => a.startsWith('--actor='))?.split('=')[1] || 'unknown';
  const typeArg = process.argv.find(a => a.startsWith('--type='))?.split('=')[1] || 'file';
  const metadataArg = process.argv.find(a => a.startsWith('--meta='))?.split('=')[1] || '{}';

  if (!hashArg) {
    console.error('Usage: npm run anchor-submission -- --hash=<sha256> --actor=<actor> [--type=file|json|telemetry] --meta="{\"tags\": [\"analytics\"]}"');
    process.exit(1);
  }

  const anchorData: AnchorData = {
    action: 'submission',
    fingerprints: { submission_sha256: hashArg },
    algo: 'SHA-256',
    format: 'raw',
    timestamp: new Date().toISOString(),
    metadata: { actor: actorArg, type: typeArg, meta: JSON.parse(metadataArg) }
  };

  const txSignature = anchorToSolana(anchorData);
  logAnchoring(txSignature, anchorData);
}

if (require.main === module) {
  main();
}

export { anchorToSolana, logAnchoring };

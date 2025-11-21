#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

interface InteractionRecord {
  type: 'interaction';
  interaction_id: string;
  user_message: string;
  final_reply: string;
  feedback?: { score: number } | null;
}

const args = process.argv.slice(2);
const logFlagIndex = args.indexOf('--log');
const outFlagIndex = args.indexOf('--out');
const logPath = (logFlagIndex >= 0 ? args[logFlagIndex + 1] : path.resolve('neuroswarm/ns-node/data/interactions.jsonl'));
const outputDir = outFlagIndex >= 0 ? args[outFlagIndex + 1] : path.resolve('neuro-learning/artifacts');

if (!fs.existsSync(logPath)) {
  console.error(`Missing interaction log at ${logPath}`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const records: InteractionRecord[] = fs.readFileSync(logPath, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(line => {
    try {
      return JSON.parse(line) as InteractionRecord;
    } catch (err) {
      return null;
    }
  })
  .filter(event => event && event.type === 'interaction' && event.final_reply) as InteractionRecord[];

const positive = records
  .filter(record => (record.feedback?.score ?? 0) >= 0)
  .slice(-200); // keep most recent positive exemplars

const exemplarSets = positive.map(record => ({
  interaction_id: record.interaction_id,
  prompt: record.user_message,
  response: record.final_reply
}));

const artifact = {
  generatedAt: new Date().toISOString(),
  exemplarCount: exemplarSets.length,
  exemplars: exemplarSets
};

const artifactPath = path.join(outputDir, 'response-playbook.json');
fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
console.log(`Response playbook written to ${artifactPath}`);

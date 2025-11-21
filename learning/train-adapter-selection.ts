#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

interface AdapterScore {
  adapter: string;
  success: number;
  failure: number;
  weight: number;
}

interface InteractionEvent {
  type: 'interaction' | 'feedback';
  interaction_id: string;
  adapters_queried?: string[];
  final_reply?: string;
  feedback?: { score: number } | null;
  score?: number;
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

const events: InteractionEvent[] = fs.readFileSync(logPath, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(line => {
    try {
      return JSON.parse(line) as InteractionEvent;
    } catch (err) {
      return null;
    }
  })
  .filter(Boolean) as InteractionEvent[];

const feedbackMap = new Map<string, number>();
for (const event of events) {
  if (event.type === 'feedback' && typeof event.score === 'number') {
    feedbackMap.set(event.interaction_id, event.score);
  }
}

const adapterScores = new Map<string, AdapterScore>();
for (const event of events) {
  if (event.type !== 'interaction' || !event.adapters_queried) continue;
  const score = feedbackMap.get(event.interaction_id) ?? 0;
  for (const adapter of event.adapters_queried) {
    const entry = adapterScores.get(adapter) || { adapter, success: 0, failure: 0, weight: 0 };
    if (score >= 0) {
      entry.success += 1;
    } else {
      entry.failure += 1;
    }
    adapterScores.set(adapter, entry);
  }
}

const ranked = Array.from(adapterScores.values()).map(entry => ({
  ...entry,
  weight: entry.success - entry.failure * 0.5
})).sort((a, b) => b.weight - a.weight);

const artifact = {
  generatedAt: new Date().toISOString(),
  logPath,
  adapters: ranked
};

const artifactPath = path.join(outputDir, 'adapter-model.json');
fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
console.log(`Adapter weights written to ${artifactPath}`);

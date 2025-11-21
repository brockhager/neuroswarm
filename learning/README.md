# Neuro Learning Pipeline

This workspace contains helper scripts that retrain the NeuroSwarm adapter-selection and response-synthesis heuristics from production logs.

## Prerequisites

- Node.js 18+
- pnpm (workspace root)
- Access to the interaction log produced by `ns-node` (`neuroswarm/ns-node/data/interactions.jsonl` by default)
- Optional: running Chroma or Postgres/pgvector instance for long-term vector storage

## Structure

| File | Purpose |
| --- | --- |
| `train-adapter-selection.ts` | Aggregates interaction data and recomputes adapter success weights |
| `train-response-synthesis.ts` | Builds refreshed exemplar prompt sets for clearer chat responses |
| `schedule.sh` | Example nightly cron wrapper that runs both scripts |

## Running Locally

```bash
pnpm exec tsx neuro-learning/train-adapter-selection.ts --log ../neuroswarm/ns-node/data/interactions.jsonl
pnpm exec tsx neuro-learning/train-response-synthesis.ts --log ../neuroswarm/ns-node/data/interactions.jsonl
```

Both scripts emit artifacts under `neuro-learning/artifacts/` which can be mounted into `neuro-services` or published to object storage.

## Retraining Cadence

1. Collect a full day of interaction logs.
2. Run `train-adapter-selection.ts` to refresh adapter weights.
3. Run `train-response-synthesis.ts` to rebuild exemplar prompt packs.
4. Notify the learning service via `POST /learning/reload` so the latest embeddings are loaded.

## Adding New Storage Backends

- Set `NS_INTERACTIONS_LOG` to point at the raw log location.
- Provide `--output` flags when running scripts to direct artifacts to cloud buckets.
- Update `neuro-services` `.env` to point to the new artifact paths.

## Contributor Workflow

1. Review `/learning/gaps` output to see repeated failures.
2. Design or extend an adapter to cover the missing capability.
3. Update the learning scripts/tests to include the new adapter in training.
4. Open a PR with the adapter plus updated artifacts.

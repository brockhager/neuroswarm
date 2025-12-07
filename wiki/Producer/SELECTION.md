# Producer Selection (CN-07-A)

This page documents how NeuroSwarm selects a Producer (designated validator) for a specific height/slot and how VP nodes may apply a small amount of perturbation to avoid strict monopolies.

## Deterministic selection (ns-node)
- The canonical `ns-node` selection function `getProducer(height)` uses a deterministic, stake-weighted selection algorithm based on a seed derived from the canonical tip hash + height. This ensures the same height always returns the same validator and integrates with canonical chain scheduling.
- The `getProducer` algorithm filters for eligible validators (e.g., registered candidates and minimum stake) and chooses a validator by mapping a deterministic seed to the total stake range, selecting the validator whose cumulative weight contains the seed value.

Important characteristics:
- Deterministic and reproducible
- Stake-weighted (higher total stake → higher chance to be chosen across multiple heights)
- Used to decide which validator is allowed to produce a canonical block

## VP-side selection (VP node / producer helpers)
- VP nodes also need selection helpers for several runtime use-cases: selecting a worker to perform a job, pre-scheduling tasks, or determining a local producer fallback when NS is unavailable.
- The VP-side implementation in `vp-node/producer-selection-service.ts` exposes two helpers:
  - `chooseProducerFromActiveSet(active, opts)` — randomized (Math.random default) with an optional `randomnessFactor` to slightly perturb stake weights and `minStake` to filter small validators.
  - `deterministicChooseProducer(active, seed, opts)` — deterministic variant using a seed + per-validator SHA256 mixing to compute a reproducible perturbation.

Configuration knobs:
- `randomnessFactor`: Fraction in [0..1] (default: 0.02) used to perturb stake weights by up to ±randomnessFactor
- `minStake`: Minimum numeric stake required for eligibility

When to use which:
- `getProducer(height)` (ns-node deterministic) — canonical block producer selection for consensus-critical operations.
- `deterministicChooseProducer` — for test harnesses and reproducible job assignment.
- `chooseProducerFromActiveSet` — for runtime scheduling where a little randomness is desirable to avoid repeated monopolies.

See also: `vp-node/producer-selection-service.ts` implementation and unit tests under `vp-node/tests/unit/producer-selection.test.ts`.

## Example (TypeScript)

```ts
import { chooseProducerFromActiveSet, deterministicChooseProducer } from '../../vp-node/producer-selection-service';

const validators = [
  { id: 'vp-1', stake: 1_000 },
  { id: 'vp-2', stake: 100 },
  { id: 'vp-3', stake: 10 },
];

// Non-deterministic selection (uses Math.random())
const chosen = chooseProducerFromActiveSet(validators, { randomnessFactor: 0.02 });

// Deterministic selection (useful for test harnesses)
const chosenDet = deterministicChooseProducer(validators, 'job-42', { randomnessFactor: 0.01 });
```

Notes:
- `randomnessFactor` default is 0.02; set to 0 to disable perturbation.
- `minStake` can be provided to filter out small validators during selection.

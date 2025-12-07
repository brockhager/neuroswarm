# CN-07-C: Validator Consensus Compliance Tracking (Missed Slots)

This page documents the CN-07-C service which tracks validator missed production slots and feeds events into the reputation scoring service (CN-07-B).

Overview
- Purpose: Detect when an active validator fails to produce a block during their scheduled slot and record the event. Missed slots increment consecutive counters and trigger reputation penalties; repeated misses become evidence for further penalties or slashing workflows.
- Files: `vp-node/consensus-compliance-service.ts` (tracking) and `vp-node/reputation-scoring-service.ts` (score updates).

Key behavior
- Deduplication: Misses are keyed by (validatorId, height) so duplicate reports for the same slot do not double-count.
- Counters: Tracks consecutiveMisses and totalMisses per validator.
- Penalty hook: Each recorded missed slot applies a configurable multiplicative penalty to the validator's reputation score (default 15% per miss).
- Success handling: A successful production resets consecutive misses and records a small reputation boost.

Policy & thresholds
- Default consecutive miss threshold = 3: when reached, higher-level operator workflows (alerts, evidence collection, slashing candidates) should be triggered.
- Reputation floor: Scores are clamped to 0.0 — reputation cannot go negative.

Integration points
- Reputation scoring (`vp-node/reputation-scoring-service.ts`) is consulted/updated on both misses and successful productions.
- The consensus compliance service is intended to be called by the VP produce guard and by ns-node scheduled job monitors in production deployments (where NS notifies misses or gaps).

Next steps
- Integrate with NS slashing pipeline to surface sufficient missed-slot evidence as `SLASHEVIDENCE` events.
- Add persistence/backing store (e.g., SQLite) so missed events survive restarts and are auditable.

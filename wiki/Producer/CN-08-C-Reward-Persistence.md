# CN-08-C — VP-Node Reward Claim Persistence & Requeueing

Status: Prototype implemented

Summary
-------
CN-08-C provides durable storage on the VP node for reward claims created after a job is completed. This ensures claims are not lost on process crash: pending claims are persisted, retried, and marked as submitted or settled once the NS-Node acknowledges them.

Files & Implementation
----------------------
- `vp-node/reward-claims-db-service.ts` — persistence layer with `better-sqlite3` or `sqlite3` support and in-memory fallback for tests.
- `vp-node/tests/unit/reward-persistence.test.ts` — unit tests for persistence flows.
- `vp-node/tests/integration/reward_persistence_integration.test.ts` — integration test that verifies the full flow using the mock NS client.
- `vp-node/fee-distribution-service.ts` — updated to persist claims before submitting and mark claim states based on the submission result.

Behavior & Notes
----------------
- Claims are persisted with status `PENDING` before submission.
- After a successful submission the claim is marked `SUBMITTED` and the settlement txHash is recorded.
- Failures are marked `FAILED` and left in the pending set for future retry/processing.

Next steps / Hardening
----------------------
- Add a background worker to requeue `FAILED`/`PENDING` claims periodically with exponential backoff.
- Add durable, authoritative verification once the NS-Node confirms settlement (transition to `SETTLED`).
- Add monitoring (metrics) and admin endpoints to inspect/acknowledge pending claims.

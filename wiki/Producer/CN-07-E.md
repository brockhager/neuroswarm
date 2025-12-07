# CN-07-E: Slashing Evidence Hook

This page documents CN-07-E — the slashing evidence generation and submission service for VP nodes.

Overview
- Purpose: Translate persistent compliance failures (e.g., consecutive missed slots) into canonical, signed evidence (`SLASHEVIDENCE`) submitted to the `ns-node`/ledger for verification and possible slashing.
- File: `vp-node/slashing-evidence-service.ts`

Key behavior
- Fetches the highest consecutive miss count for a validator (via `CN-07-D` persistence) and compares against a configurable threshold — `SLASHING_THRESHOLD` (default 5).
- If threshold is breached, builds a `SlashingEvidence` object (canonical shape), signs the payload with the VP's private key (production: secure key manager), and submits the evidence to the NS-Node endpoint (simulated in the prototype).
- Submissions are recorded as audit events (best-effort) into the compliance DB to provide an immutable trail.

Security notes
- Evidence payloads must be canonicalized and signed deterministically using an authenticated Ed25519 keypair.
- The `ns-node` must validate the reporting VP's signature, verify the supporting records against the compliance database and, if valid, create `SLASHEVIDENCE` on-chain or forward for governance action.

Testing & simulation
- Unit tests: `vp-node/tests/unit/slashing-evidence.test.ts` — verifies emission happens only when threshold is reached.

Next steps
- Wire the evidence submission into an on-chain anchoring workflow and ledger slashing pipeline.
- Add additional evidence types: `DOUBLE_SIGN`, `FRAUDULENT_OUTPUT` and richer supporting record retrieval.

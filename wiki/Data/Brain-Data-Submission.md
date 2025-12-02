# Brain Data Submission

Contributors can submit data that the NeuroSwarm Brain will process, validate, and anchor for governance auditability.

Key concepts:
- Submissions may be JSON payloads, files, or telemetry data.
- Every submission is validated and a SHA-256 fingerprint is recorded in the governance timeline.
- The anchor process prepares a Solana memo with the submission fingerprint. Founders/founder accounts execute the on-chain transfer to create an immutable record.

API:
- POST /v1/brain/submit
  - Body: { contributorId, tags, description, sha256, submissionType, metadata }
  - Auth: Bearer token (JWT) with contributor role or higher
  - Response: { success, timelineId, anchorResult }

Flow:
1. Contributor computes SHA-256 of their data (or includes 'data' in the submission for server-side hashing).
2. Submit POST to /v1/brain/submit (via CLI or dashboard) with JWT token.
3. Admin Node validates payload, logs a submission entry to governance-timeline.jsonl and requests a submission anchor.
4. Anchor result indicates manual execution is required; founders execute Solana memo to anchor submission.
5. Once anchoring is done, the timeline entry is updated with txSignature and verification state.

Security:
- SafetyService blocks submissions during maintenance mode.
- Submissions are logged and optionally signed for auditability.
- Store raw files separately (IPFS) and reference them via fingerprint in the timeline; do not store sensitive raw data in the governance timeline directly.

CLI:
- Use the `submit` CLI wrapper to compute hashes and submit payloads:
  - `neuroswarm submit --file dataset.csv --contributorId contributor-1 --token <JWT>`

For more details on submission CLI and examples, see `Data/data-submission.md`.

# NeuroSwarm — Security / Auditor Portal

This landing page is for auditors, security engineers, and reviewers who need a prioritized view of compliance, hardening and verifiable artifacts.

## Priority audit artifacts
- CN-07-H — Cryptographic Hardening (Completion Report): `wiki/Security/CN-07-H-Completion-Report.md`
- CN-08-G — Durable Idempotency (Validation): `wiki/NEUROSWARM_LAUNCH/task-list-2.md` (see CN-08-G entry and supporting tests) 
- Governance / Audit timeline & anchors: `neuroswarm/governance` and `neuroswarm/governance/wp_publish_log.jsonl`

## What to look for
- Evidence private keys never leave KMS — KmsVaultClient + Vault Transit connector tests
- Idempotency confirmation records — Firestore-backed idempotency store + emulator tests
- CI validation — `.github/workflows/integration_tests.yml` shows Firestore emulator + mock-KMS runs

## Quick checks
- Run the integration orchestrator locally for a quick E2E check:

  ```powershell
  node scripts/test-with-firestore-emulator.mjs vp-node kms
  ```

## Governance & policy
- Governance anchors and audit timeline: `neuroswarm/wp_publish_log.jsonl` and `neuro-program` anchoring scripts

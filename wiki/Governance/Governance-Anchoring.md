# Governance & Anchoring
[← Index](Index.md)

Overview

Governance is the collection of rules, procedures, and tooling captured by the Admin Node and recorded in the governance timeline. Anchoring writes immutable hashes to a blockchain (e.g., Solana) to provide cryptographic evidence that the timeline contents are unchanged.

Details
- The governance timeline is stored in a JSONL file (e.g., `governance-timeline.jsonl`) and exposed via admin/observability endpoints.
- Anchoring entries include `txSignature` and `fingerprints.genesis_sha256` for UI and audit purposes.
- `AnchorService` parses observability fields to return consistent `verificationStatus` and `txSignature` values to the dashboard.

How-to
1. Verify anchoring via UI: `Admin Dashboard -> Genesis Anchor Status`.
2. Verify via API: GET `/v1/observability/governance-anchoring` or use the `contributor-anchor-verification` guide.
3. When seeding the timeline, ensure `genesisSha256` is computed from `docs/admin/admin-genesis.json` and placed in `governance-timeline.jsonl`.

Checklist
- Are `txSignature` and `verificationStatus` present in the timeline entry?
- Does the dashboard read the correct field for `txSignature`? (top-level `txSignature` vs `details.tx_signature`)
- Is the anchor recorded on the blockchain explorer (e.g., solana explorer)?

References
- `docs/contributor-anchor-verification.md`
- `docs/admin/admin-node-genesis.md`
- `admin-node/src/services/anchor-service.ts`

Last updated: 2025-11-15
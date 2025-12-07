# CN-08-A — Validator Fee Collection & Distribution (vp-node)

Status: Completed (prototype)

Summary
-------
This page documents the CN-08-A implementation: the VP node fee collection and distribution path which calculates how transaction/job fees are split and submits a reward claim to the canonical NS-Node for on-chain settlement.

Goals
-----
- Calculate fee split for a validated job result.
- Allocate shares between the producing validator (producer), the stake pool / delegators, and the network fund.
- Create and submit a signed reward claim payload to `ns-node` for queuing and settlement.
- Surface operator alerts on success/failure.

Where the code lives
--------------------
- Prototype service implementation: `vp-node/fee-distribution-service.ts`
- NS submission helper: `vp-node/ns-node-client.ts` (supports reward claim submission)
- Unit tests: `vp-node/tests/unit/fee-distribution.test.ts`
- Integration tests: `vp-node/tests/integration/fee_integration.test.mjs`

Design & behavior
------------------
- Default fee split (governance-configurable in future):
  - PRODUCER_SHARE: 60% — direct reward to the validator that produced the job/block
  - STAKE_POOL_SHARE: 30% — distributed to delegators / stake pools
  - NETWORK_FUND_SHARE: 10% — network development / treasury fund

- `calculateFeeSplit(jobResult)` performs an exact split and performs a small sanity check for floating-point drift.

- `submitRewardClaim(allocation)` prepares a claim payload (claimId, timestamp, allocation, mock signature) and calls the `ns-node-client`'s `submitRewardClaim()` helper to queue the settlement.

- `processJobFeeSettlement(jobResult)` is the top-level hook intended to be called after a job is validated and accepted; it logs the allocation and submits the claim.

Operational considerations & next steps
------------------------------------
- Production should add cryptographic signing of the claim (validator private key) and verification on `ns-node`.
- Implement durable persistence for reward claims so retries and audits are possible (our prototype relies on ns-node queueing).
- Add governance-configurable reward splits (current values are mocked for the prototype).
- Implement end-to-end tests that include ns-node ledger processing (once the ledger endpoint is fully implemented).

See also
--------
- `neuroswarm/wiki/Producer/REWARDS.md` (higher-level tokenomics & historical notes)
- `vp-node/reputation-scoring-service.ts` and `vp-node/compliance-db-service.ts` (the economic enforcement loop)

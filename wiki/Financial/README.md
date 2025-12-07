# Financial Overview — NeuroSwarm (High-level)

This page gives a concise, high-level overview of the financial and token-related components inside NeuroSwarm (the NS system), and points you to the deeper documentation you'll want to read when implementing or auditing economic flows.

If you're onboarded to the project and need to understand how tokens, staking, rewards, and penalties interact across NS and VP nodes, start here and follow the linked pages for technical details.

---

## Key concepts & entities

-- NST (Network Token): The primary protocol token used for governance, staking, and incentives. See the canonical tokenomics & issuance notes: [wiki/Technical/TOKENOMICS.md](../Technical/TOKENOMICS.md) and [wiki/Tokenomics-and-Economics/POS_ISSUANCE_SCHEDULE.md](../Tokenomics-and-Economics/POS_ISSUANCE_SCHEDULE.md).

NSD (Network Service Denomination / fees): Fee currency used to pay service/transaction fees collected by the network. NSD fee collection and allocation rules are discussed in [wiki/Producer/REWARDS.md](../Producer/REWARDS.md) and [wiki/Tokenomics-and-Economics/dynamic-reward-logic.md](../Tokenomics-and-Economics/dynamic-reward-logic.md).

- Validators & Stakers (DPoS): Validators register and become eligible to produce blocks or participate in governance after staking NST. See [wiki/Nodes/VALIDATOR-NODES.md](../Nodes/VALIDATOR-NODES.md), [wiki/Technical/TOKENOMICS.md](../Technical/TOKENOMICS.md), and [wiki/Tokenomics-and-Economics/VALIDATOR_ECONOMICS.md](../Tokenomics-and-Economics/VALIDATOR_ECONOMICS.md) for economics and thresholds.

Stakes, Unstaking & Unbonding: Staking and unbonding flows (including minimum stake, unbonding window, and release rules) are described in the staking docs: [wiki/Technical/TOKENOMICS.md](../Technical/TOKENOMICS.md) and [wiki/NEUROSWARM_LAUNCH/task-list-2.md](../NEUROSWARM_LAUNCH/task-list-2.md) (staking work items).

- Rewards (Block rewards + fee distribution):
  - Block reward (NST mint/subsidy) — produced by the protocol for active validators (see [wiki/Technical/TOKENOMICS.md](../Technical/TOKENOMICS.md)).
  - Transaction / Job fees (NSD) — paid by clients and split between the producing validator, stake pool / delegators, and a network fund (prototype service: [wiki/Producer/CN-08-A-Fee-Distribution.md](../Producer/CN-08-A-Fee-Distribution.md)). See also [wiki/Producer/REWARDS.md](../Producer/REWARDS.md) for canonical policy notes.

- Reward Claims and Settlement (VP → NS): VP nodes submit persistent reward claims to NS so the ledger can queue settlement transactions. VP-side persistence and requeueing are implemented in [vp-node/reward-claims-db-service.ts](../vp-node/reward-claims-db-service.ts) and documented at [wiki/Producer/CN-08-C-Reward-Persistence.md](../Producer/CN-08-C-Reward-Persistence.md). The NS-side claim intake & processing lives at [ns-node/src/services/ledger-reward-processor.ts](../ns-node/src/services/ledger-reward-processor.ts) and is documented in [wiki/ns-node/CN-08-B-Reward-Processor.md](../ns-node/CN-08-B-Reward-Processor.md).

Settlement Confirmation (NS → VP): After the NS ledger queues or finalizes a settlement tx the NS node may notify the VP so the VP can mark claims as SETTLED. See [wiki/ns-node/CN-08-E-Settlement-Confirmations.md](../ns-node/CN-08-E-Settlement-Confirmations.md) and the VP callback endpoint (`/api/v1/ledger/confirm-reward-settlement`).

Slashing & Penalties: Validators and delegators are subject to slashing penalties for proven misbehavior (double-signing, fabrication, long-term missed slots). Slashing evidence flows originate at VP nodes and are submitted to NS; see [wiki/Producer/CN-07-E.md](../Producer/CN-07-E.md), [wiki/Producer/CN-07-C.md](../Producer/CN-07-C.md), [wiki/Technical/ECONOMICS.md](../Technical/ECONOMICS.md) and [wiki/Security/SECURITY-TRUST.md](../Security/SECURITY-TRUST.md) for end-to-end details.

Governance & Treasury: Protocol-level parameters (fee splits, slashing rules, emission schedule, unbond windows) are governed via the on-chain governance flow and recorded in the governance timeline (see [wiki/Governance/GOVERNANCE.md](../Governance/GOVERNANCE.md) and [governance/wp_publish_log.jsonl](../governance/wp_publish_log.jsonl)). Anchoring of governance records to an external chain (e.g., Solana) is documented in [wiki/Governance/Governance-Anchoring.md](../Governance/Governance-Anchoring.md).

Transparency & Audit Trail: All settlement, slashing, and governance events should be auditable. See [wiki/transparency-record-schema.md](../transparency-record-schema.md) for the canonical schema used for transparency/audit logs and [wiki/Technical/ECONOMICS.md](../Technical/ECONOMICS.md) for how economic events are recorded.

---

## How pieces fit together (quick flow)

1. A VP produces a block or completes a job; transaction fees (NSD) are aggregated by the VP and/or collected by the NS ledger ([vp-node/fee-distribution-service.ts](../vp-node/fee-distribution-service.ts)).
2. VP creates a signed Reward Claim (persisted locally) and submits it to the NS ledger endpoint for settlement ([ns-node/src/services/ledger-reward-processor.ts](../ns-node/src/services/ledger-reward-processor.ts)).
3. NS verifies the claim (signature / validator identity, replay protection) and queues a settlement transaction; NS may notify the submitting VP when settlement is queued/confirmed ([ns-node/src/services/ledger-settlement-confirmation.ts](../ns-node/src/services/ledger-settlement-confirmation.ts)).
4. VP receives the notification and updates local claim state (SUBMITTED → SETTLED). The requeue worker ensures reliability for transient failure ([vp-node/claim-requeue-worker.ts](../vp-node/claim-requeue-worker.ts)).
5. Validators that misbehave (missed slots, equivocation) can be penalized: VP prepares `SLASHEVIDENCE`, submits to NS, and NS enforces slashing rules according to governance parameters (see [wiki/Producer/CN-07-E.md](../Producer/CN-07-E.md) and [wiki/Governance/GOVERNANCE.md](../Governance/GOVERNANCE.md)).

---

## Where to find more detail

- Producer reward prototype & design: [wiki/Producer/CN-08-A-Fee-Distribution.md](../Producer/CN-08-A-Fee-Distribution.md) and [vp-node/fee-distribution-service.ts](../vp-node/fee-distribution-service.ts)
- VP-side persistence & requeue worker: [wiki/Producer/CN-08-C-Reward-Persistence.md](../Producer/CN-08-C-Reward-Persistence.md) and [vp-node/reward-claims-db-service.ts](../vp-node/reward-claims-db-service.ts) / [vp-node/claim-requeue-worker.ts](../vp-node/claim-requeue-worker.ts)
- NS-side claim processing: [wiki/ns-node/CN-08-B-Reward-Processor.md](../ns-node/CN-08-B-Reward-Processor.md) and [ns-node/src/services/ledger-reward-processor.ts](../ns-node/src/services/ledger-reward-processor.ts)
- NS→VP settlement confirmation: [wiki/ns-node/CN-08-E-Settlement-Confirmations.md](../ns-node/CN-08-E-Settlement-Confirmations.md) and [ns-node/src/services/ledger-settlement-confirmation.ts](../ns-node/src/services/ledger-settlement-confirmation.ts)
- Staking / Validator economics: [wiki/Technical/TOKENOMICS.md](../Technical/TOKENOMICS.md) and [wiki/Tokenomics-and-Economics/VALIDATOR_ECONOMICS.md](../Tokenomics-and-Economics/VALIDATOR_ECONOMICS.md)
- Slashing & dispute: [wiki/Governance/GOVERNANCE.md](../Governance/GOVERNANCE.md), [wiki/Producer/CN-07-E.md](../Producer/CN-07-E.md) and [wiki/Security/SECURITY-TRUST.md](../Security/SECURITY-TRUST.md)
- Transparency & audit: [wiki/transparency-record-schema.md](../transparency-record-schema.md) and [governance/wp_publish_log.jsonl](../governance/wp_publish_log.jsonl)

---

If you'd like a deeper, developer-focused reference (API shapes, database schema, or code cross-references), tell me whether you want: (A) a developer's quickstart for building reward/settlement clients; (B) a security checklist for production signing/certificates and replay-proof transports; or (C) integration guides for tests/CI. I can add that next.

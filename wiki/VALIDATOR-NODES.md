# Validator Nodes — External Verification Nodes

Version: 0.1
Date: 2025-11-11

Validator nodes are specialized participants that verify submitted Swarm Signals, run deterministic benchmarks, and produce signed attestations that feed into consensus and confidence scoring.

## Role

- Fetch artifacts (CIDs) and env manifests from IPFS.
- Reconstruct the runtime (container/image digest or env spec) and run deterministic verification.
- Produce signed attestations (PASS/FAIL + metrics) and post them on-chain or via batched merkle roots.

## Requirements

- Heavier software footprint than NS Nodes (full runtime, benchmarks, model patching tools).
- Optional GPU support for heavier verification or model delta application.
- Optional TEE/SGX attestation support for enhanced trust guarantees.
- Stable network and availability; ideally run by organizations or dedicated operators.

## Incentives & economics

- Validators must stake NST to be eligible and are subject to slashing for proven malicious behavior.
- Receive base rewards for participation and alignment bonuses when votes match final consensus.
- Reputation increases for accurate attestations; reputation affects selection weight.

## Distinction from NS Nodes

- NS Nodes are lightweight, user-facing agents that primarily power local interaction and may opt-in for light validation.
- Validator nodes are dedicated verifiers with stronger hardware and availability requirements and are the canonical executors of verification tasks.

## Workflow (compact)

1. Proposal appears on-chain with `artifactCID`.
2. Validator assigned fetches artifact, runs deterministic tests, and computes metrics.
3. Validator signs and posts attestation (on-chain or via aggregator).
4. Aggregator computes confidence and triggers finalization.

---

## See also
- `./GLOBAL-BRAIN.md`
- `./IPFS-storage.md`
- `./TERMS.md`
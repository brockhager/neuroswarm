# NeuroSwarm — GitHub Structure Guide

This file is the canonical guide for repository layout, ownership, developer workflows, and integration patterns for the NeuroSwarm project. It targets core contributors, integrators, ops engineers, and new joiners.

## Project overview

NeuroSwarm is a decentralized AI platform where personal chatbots run locally and contribute to a shared Global Brain via Solana blockchain and IPFS storage. The goal is to enable collaborative, auditable knowledge sharing with economic incentives. High-level architecture includes web chat interfaces, installed gateway/indexer services, Solana programs for consensus, and IPFS for artifact persistence.

## Repository layout and responsibilities

- neuro-shared: Contains shared types, schemas, and codegen scripts for cross-repo consistency. Responsibilities include maintaining canonical data contracts and generating client libraries for Rust, TypeScript, and Python.
- neuro-program: Solana program for on-chain consensus, staking, and reward distribution. Responsibilities include implementing PDAs for submissions, attestations, and governance votes.
- neuro-services: Backend services for gateway, indexer, and common utilities. Responsibilities include handling API requests, indexing events, and providing discovery interfaces.
- neuro-web: Frontend web application for chatbot interactions. Responsibilities include user interface for chat, artifact display, and integration with gateway APIs.
- neuro-infra: Infrastructure as code for deployment, CI/CD, and local development. Responsibilities include Terraform configs, Docker images, and bootstrap scripts for multi-repo setups.

For neuro-services, subpackage structure includes /gateway (API handlers, rate limiting), /indexer (event ingestion, search), and /common (shared utilities, config). Example files: /gateway/src/routes.rs, /indexer/src/ingest.rs, /common/src/types.rs.

Recommended directory tree for neuro-shared:
```
neuro-shared/
├── src/
│   ├── schemas/
│   │   ├── manifest.ts
│   │   └── attestation.ts
│   └── types/
│       └── index.ts
├── scripts/
│   ├── gen_borsh.rs
│   └── gen_ts.py
├── Cargo.toml
└── package.json
```

Recommended directory tree for neuro-program:
```
neuro-program/
├── programs/
│   └── neuro/
│       ├── src/
│       │   ├── lib.rs
│       │   └── instructions/
│       └── Cargo.toml
├── tests/
│   └── neuro.ts
├── Anchor.toml
└── package.json
```

Recommended directory tree for neuro-services:
```
neuro-services/
├── gateway/
│   ├── src/
│   │   ├── main.rs
│   │   └── routes.rs
│   └── Cargo.toml
├── indexer/
│   ├── src/
│   │   ├── main.rs
│   │   └── ingest.rs
│   └── Cargo.toml
├── common/
│   ├── src/
│   │   └── types.rs
│   └── Cargo.toml
└── docker-compose.yml
```

Recommended directory tree for neuro-web:
```
neuro-web/
├── src/
│   ├── components/
│   │   ├── Chat.tsx
│   │   └── Artifact.tsx
│   ├── pages/
│   │   └── index.tsx
│   └── utils/
│       └── api.ts
├── public/
├── package.json
└── next.config.js
```

Recommended directory tree for neuro-infra:
```
neuro-infra/
├── terraform/
│   ├── main.tf
│   └── variables.tf
├── docker/
│   ├── gateway.Dockerfile
│   └── indexer.Dockerfile
├── scripts/
│   ├── bootstrap.sh
│   └── localnet.sh
└── .github/
    └── workflows/
        └── ci.yml
```

## Interface contracts and shared artifacts

neuro-shared publishes canonical artifacts: TypeScript schemas, Rust Borsh structs, and codegen scripts. Exact files: src/schemas/manifest.ts, src/schemas/attestation.ts, scripts/gen_borsh.rs, scripts/gen_ts.py.

Manifest data contract:
- submitter: string (public key)
- cid: string (IPFS hash)
- confidence: number (0-100)
- timestamp: number (unix epoch)
- metadata: object (optional key-value pairs)

Attestation data contract:
- validator: string (public key)
- manifest_cid: string (IPFS hash)
- result: boolean (true/false)
- signature: string (ed25519 sig)
- timestamp: number (unix epoch)

neuro-program imports Borsh structs from neuro-shared for PDA rules. neuro-services and neuro-web consume TypeScript types via npm publish. Version rules: neuro-shared publishes prerelease for changes; dependents pin to exact versions and update via PR.

## Development workflows and local bootstrap

Run bootstrap with neuro-infra script: `./neuro-infra/scripts/bootstrap.sh --repos neuro-shared,neuro-program,neuro-services,neuro-web --env local`.

Unit tests: neuro-shared: `npm test`; neuro-program: `anchor test`; neuro-services: `cargo test`; neuro-web: `npm test`; neuro-infra: `terraform validate`.

E2E smoke test: Use neuro-infra to start localnet, then run `./neuro-infra/scripts/e2e.sh` which deploys program, starts services, and verifies web chat.

Hot-toggle for neuro-services: Set env var `SERVICE_MODE=gateway` to run only gateway; `SERVICE_MODE=indexer` for indexer. Config in neuro-services/common/src/config.rs.

## CI / CD and release process

neuro-shared: Lint, unit tests, publish to npm/crates.io. neuro-program: Lint, Anchor tests. neuro-services: Lint, unit tests, integration with local Solana. neuro-web: Lint, unit tests, build check. neuro-infra: Terraform validate, Docker build.

Sample GitHub Actions for integration job:
```yaml
name: e2e-integration
on: [push]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          repository: neuroswarm/neuro-shared
          path: shared
      - uses: actions/checkout@v3
        with:
          repository: neuroswarm/neuro-program
          path: program
      - run: ./program/anchor test
      - run: ./shared/scripts/e2e.sh
```

Release rules: neuro-shared publishes prerelease for breaking changes. Dependents update to prerelease, run integration CI, then promote to stable.

## Cross-repo change policy and PR checklist

1. Start changes in neuro-shared if affecting contracts.
2. Publish prerelease from neuro-shared.
3. Update dependent repos to prerelease version.
4. Run integration tests across affected repos.
5. Merge PRs in dependency order: shared → program → services → web → infra.

Required reviewers: neuro-program: security reviewer; neuro-services: ops reviewer; neuro-web: UX/QA reviewer.

PR template:
```
## Summary
Brief description.

## Affected repos
List repos impacted.

## Migration steps
How to update dependents.

## Risk level
Low/Medium/High.

## Test plan
Steps to verify.

## Rollback plan
How to revert.
```

## Example commands and templates

Clone minimal repos:
```
git clone https://github.com/neuroswarm/neuro-shared.git
git clone https://github.com/neuroswarm/neuro-program.git
```

Start local bootstrap:
```
cd neuro-infra && ./scripts/bootstrap.sh --env local
```

Run Anchor tests:
```
cd neuro-program && anchor test
```

Build and run neuro-services gateway only:
```
cd neuro-services && SERVICE_MODE=gateway cargo run --bin gateway
```

Generate code from neuro-shared:
```
cd neuro-shared && npm run gen && git diff --exit-code
```

OpenAPI example for GET /gw/artifact/:hash:
```json
{
  "path": "/gw/artifact/{hash}",
  "method": "GET",
  "responses": {
    "200": {
      "description": "Provenance payload",
      "schema": {
        "type": "object",
        "properties": {
          "cid": {"type": "string"},
          "submitter": {"type": "string"},
          "confidence": {"type": "number"},
          "attestations": {"type": "array", "items": {"type": "object"}}
        }
      }
    }
  }
}
```

## Acceptance criteria and demo checklist

- Web chat connects to gateway and displays CID + tx signature; verify via browser dev tools.
- neuro-program devnet deploy with init/attest/finalize works; check Solana explorer for PDAs.
- Indexer ingests events and returns search results; query /index/search?term=example and assert non-empty response.
- Verify-before-serve enforced; submit invalid artifact and confirm rejection with error code.
- Gateway caches responses; hit same endpoint twice and verify <1s response time.
- Staking on-chain via neuro-program; submit stake tx and confirm balance update.
- Cross-repo integration passes; run e2e script and assert all services healthy.
- Reputation scoring updates; simulate attestations and check indexer reputation endpoint.
- IPFS pinning incentivized; submit artifact and verify pinning tx in logs.
- Governance vote recorded; cast vote via web and confirm on-chain event.
- Local bootstrap completes in <5min; time bootstrap.sh and assert success.
- Hot-toggle services work; run gateway only and confirm indexer not running.
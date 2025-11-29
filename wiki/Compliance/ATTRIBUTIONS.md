ATTRIBUTIONS
============

This file lists third-party libraries, assets, contributors and license attributions included in the NeuroSwarm repository for compliance and release auditing.

Release: v0.2.0 (Release Candidate)
Date: 2025-11-29

Core repository: brockhager/neuro-infra

Primary authors and maintainers
- Brock Hager (brockhager) — Technical lead and maintainer
- NeuroSwarm contributors — see repository contributors list and individual package AUTHORS/CHANGELOG files

Third-Party Libraries and Runtime Dependencies
------------------------------------------------
The project is a polyglot monorepo with components written in TypeScript, Node.js, Rust, and Shell scripts. Below are the notable third-party libraries and their attribution notes. This list is focused on packaged runtime and build-time dependencies that require acknowledgements.

- Node / npm ecosystem
  - express — MIT (server components)
  - prom-client — MIT (metrics)
  - jsonwebtoken — MIT (token generation & tests)
  - winston — MIT (logging, admin-node)
  - playwright — Apache-2.0 (E2E testing)
  - pnpm — BSD-style (package manager)

- Rust ecosystem
  - tracing — MIT/Apache-2.0 (structured logging)
  - tokio — MIT/Apache-2.0 (async runtime)

- Solana & Anchor
  - @coral-xyz/anchor — Apache-2.0 (smart contract tooling & testing)

- Other notable attributions
  - Helia / IPFS helpers — MIT/Apache depending on module
  - Ollama integration examples — usage falls under upstream license and local examples

License guidance
----------------
- Core repo license files (see package roots) should be referenced for precise terms (for example: repo-level LICENSE, per-package LICENSE files and third-party NOTICE files).
- The project uses permissive, open-source components; follow upstream licenses for redistribution and attribution.

Assets, icons and 3rd-party content
----------------------------------
- Any third-party artwork, icons, or binary assets included under particular licenses should be listed by package. Please see individual package README files (e.g. neuroswarm/admin-node, neuro-web/public) for specific asset credits where applicable.

Contributors
------------
This project has many contributors across multiple packages. For the canonical list of contributors and attribution details please refer to the repository's GitHub contributors page and the package-specific AUTHORS/CHANGELOG files contained in each package folder.

Contact
-------
If you believe an attribution is missing or incorrect, open an issue in the repository and tag @brockhager and @Agent-5 so we can resolve it prior to the final tag.

— NeuroSwarm Release Engineering

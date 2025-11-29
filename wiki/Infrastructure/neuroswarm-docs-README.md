# neuroswarm — Documentation

Welcome to the documentation hub for the neuroswarm project. This `docs/README.md` is the canonical starting place for project-level documentation. Use this file to link to module docs, architecture notes, user guides, and developer HOWTOs.

## Quick links

Jump directly to the main documentation pages in this folder:

- [Overview](./overview.md) — What is NeuroSwarm and why it matters
- [Getting Started](./getting-started.md) — Setup and quickstart guide
- [Development Guide](./development.md) — Developer workflow and coding standards
- [Architecture](./architecture.md)
- [Decentralized Chatbot System](./decentralized-chatbot-system.md)
- [Global Brain Design](./global-brain-design.md)
- [Governance](./governance/governance.md)
- [Master Documentation Outline](./master-documentation-outline.md)
- [Personal AI Economy](./personal-ai-economy.md)
- [Terms & Metaphors (glossary)](./TERMS.md)
- [Tokenomics (NST)](./TOKENOMICS.md)
- [Economics](./ECONOMICS.md)
- [GitHub Structure](./github-structure.md)
- [This index (README)](./README.md)

### Contributor Playbooks
- [Adding a Validator Node](./playbooks/adding-validator.md) — Step-by-step guide for deploying validator nodes
- [Extending the Indexer](./playbooks/extending-indexer.md) — Guide for adding new search and indexing capabilities
- [Writing Tests](./playbooks/writing-tests.md) — Comprehensive testing guide for code quality assurance

### Community & Governance
- [Contributor Recognition & Governance](./governance/contributor-recognition.md) — Recognition system, governance processes, and community scaling
- [Governance Charter & Decision Framework](./governance/governance-charter.md) — Formal governance structure, decision-making rules, and conflict resolution
- [Voting System](./governance/voting.md) — Comprehensive voting processes, badge-weighted participation, and decision thresholds
- [Living Documentation Processes](./governance/living-documentation.md) — Automated documentation generation, validation, and maintenance
- [Contributor Portal](./governance/contributor-portal.md) — Unified knowledge base, learning paths, and community hub
- [Workshop Template](./governance/workshop-template.md) — Complete guide for running NeuroSwarm contributor workshops
- [Code of Conduct](./governance/code-of-conduct.md) — Community standards and enforcement guidelines

### Technical Infrastructure
- [IPFS Storage](./IPFS-storage.md)
- [Security & Trust](./SECURITY-TRUST.md)
- [Extensions](./EXTENSIONS.md)
- [Global Brain](./GLOBAL-BRAIN.md)

### Project Management
- [Objectives](./governance/objectives.md)
- [Kanban Board](./governance/kanban.md)
- [Todo List](./todo.md)

### Research & Concepts
- [Definition of Trusted Data](./Definition%20of%20Trusted%20Data%20and%20the%20Fight%20Against%20Misinformation.md)


## Purpose

This folder is where we collect all design documentation, architecture diagrams, usage guides, and contribution notes for the neuroswarm system. Keep docs in Markdown and prefer short, focused pages that link together.

## Suggested structure

- docs/README.md — this file (project docs index)
- docs/architecture.md — high-level architecture and system components
- docs/getting-started.md — setup and quickstart for contributors and users
- docs/development.md — developer workflow, build, tests, and code style
- docs/modules/<module>.md — per-module documentation
- docs/diagrams/ — images and diagrams (keep sources in `diagrams-src/` if needed)

## How to add docs

1. Create a new Markdown file under `docs/` with a descriptive name.
2. Link it from `docs/README.md` or an appropriate index page.
3. Follow the repo Markdown and style conventions. Keep sentences short and include examples where helpful.

## Doc template (suggested)

- Title
- Short summary (1–2 paragraphs)
- Why it exists (purpose)
- Usage examples or code snippets
- Configuration and environment notes
- Links to related docs and issues

## Contribution

- Open a draft as a branch named `docs/<short-topic>`.
- Include a short description in the PR body about what the page adds or updates.
- Non-controversial fixes (typos, formatting) can be pushed directly if you have commit access.

## Next steps

✅ **Completed:**
- Added `getting-started.md` with setup and run guide
- Added `development.md` with workflow, build, tests, and code style
- Added comprehensive documentation linking

🔄 **In Progress:**
- Review and update existing documentation for consistency
- Add API documentation links for each service
- Create deployment guides for different environments

📋 **Future:**
- Add troubleshooting guides
- Create video tutorials for complex setups
- Implement automated documentation generation

---

If you want a specific page created next (for example `getting-started.md`), tell me which one and I can add it now.

## Master documentation

This repo now includes a master documentation outline that centralizes the entire design and suggested documentation flow.

- [Master Documentation Outline](./master-documentation-outline.md)

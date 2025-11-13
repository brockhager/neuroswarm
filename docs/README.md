# NeuroSwarm Documentation Hub# neuroswarm — Documentation



Welcome to the NeuroSwarm documentation! This repository contains comprehensive documentation for the decentralized AI ecosystem. All documentation is organized by subsystem and purpose for easy navigation.Welcome to the documentation hub for the neuroswarm project. This `docs/README.md` is the canonical starting place for project-level documentation. Use this file to link to module docs, architecture notes, user guides, and developer HOWTOs.



## 📁 Documentation Structure## Quick links



### 🎯 [General](./general/)Jump directly to the main documentation pages in this folder:

Project overviews, subsystem READMEs, and general project information.

- **[Overview](./general/overview.md)** - High-level project vision and purpose- [Overview](./overview.md) — What is NeuroSwarm and why it matters

- **[Contributing Guidelines](./general/CONTRIBUTING.md)** - How to contribute to NeuroSwarm- [Getting Started](./getting-started.md) — Setup and quickstart guide

- **Subsystem READMEs** - Individual component documentation- [Development Guide](./development.md) — Developer workflow and coding standards

  - [neuro-program](./general/neuro-program-README.md)- [Architecture](./architecture.md)

  - [neuro-services](./general/neuro-services-README.md)- [Decentralized Chatbot System](./decentralized-chatbot-system.md)

  - [neuro-web](./general/neuro-web-README.md)- [Global Brain Design](./global-brain-design.md)

  - [neuro-shared](./general/neuro-shared-README.md)- [Governance](./governance/governance.md)

  - [neuro-runner](./general/neuro-runner-README.md)- [Master Documentation Outline](./master-documentation-outline.md)

  - [neuro-infra](./general/neuro-infra-README.md)- [Personal AI Economy](./personal-ai-economy.md)

- [Terms & Metaphors (glossary)](./TERMS.md)

### 🏛️ [Governance](./governance/)- [Tokenomics (NST)](./TOKENOMICS.md)

Democratic decision-making, voting, and community processes.- [Economics](./ECONOMICS.md)

- **[Governance Charter](./governance/governance-charter.md)** - Core governance principles- [GitHub Structure](./github-structure.md)

- **[How to Vote](./governance/how-to-vote.md)** - Voting mechanics and procedures- [This index (README)](./README.md)

- **[Contributor Portal](./governance/contributor-portal.md)** - Contributor management system

- **[Kanban Board](./governance/kanban.md)** - Project management workflow### Contributor Playbooks

- **[Code of Conduct](./governance/code-of-conduct.md)** - Community standards- [Adding a Validator Node](./playbooks/adding-validator.md) — Step-by-step guide for deploying validator nodes

- **[Objectives](./governance/objectives.md)** - Project goals and milestones- [Extending the Indexer](./playbooks/extending-indexer.md) — Guide for adding new search and indexing capabilities

- [Writing Tests](./playbooks/writing-tests.md) — Comprehensive testing guide for code quality assurance

### 🌐 [Networking](./networking/)

Node architecture, peer-to-peer systems, and network protocols.### Community & Governance

- **[Node Design](./networking/NODE-DESIGN.md)** - Overall node architecture- [Contributor Recognition & Governance](./governance/contributor-recognition.md) — Recognition system, governance processes, and community scaling

- **[Gateway Nodes](./networking/GATEWAY-NODES.md)** - API gateway functionality- [Governance Charter & Decision Framework](./governance/governance-charter.md) — Formal governance structure, decision-making rules, and conflict resolution

- **[Indexer Nodes](./networking/INDEXER-NODES.md)** - Data indexing and search- [Voting System](./governance/voting.md) — Comprehensive voting processes, badge-weighted participation, and decision thresholds

- **[Validator Nodes](./networking/VALIDATOR-NODES.md)** - Consensus and validation- [Living Documentation Processes](./governance/living-documentation.md) — Automated documentation generation, validation, and maintenance

- **[Indexing Discovery](./networking/INDEXING-DISCOVERY.md)** - Peer discovery mechanisms- [Contributor Portal](./governance/contributor-portal.md) — Unified knowledge base, learning paths, and community hub

- [Workshop Template](./governance/workshop-template.md) — Complete guide for running NeuroSwarm contributor workshops

### 💻 [Program](./program/)- [Code of Conduct](./governance/code-of-conduct.md) — Community standards and enforcement guidelines

Blockchain smart contracts, Solana integration, and core protocols.

- **[Architecture](./program/architecture.md)** - System architecture overview### Technical Infrastructure

- **[Solana Testnet](./program/solana-testnet.md)** - Testnet deployment guide- [IPFS Storage](./IPFS-storage.md)

- **[Transparency Record Schema](./program/transparency-record-schema.md)** - Data structure definitions- [Security & Trust](./SECURITY-TRUST.md)

- [Extensions](./EXTENSIONS.md)

### 🔧 [Services](./services/)- [Global Brain](./GLOBAL-BRAIN.md)

Backend APIs, data storage, and service integrations.

- **[Extensions](./services/EXTENSIONS.md)** - Service extension framework### Project Management

### Project Management

- **[Kanban Board](./governance/kanban.md)** - Project management workflow
- **[Board State](../neuro-infra/docs/board_state.json)** - Current Kanban board snapshot
- **[Publish Log](../neuro-infra/docs/wp_publish_log.jsonl)** - Audit trail of all file operations
- **[Objectives](./governance/objectives.md)** - Project goals and milestones

### 🌐 [Web](./web/)- [Todo List](./todo.md)

Frontend interfaces, user experience, and web applications.

- **[Decentralized Chatbot](./web/decentralized-chatbot-system.md)** - AI chat interface design### Research & Concepts

- [Definition of Trusted Data](./Definition%20of%20Trusted%20Data%20and%20the%20Fight%20Against%20Misinformation.md)

### 🏗️ [Infrastructure](./infra/)

Repository management, CI/CD, and development tooling.

- **[GitHub Structure](./infra/github-structure.md)** - Repository organization## Purpose



### 🚀 [Onboarding](./onboarding/)This folder is where we collect all design documentation, architecture diagrams, usage guides, and contribution notes for the neuroswarm system. Keep docs in Markdown and prefer short, focused pages that link together.

Getting started guides for new contributors.

- **[Quickstart Guide](./onboarding/quickstart.md)** - 15-minute contributor onboarding## Suggested structure

- **[Getting Started](./onboarding/getting-started.md)** - Detailed technical setup

- docs/README.md — this file (project docs index)

### 📚 [Miscellaneous](./misc/)- docs/architecture.md — high-level architecture and system components

Additional documentation, economics, and project materials.- docs/getting-started.md — setup and quickstart for contributors and users

- **[Development Guide](./misc/development.md)** - Development workflow and standards- docs/development.md — developer workflow, build, tests, and code style

- **[Security & Trust](./misc/SECURITY-TRUST.md)** - Security policies and procedures- docs/modules/<module>.md — per-module documentation

- **[Economics](./misc/ECONOMICS.md)** - Economic model and incentives- docs/diagrams/ — images and diagrams (keep sources in `diagrams-src/` if needed)

- **[Tokenomics](./misc/TOKENOMICS.md)** - Token distribution and utility

- **[Global Brain](./misc/GLOBAL-BRAIN.md)** - Collective intelligence design## How to add docs

- **[Terms](./misc/TERMS.md)** - Legal and usage terms

- **[Story Refinement Checklist](./misc/STORY-REFINEMENT-CHECKLIST.md)** - Quality assurance for tasks1. Create a new Markdown file under `docs/` with a descriptive name.

- **[Enterprise Adoption](./misc/ENTERPRISE-ADOPTION-MATERIALS.md)** - Business integration guides2. Link it from `docs/README.md` or an appropriate index page.

3. Follow the repo Markdown and style conventions. Keep sentences short and include examples where helpful.

#### 📁 Subdirectories in Misc

- **[Events](./misc/events/)** - Community events and meetups## Doc template (suggested)

- **[Playbooks](./misc/playbooks/)** - Step-by-step contributor guides

- **[Proposals](./misc/proposals/)** - Governance proposals and RFCs- Title

- Short summary (1–2 paragraphs)

## 🗺️ Navigation Guide- Why it exists (purpose)

- Usage examples or code snippets

### For New Contributors- Configuration and environment notes

1. Start with **[Quickstart Guide](./onboarding/quickstart.md)**- Links to related docs and issues

2. Read the **[Overview](./general/overview.md)**

3. Check **[Contributing Guidelines](./general/CONTRIBUTING.md)**## Contribution

4. Follow **[Getting Started](./onboarding/getting-started.md)** for technical setup

- Open a draft as a branch named `docs/<short-topic>`.

### For Developers- Include a short description in the PR body about what the page adds or updates.

1. Review **[Architecture](./program/architecture.md)**- Non-controversial fixes (typos, formatting) can be pushed directly if you have commit access.

2. Check subsystem READMEs in **[General](./general/)**

3. Follow **[Development Guide](./misc/development.md)**## Next steps

4. Use **[Kanban Board](./governance/kanban.md)** for task management

✅ **Completed:**

### For Governance Participants- Added `getting-started.md` with setup and run guide

1. Read **[Governance Charter](./governance/governance-charter.md)**- Added `development.md` with workflow, build, tests, and code style

2. Learn **[How to Vote](./governance/how-to-vote.md)**- Added comprehensive documentation linking

3. Access **[Contributor Portal](./governance/contributor-portal.md)**

🔄 **In Progress:**

### For System Architects- Review and update existing documentation for consistency

1. Study **[Node Design](./networking/NODE-DESIGN.md)**- Add API documentation links for each service

2. Review **[Architecture](./program/architecture.md)**- Create deployment guides for different environments

3. Understand **[Global Brain](./misc/GLOBAL-BRAIN.md)** design

📋 **Future:**

## 📝 Documentation Standards- Add troubleshooting guides

- Create video tutorials for complex setups

All documentation follows these standards:- Implement automated documentation generation

- **Markdown format** with consistent heading hierarchy

- **Relative links** for internal navigation---

- **Clear categorization** by subsystem and purpose

- **Regular updates** to maintain accuracyIf you want a specific page created next (for example `getting-started.md`), tell me which one and I can add it now.

- **Contributor-friendly** organization

## Master documentation

## 🔍 Finding Documentation

This repo now includes a master documentation outline that centralizes the entire design and suggested documentation flow.

- **Search by topic**: Use GitHub search within `/docs/`

- **Browse by category**: Use the structure above- [Master Documentation Outline](./master-documentation-outline.md)

- **Check cross-references**: Most docs link to related materials
- **Ask the community**: Discord #documentation channel

## 🤝 Contributing to Documentation

Documentation is a core part of NeuroSwarm. See **[Contributing Guidelines](./general/CONTRIBUTING.md)** for how to:
- Add new documentation
- Update existing content
- Maintain link integrity
- Follow documentation standards

---

*This documentation hub is maintained by the NeuroSwarm community. Last updated: November 12, 2025*
# Contributing to NeuroSwarm

Thank you for your interest in contributing to NeuroSwarm! This guide covers how to contribute to our decentralized AI ecosystem, including code, documentation, governance, and community activities.

## 🚀 Quick Start

1. **Read the [Quickstart Guide](../onboarding/quickstart.md)** - Get oriented in 15 minutes
2. **Set up your environment** following [Getting Started](../onboarding/getting-started.md)
3. **Pick an issue** from the [Kanban board](../governance/kanban.md)
4. **Join our community** on [Discord](https://discord.gg/neuroswarm)

## 📝 Documentation Structure

All documentation must be placed in the `/docs/` directory with proper categorization:

### 📁 Documentation Organization Rules

| File Type | Location | Examples |
|-----------|----------|----------|
| **Subsystem READMEs** | `/docs/general/` | Component documentation, API guides |
| **Governance Docs** | `/docs/governance/` | Voting procedures, charters, contributor portal |
| **Technical Architecture** | `/docs/program/` | Smart contracts, blockchain integration |
| **Network/Node Docs** | `/docs/networking/` | Gateway, indexer, validator specifications |
| **API Services** | `/docs/services/` | Backend services, storage, extensions |
| **Web Interfaces** | `/docs/web/` | Frontend design, user experience |
| **Infrastructure** | `/docs/infra/` | Repository management, CI/CD, tooling |
| **Getting Started** | `/docs/onboarding/` | Quickstart guides, setup tutorials |
| **Everything Else** | `/docs/misc/` | Economics, security, proposals, events |

### 📋 Documentation Standards

- **Use Markdown** (.md) format exclusively
- **Relative links** for internal references (e.g., `../governance/kanban.md`)
- **Clear headings** with consistent hierarchy
- **Cross-reference** related documentation
- **Update links** when moving or renaming files

### 🚫 Documentation Rules

- **Never place .md files outside `/docs/`** - The sync agent will reject such PRs
- **Keep filenames descriptive** and consistent with existing patterns
- **Update navigation** when adding new documentation sections

## 💻 Code Contributions

### Development Workflow

1. **Fork and clone** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make changes** following our [development guide](../misc/development.md)
4. **Write tests** for new functionality
5. **Update documentation** if needed
6. **Commit with clear messages**: `git commit -m 'Add: feature description'`
7. **Push and create PR**

## 📁 File Placement Rules

To maintain a clean and organized monorepo structure, all files must be placed in their appropriate subsystem directories. The sync agent and CI will automatically enforce these rules.

### Monorepo Structure

```
neuroswarm/
├── neuro-program/     # Solana programs and smart contracts
├── neuro-services/    # Backend APIs and services  
├── neuro-web/         # Frontend interfaces
├── neuro-shared/      # Shared utilities and types
├── neuro-runner/      # Node runner and orchestration
├── neuro-infra/       # Infrastructure and deployment
└── docs/              # All documentation
```

### Placement Rules

- **Code files**: Place in the appropriate subsystem directory (e.g., `neuro-program/src/`, `neuro-services/src/`)
- **Configuration files**: Place in subsystem root (e.g., `neuro-program/package.json`, `neuro-program/Cargo.toml`)
- **Documentation**: All `.md` files must go in `docs/` subdirectories
- **Scripts and tooling**: Place in `neuro-infra/scripts/` or subsystem-specific locations
- **CI/CD workflows**: Place in `neuro-infra/.github/workflows/`

### 🚫 Prohibited Locations

- **Never place files in the monorepo root** - CI will reject PRs with stray files
- **No code outside subsystem directories** - Except shared utilities in `neuro-shared/`
- **No documentation outside `docs/`** - Use appropriate subdirectories

### Automated Enforcement

- **Sync agent**: Automatically moves misplaced files during PR review
- **CI checks**: Fail PRs with files in prohibited locations
- **Audit logging**: All file moves are logged in `wp_publish_log.jsonl`

Violations will be automatically corrected, but please follow these rules to avoid delays in your PR review.

### Code Standards

- **TypeScript/JavaScript**: Follow ESLint rules and Prettier formatting
- **Rust**: Follow standard Rust formatting (`cargo fmt`)
- **Solana/Anchor**: Follow program development best practices
- **Testing**: Write unit and integration tests
- **Documentation**: Document public APIs and complex logic

### Subsystem-Specific Guidelines

Each subsystem has its own README with specific contribution guidelines:
- **[neuro-program](../general/neuro-program-README.md)** - Smart contracts and blockchain logic
- **[neuro-services](../general/neuro-services-README.md)** - Backend APIs and services
- **[neuro-web](../general/neuro-web-README.md)** - Frontend interfaces
- **[neuro-shared](../general/neuro-shared-README.md)** - Shared utilities and types
- **[neuro-runner](../general/neuro-runner-README.md)** - Node runner and orchestration
- **[neuro-infra](../general/neuro-infra-README.md)** - Infrastructure and deployment

## 🏛️ Governance Contributions

### Becoming a Contributor

1. **Complete onboarding** via the [contributor portal](../governance/contributor-portal.md)
2. **Earn badges** by completing tasks and following [badge incentives](../misc/badge-incentive-system.md)
3. **Participate in governance** by voting on proposals

### Governance Participation

- **Read the [governance charter](../governance/governance-charter.md)**
- **Learn [how to vote](../governance/how-to-vote.md)**
- **Join working groups** that interest you
- **Propose changes** through the governance process

## 📚 Documentation Contributions

### Adding Documentation

1. **Identify the correct category** using the table above
2. **Check for existing content** to avoid duplication
3. **Follow the [documentation standards](../misc/development.md#documentation)**
4. **Update navigation** in relevant index files
5. **Cross-link** to related documentation

### Documentation Maintenance

- **Keep docs current** with code changes
- **Fix broken links** immediately
- **Update examples** when APIs change
- **Translate** popular docs to other languages

## 🧪 Testing

### Running Tests

```bash
# All subsystems
npm test

# Specific subsystem
cd neuro-services && npm test
cd neuro-program && cargo test
```

### Test Coverage

- **Unit tests** for individual functions/components
- **Integration tests** for subsystem interactions
- **End-to-end tests** for critical user journeys
- **Documentation tests** for code examples

## 🔒 Security

- **Report security issues** privately via security@neuroswarm.org
- **Follow the [security guidelines](../misc/SECURITY-TRUST.md)**
- **Never commit secrets** or private keys
- **Use secure coding practices** in all contributions

## 📋 Pull Request Process

### Before Submitting

- [ ] **Tests pass** locally
- [ ] **Code follows style guidelines**
- [ ] **Documentation updated** if needed
- [ ] **Breaking changes documented**
- [ ] **PR description** clearly explains the change
- [ ] **Linked issues** are referenced

### PR Review Process

1. **Automated checks** run (linting, tests, documentation)
2. **Peer review** by maintainers
3. **Governance review** for significant changes
4. **Merge** after approval

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🎯 Recognition & Rewards

- **Badges** for completed contributions
- **Token rewards** for valuable work
- **Governance voting rights** based on contribution level
- **Community recognition** in Discord and contributor portal

## 📞 Getting Help

- **Discord**: Real-time community support
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Search our [knowledge base](../governance/contributor-portal.md)
- **Mentorship**: Pair with experienced contributors

## 📜 Code of Conduct

Please read and follow our [Code of Conduct](../governance/code-of-conduct.md). We are committed to providing a welcoming and inclusive environment for all contributors.

---

*Thank you for contributing to NeuroSwarm! Your work helps build the future of decentralized AI.*
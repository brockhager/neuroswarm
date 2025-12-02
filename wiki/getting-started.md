# ⚠️ This document has moved
> **This document has moved to the NeuroSwarm Wiki.** Please see the canonical Getting Started guide on the wiki: https://github.com/brockhager/neuro-infra/wiki/Getting-Started

# Getting Started

Welcome to NeuroSwarm! This guide will help you get up and running with the project quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or later) - [Download](https://nodejs.org/)
- **Rust** (latest stable) - [Install](https://rustup.rs/)
- **Docker** (optional, for running services) - [Download](https://docker.com/)
- **Git** - [Download](https://git-scm.com/)

## Quick Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/brockhager/neuroswarm.git
   cd neuroswarm
   ```

2. **Install dependencies for all modules:**
   ```bash
   # Services API
   cd neuro-services
   npm install
   cd ..

   # Web interface (if applicable)
   cd neuro-web
   npm install
   cd ..

   # Shared libraries
   cd neuro-shared
   npm install
   cd ..
   ```

3. **Build the Rust components:**
   ```bash
   cd neuro-infra
   cargo build
   cd ..
   ```

## Running the Services

### Development Mode

Start the services API in development mode:
```bash
cd neuro-services
npm run dev
```

The API will be available at `http://localhost:3000`

### With Monitoring

Start the full monitoring stack:
```bash
cd neuro-services
npm run monitoring:start
```

This starts:
- Services API on port 3000
- Prometheus on port 9090
- Grafana on port 3001

### Production Mode

Build and run in production:
```bash
cd neuro-services
npm run build
npm start
```

## Testing

Run tests for all components:
```bash
# Services
cd neuro-services
npm test

# Rust components
cd neuro-infra
cargo test
```

## Development Workflow

1. **Pick an issue** from the [Kanban board](../Governance/kanban.md)
2. **Create a feature branch:** `git checkout -b feature/your-feature`
3. **Make changes** following the [development guide](../Development/development.md)
4. **Run tests** to ensure everything works
5. **Commit with clear messages** and create a PR

## Key Components

- **neuro-infra**: Core Rust daemon with networking and storage
- **neuro-services**: TypeScript API server with authentication
- **neuro-program**: Solana smart contracts for anchoring
- **neuro-web**: React-based user interface
- **neuro-shared**: Shared TypeScript/Rust types and utilities

## Getting Help

- Check the [documentation index](../general/neuroswarm-docs-README.md) for detailed guides
- Review the [architecture overview](../program/architecture.md)
- Read the [NeuroSwarm Stories](../stories.md) to understand our vision and journey
- Join our Discord/Telegram for community support
- Open an issue for bugs or feature requests

## Contributor Workflow

Before contributing, ensure you follow our quality standards:

### Pre-Commit Checklist
- [ ] Run `pnpm lint` in the relevant project directory (0 errors required)
- [ ] Run `pnpm typecheck` or `tsc --noEmit` to validate TypeScript (0 errors required)
- [ ] Update `docs/todo.md` for any new tasks or significant changes
- [ ] Run `sync-agent.ps1` to sync changes with the project board

### Development Workflow

1. **Pick an issue** from the [Kanban board](../Governance/kanban.md)
2. **Create a feature branch:** `git checkout -b feature/your-feature`
3. **Make changes** following the [development guide](../Development/development.md)
4. **Run the pre-commit checklist** to ensure quality
5. **Commit with clear messages** and create a PR

### Quality Gates

All contributions must pass:
- **Linting**: `pnpm lint` returns 0 errors
- **Type Checking**: `tsc --noEmit` passes cleanly
- **Testing**: All existing tests pass
- **Build**: Project builds successfully
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

1. **Pick an issue** from the [Kanban board](../governance/kanban.md)
2. **Create a feature branch:** `git checkout -b feature/your-feature`
3. **Make changes** following the [development guide](../misc/development.md)
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
- Join our Discord/Telegram for community support
- Open an issue for bugs or feature requests

## Next Steps

- Read the [architecture overview](../program/architecture.md)
- Explore the [API documentation](../services/)
- Set up your development environment following the [development guide](../misc/development.md)
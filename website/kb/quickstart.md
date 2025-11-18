# ⚠️ This document has moved
> **This document has moved to the NeuroSwarm Wiki.** Please see the canonical Quickstart on the wiki: https://github.com/brockhager/neuroswarm/wiki/Getting-Started

# Interactive Quickstart

## ⚡ Get NeuroSwarm Running in 5 Minutes

Skip the reading and start contributing immediately. Copy-paste these commands to get a full development environment running.

### 📋 Prerequisites Check

First, ensure you have these tools installed:

```bash
# Check Node.js (required for web interface)
node --version  # Should be 18+

# Check Rust (required for Solana programs)
cargo --version  # Should be 1.70+

# Check Git
git --version

# Check if you have a code editor
code --version  # VS Code recommended
```

If any are missing, install them first, then continue.

---

## 🚀 **Step 1: Clone & Setup** (2 minutes)

```bash
# Clone the monorepo
git clone https://github.com/brockhager/neuro-infra.git
cd neuro-infra

# Install root dependencies
npm install

# Setup all sub-projects
npm run setup:all
```

**What this does:**
- Downloads the entire NeuroSwarm codebase
- Installs dependencies for all projects
- Configures your development environment

---

## 🏗️ **Step 2: Build Everything** (2 minutes)

```bash
# Build all projects
npm run build:all

# Run tests to verify everything works
npm run test:all
```

**What this does:**
- Compiles Rust programs for Solana
- Builds Next.js web interface
- Runs TypeScript compilation
- Executes test suites across all projects

---

## 🌐 **Step 3: Launch Development Environment** (1 minute)

```bash
# Start the web interface
npm run dev:web

# In another terminal, start the services
npm run dev:services

# In another terminal, start the Solana program
npm run dev:program
```

**What this does:**
- Launches Next.js dev server on http://localhost:3000
- Starts backend services and APIs
- Runs Solana program in development mode

---

## ✅ **Step 4: Verify Everything Works**

Open your browser to http://localhost:3000 and you should see:

- ✅ NeuroSwarm landing page
- ✅ Contributor portal access
- ✅ Governance dashboard
- ✅ Development tools

Test a basic interaction:

```bash
# Run a simple integration test
npm run test:integration
```

---

## 🎯 **Step 5: Make Your First Contribution**

Now you're ready to contribute! Try these quick wins:

```bash
# Fix a documentation typo
code docs/README.md

# Add a test case
code src/__tests__/example.test.ts

# Improve error messages
code src/utils/errors.ts
```

**Commit your changes:**
```bash
git add .
git commit -m "Improve documentation and add test coverage"
git push origin main
```

---

## 🐛 **Having Issues? Quick Fixes**

### Build fails?
```bash
# Clear caches and rebuild
npm run clean:all
npm run build:all
```

### Port conflicts?
```bash
# Kill processes on common ports
npx kill-port 3000 4000 8000
```

### Permission errors?
```bash
# On Windows, run as Administrator
# On Linux/Mac, use sudo for global installs
```

### Outdated dependencies?
```bash
# Update everything
npm run update:all
```

---

## 📚 **Learn More**


This quickstart got you running, but to become an expert:

- **Full Getting Started Guide (Wiki)**: https://github.com/brockhager/neuroswarm/wiki/Getting-Started
- **Contributor Pathways (Wiki)**: https://github.com/brockhager/neuroswarm/wiki/Getting-Started#contributor-pathways
- **Governance Rituals (Wiki)**: https://github.com/brockhager/neuroswarm/wiki/Governance/rituals
- **Technical Deep Dives (Wiki)**: https://github.com/brockhager/neuro-infra/wiki/Architecture/program-architecture

---


## 💬 **Need Help?**

- **Live Chat:** Join our [Discord server](https://discord.gg/neuroswarm)
- **Issues:** Report bugs on [GitHub Issues](https://github.com/brockhager/neuro-infra/issues)
- **Discussions:** Ask questions in [GitHub Discussions](https://github.com/brockhager/neuro-infra/discussions)

**Pro tip:** Most questions are answered in our [FAQ](https://github.com/brockhager/neuro-infra/wiki/Getting-Started#faq) or [Troubleshooting Guide (Wiki)](https://github.com/brockhager/neuro-infra/wiki/Getting-Started#troubleshooting).

**Pro tip:** Most questions are answered in our [FAQ](faq.md) or [Troubleshooting Guide](/docs/misc/troubleshooting.md).
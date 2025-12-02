# Step 6: Make Your First Contribution

# Step 7: Join the Community
# Getting Started with NeuroSwarm

Welcome to NeuroSwarm! This guide will walk you through setting up your development environment and running your first test. Whether you're a new contributor or returning developer, follow these steps to get up and running quickly.

# ⚠️ This document has moved
> **This document has moved to the NeuroSwarm Wiki.** Please see the canonical Getting Started guide on the wiki: https://github.com/brockhager/neuroswarm/wiki/Getting-Started

# Getting Started with NeuroSwarm

## 🗺️ Understanding Your Journey
## Step 1: Clone the Repository

Clone the NeuroSwarm monorepo to your local machine:

```bash
## Step 5: Explore the Codebase

Now that you're set up, let's explore the project structure using the canonical wiki pages and repo docs where applicable:

```bash
# View the wiki index
git ls-tree --name-only -r HEAD | grep "neuroswarm/wiki" || echo "See neuroswarm/wiki/Index.md"

# Check scripts and docs (repo docs remain for module-level deep dives)
cat docs/index.md
```

Before diving into technical setup, take a moment to understand your path in NeuroSwarm:

- **[Contributor Journey Overview](../../Project-Management/stories.md#contributor-journey)** - Learn about different contributor pathways and growth opportunities
- **[Working Groups](../../Project-Management/stories.md#working-groups)** - Discover specialized teams and their responsibilities
- **[Success Stories](../../Project-Management/stories.md#success-stories)** - Read about real contributor experiences and progression

## Prerequisites

Before you begin, ensure you have the following installed:

- **Git** (2.28+)
- **Node.js** (18+ LTS) and npm
- **Python** (3.8+) with pip
- **PowerShell** (5.1+ for Windows, Core 7+ for cross-platform)
- **GitHub CLI** (optional, for enhanced GitHub integration)

### Quick Setup Commands

**Windows (PowerShell):**
```powershell
# Install Node.js (if not already installed)
winget install OpenJS.NodeJS.LTS

# Install Python (if not already installed)
winget install Python.Python.3.11

# Install GitHub CLI
winget install --id GitHub.cli
```

**macOS:**
```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install prerequisites
brew install node python git gh
```

**Linux (Ubuntu/Debian):**
```bash
# Update package list
sudo apt update

# Install prerequisites
sudo apt install nodejs npm python3 python3-pip git gh
```

## Step 1: Clone the Repository

Clone the NeuroSwarm monorepo to your local machine:

```bash
# Clone the repository
git clone https://github.com/brockhager/neuro-infra.git neuroswarm
cd neuroswarm

# Verify you're in the right place
pwd  # Should show path ending with 'neuroswarm'
ls   # Should show directories like docs/, scripts/, src/, etc.
```

## Step 2: Set Up Development Environment

### Option A: Automated Setup (Recommended)

Use our automated setup script:

```bash
# Run the setup script
./scripts/setup-dev-environment.sh

# Or on Windows:
.\scripts\setup-dev-environment.ps1
```

This script will:
- Install all required dependencies
- Configure your environment
- Set up pre-commit hooks
- Validate your setup

### Option B: Manual Setup

If you prefer manual setup:

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements-wp.txt

# Install Pester for testing (PowerShell)
Install-Module -Name Pester -Force -SkipPublisherCheck

# Authenticate with GitHub CLI (optional)
gh auth login
```

## Step 3: Verify Your Setup

Run our environment validation script:

```bash
# Validate setup
./scripts/validate-setup.sh

# Or on Windows:
.\scripts\validate-setup.ps1
```

This will check:
- ✅ Git configuration
- ✅ Node.js and npm versions
- ✅ Python and pip versions
- ✅ Required dependencies
- ✅ File permissions

## Step 4: Run Your First Test

Let's run a simple test to ensure everything is working:

```bash
# Run the hygiene validation test
Invoke-Pester -Path "tests/agent/SyncAgent.Tests.ps1" -TestName "Documentation Checks"

# Or run all tests in the agent test suite
Invoke-Pester -Path "tests/agent/SyncAgent.Tests.ps1"
```

Expected output:
```
Describing Structural Hygiene Checks
 Context Documentation Checks
  [+] Should warn about missing script documentation
  [+] Should warn about missing test documentation
Tests completed in Xs
Passed: 2 Failed: 0
```

## Step 5: Explore the Codebase

Now that you're set up, let's explore the project structure:

```bash
# View the main documentation index
cat docs/index.md

# Check available scripts
cat docs/scripts/README.md

# Review governance documentation
cat docs/governance/governance.md

# Look at the contributor guide
cat docs/CONTRIBUTOR-GUIDE.md
```

## Step 6: Make Your First Contribution

### Option 1: Documentation Update

1. Find a documentation file that needs improvement
2. Make your changes
3. Run tests to ensure nothing broke:

```bash
# Run hygiene checks
.\agents\sync-agent.ps1

# Run tests
Invoke-Pester -Path "tests/agent/"
```

### Option 2: Code Contribution

1. Pick a small issue from our [GitHub Issues](https://github.com/brockhager/neuro-infra/issues)
2. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

3. Make your changes
4. Run tests and validation:

```bash
# Run all tests
Invoke-Pester

# Run hygiene checks
.\agents\sync-agent.ps1

# Check for linting issues
npm run lint  # If available
```

5. Commit your changes:

```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

6. Create a Pull Request on GitHub

# Step 7: Join the Community

- **Discussions**: Join [GitHub Discussions](https://github.com/brockhager/neuro-infra/discussions) for questions
- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/brockhager/neuro-infra/issues)
- **Governance**: Participate in governance decisions through our [voting system](https://github.com/brockhager/neuro-infra/wiki/Governance/how-to-vote)
- **Weekly Rituals**: Join our [weekly refinement sessions](https://github.com/brockhager/neuro-infra/wiki/Governance/rituals)
# Step 8: Crosslinks & references

# Troubleshooting
# Crosslinks

# 1. Check our [FAQ](misc/FAQ.md)
1. Check our [FAQ (Wiki)](https://github.com/brockhager/neuro-infra/wiki/Getting-Started#faq)

## Troubleshooting

### Common Issues

**"Command not found" errors:**
- Ensure all prerequisites are installed
- Check your PATH environment variable
- Try restarting your terminal

**Test failures:**
- Run `./scripts/validate-setup.sh` to check your environment
- Ensure you're in the correct directory (`neuroswarm/`)
- Check that all dependencies are installed

**Permission errors:**
- On Windows, run PowerShell as Administrator
- On Unix systems, check file permissions with `ls -la`

**GitHub CLI issues:**
- Run `gh auth login` to authenticate
- Check your internet connection

### Getting Help

If you run into issues:

1. Check our [FAQ](misc/FAQ.md)
2. Search existing [GitHub Issues](https://github.com/brockhager/neuro-infra/issues)
3. Ask in [GitHub Discussions](https://github.com/brockhager/neuro-infra/discussions)
4. Review the [troubleshooting guide](misc/troubleshooting.md)

## Next Steps

Now that you're set up:

- 📖 Read the [Contributor Guide](CONTRIBUTOR-GUIDE.md)
- 🏛️ Learn about [Governance](governance/governance.md)
- 🛠️ Explore [Technical Architecture](program/architecture.md)
- 🧪 Check out [Testing Guidelines](tests/README.md)

Welcome to the NeuroSwarm community! 🚀
# Governance Events Dashboard

Welcome to the NeuroSwarm Governance Transparency Dashboard! This page provides real-time visibility into governance actions, structural hygiene enforcement, and community decisions that shape our project.

## 📊 Live Metrics Overview

### Project Health Indicators

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Test Coverage** | 96% | 90% | 🟢 Exceeded Target |
| **Build Status** | ✅ Passing | - | 🟢 Healthy |
| **Open PRs** | 12 | <20 | 🟢 Healthy |
| **Active Contributors** | 28 | - | 📈 Growing |
| **Governance Proposals** | 3 | - | 🟢 Active |

### Velocity Metrics (Last 30 Days)

- **PR Merge Rate**: 8.5 PRs/week
- **Issue Resolution**: 92% closed
- **New Contributors**: +5 this month
- **Documentation Updates**: 23 commits

### Community Engagement

- **Weekly Rituals Attendance**: 85%
- **Governance Participation**: 67%
- **Discussion Threads**: 45 active
- **Mentorship Matches**: 12 active pairs

### How Metrics Are Calculated

**Test Coverage**: Combined coverage across all projects (Rust, TypeScript, Python)
**Build Status**: CI/CD pipeline health across all repositories
**PR Velocity**: Average PRs merged per week over 30-day rolling window
**Contributor Activity**: Unique contributors with commits in the last 30 days
**Governance Proposals**: Active proposals in voting or discussion phase

---

## Live Governance Feed

Below is a live view of recent governance events. These events are automatically logged whenever the sync agent enforces monorepo hygiene, processes governance proposals, or handles contributor actions.

### Recent Events

<!-- This section is automatically updated by our governance monitoring system -->
<!-- To view the raw log data, check wp_publish_log.jsonl -->

| Timestamp | Action | File | Details |
|-----------|--------|------|---------|
| 2025-11-13 14:10 | executed | sync-agent.ps1 | Ran sync agent to synchronize completed todos with GitHub Project board |
| 2025-11-13 14:10 | created | docs/todo.md | Created todo.md with all completed tasks marked as done |
| 2025-11-13 14:05 | validated | codebase | Lint, typecheck, and build all passed with 0 errors |
| 2025-11-13 14:05 | linting_fixed | codebase | Resolved final 14 ESLint/TypeScript problems; codebase now fully clean |
| 2025-11-13 13:59 | nextjs-config-updated | website/next.config.ts | Updated images.domains to images.remotePatterns for Next.js 16 compatibility |
| 2025-11-13 13:59 | linting_validated | codebase | ESLint reports 0 problems, TypeScript compilation passes cleanly, build generates all 11 routes successfully |
| 2025-11-13 13:56 | nodejs-version-update | .github/workflows | Updated Node.js version from 18 to 20 in all workflows to meet Next.js 16 requirement of Node.js >=20.9.0 |
| 2025-11-13 13:54 | pnpm-version-alignment | .github/workflows | Updated pnpm version from 8 to 10 in all workflows to match local environment and fix lock file compatibility issues |
| 2025-11-13 13:43 | pnpm-setup-fix | .github/workflows | Replaced corepack enable with pnpm/action-setup@v2 action - fixes pnpm executable not found error in GitHub Actions by properly installing pnpm before usage |
| 2025-11-13 13:41 | npm-to-pnpm-migration | .github/workflows/ci.yml | Migrated entire CI workflow from npm to pnpm - updated setup-node cache, added pnpm setup, changed all npm commands to pnpm with frozen-lockfile, added working-directory for website context |

## Understanding Governance Events

### Event Types

- **moved**: File relocations for monorepo hygiene
- **created**: New files or directories added
- **updated**: File modifications with governance approval
- **validated**: Automated checks and validations
- **governance**: Community decisions and proposals

### Why Transparency Matters

Our governance system ensures:

1. **Accountability**: Every change is logged with timestamp and context
2. **Auditability**: Full history of structural decisions
3. **Community Trust**: Contributors can see how decisions are made
4. **Automated Enforcement**: Rules are consistently applied

## How to View Raw Logs

### Option 1: Command Line
```bash
# View recent events
tail -20 wp_publish_log.jsonl

# Search for specific actions
grep "moved" wp_publish_log.jsonl

# Pretty print JSON entries
cat wp_publish_log.jsonl | jq .
```

### Option 2: PowerShell
```powershell
# View recent events
Get-Content wp_publish_log.jsonl -Tail 20

# Convert to readable format
Get-Content wp_publish_log.jsonl | ConvertFrom-Json | Format-Table -AutoSize
```

### Option 3: Web Dashboard (Future)
We're working on a web-based dashboard to visualize governance events in real-time. Stay tuned!

## Governance Principles

### Automated Hygiene Enforcement
- Files are automatically moved to correct locations
- References are updated to maintain functionality
- All actions are logged for transparency

### Community Governance
- Major decisions require community consensus
- Proposals are tracked and voted on
- Governance events are publicly visible

### Continuous Improvement
- Regular audits of governance effectiveness
- Community feedback drives process improvements
- Transparency builds trust and engagement

## Contributing to Governance

Want to participate in NeuroSwarm governance?

1. **Review Events**: Monitor this dashboard for ongoing activities
2. **Learn Our Story**: Read the [NeuroSwarm Stories](/docs/stories.md) to understand our vision and journey
3. **Propose Changes**: Submit governance proposals via GitHub Issues
4. **Vote on Decisions**: Participate in community votes when they occur
5. **Join Discussions**: Contribute to governance conversations

## Event Schema

Each governance event contains:

```json
{
  "file": "path/to/file",
  "new_path": "new/path/to/file",
  "timestamp": "YYYY-MM-DD HH:MM",
  "action": "moved|created|updated|validated|governance",
  "details": "Optional additional context"
}
```

## Questions?

- 📖 [Getting Started Guide](getting-started.md)
- 🏛️ [Governance Overview](../governance/governance.md)
- 💬 [Community Discussions](https://github.com/brockhager/neuro-infra/discussions)

---

*This dashboard is automatically updated. Last refresh: 2025-11-13 14:15*
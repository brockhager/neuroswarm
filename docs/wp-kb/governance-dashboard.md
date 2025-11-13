# Governance Events Dashboard

Welcome to the NeuroSwarm Governance Transparency Dashboard! This page provides real-time visibility into governance actions, structural hygiene enforcement, and community decisions that shape our project.

## Live Governance Feed

Below is a live view of recent governance events. These events are automatically logged whenever the sync agent enforces monorepo hygiene, processes governance proposals, or handles contributor actions.

### Recent Events

<!-- This section is automatically updated by our governance monitoring system -->
<!-- To view the raw log data, check wp_publish_log.jsonl -->

| Timestamp | Action | File | Details |
|-----------|--------|------|---------|
| 2025-11-13 10:44 | moved | neuroswarm/scripts/README.md | Relocated to docs/scripts/README.md for proper documentation organization |
| 2025-11-13 10:44 | moved | neuroswarm/tests/README.md | Relocated to docs/tests/README.md for proper documentation organization |
| 2025-11-13 10:44 | moved | neuroswarm/website/README.md | Relocated to docs/website/README.md for proper documentation organization |
| 2025-11-13 10:44 | moved | neuroswarm/website/SEO-README.md | Relocated to docs/website/SEO-README.md for proper documentation organization |
| 2025-11-13 10:44 | moved | neuroswarm/website/GOVERNANCE-LAUNCH-ANNOUNCEMENT.md | Relocated to docs/governance/GOVERNANCE-LAUNCH-ANNOUNCEMENT.md for governance documentation |
| 2025-11-13 10:44 | moved | neuroswarm/.github/pull_request_template.md | Relocated to docs/.github/pull_request_template.md for GitHub configuration documentation |
| 2025-11-13 10:41 | moved | CONTRIBUTOR-GUIDE.md | Relocated to docs/CONTRIBUTOR-GUIDE.md for proper documentation organization |
| 2025-11-13 10:41 | moved | neuro-services/src/index.test.ts | Relocated to neuro-services/tests/index.test.ts for proper test organization |
| 2025-11-13 10:41 | moved | neuroswarm/scripts/test_connection.py | Relocated to neuroswarm/tests/test_connection.py for proper test organization |
| 2025-11-13 10:41 | moved | neuroswarm/scripts/governance/test-quorum-validation.ts | Relocated to neuroswarm/tests/governance/test-quorum-validation.ts for proper test organization |
| 2025-11-13 10:41 | moved | neuro-web/scripts/test-quorum-validation.ts | Relocated to neuro-web/tests/test-quorum-validation.ts for proper test organization |

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
2. **Propose Changes**: Submit governance proposals via GitHub Issues
3. **Vote on Decisions**: Participate in community votes when they occur
4. **Join Discussions**: Contribute to governance conversations

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

- 📖 [Getting Started Guide](../wp-kb/getting-started.md)
- 🏛️ [Governance Overview](../governance/governance.md)
- 💬 [Community Discussions](https://github.com/brockhager/neuro-infra/discussions)

---

*This dashboard is automatically updated. Last refresh: 2025-11-13*
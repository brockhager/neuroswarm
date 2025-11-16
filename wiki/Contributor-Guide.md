# NeuroSwarm Contributor Guide

## 🏃 Running the Sync Agent

The sync agent monitors `docs/todo.md` for changes and synchronizes them with GitHub Projects. It also performs structural hygiene checks and logs governance events.

### Prerequisites
- GitHub CLI (`gh`) installed and authenticated
- PowerShell 5.1 or later
- Access to the `brockhager/neuro-infra` repository

### Local Development Setup

1. **Clone and setup**:
   ```bash
   git clone https://github.com/brockhager/neuro-infra.git
   cd neuro-infra
   ```

2. **Authenticate GitHub CLI**:
   ```bash
   gh auth login
   ```

3. **Test agent functionality**:
   ```powershell
   # Run one-time sync
   .\agents\sync-agent.ps1 -Sync

   # Start monitoring mode
   .\agents\sync-agent.ps1 -Monitor -IntervalMinutes 30
   ```

### Debugging Failures

#### Common Issues

**❌ Parsing Errors**
```
At C:\path\sync-agent.ps1:167 char:5
+     }
+     ~
Unexpected token '}' in expression or statement.
```

**🔍 Diagnosis**:
- The script has structural issues preventing execution
- Functions work in isolation but main script fails to parse
- Check for missing/extra braces or unclosed strings

**🛠️ Solutions**:
1. Run individual functions in test scripts
2. Use `Set-StrictMode -Version Latest` for validation
3. Check brace matching with editor tools

**❌ GitHub CLI Authentication**
```
gh: command not found
```

**🔍 Diagnosis**:
- GitHub CLI not installed or not in PATH

**🛠️ Solutions**:
```bash
# Install GitHub CLI
winget install --id GitHub.cli

# Authenticate
gh auth login
```

**❌ Permission Issues**
```
GraphQL: Resource not accessible by integration (read-project)
```
Logs are stored in `governance/logs/wp_publish_log.jsonl` with structured JSON entries:
**🔍 Diagnosis**:
- Insufficient permissions for GitHub Projects API

**🛠️ Solutions**:
- Ensure repository admin access
- Check GitHub CLI authentication scope
- Verify project board exists and is accessible

#### Interpreting Governance Logs

Logs are stored in `wp_publish_log.jsonl` with structured JSON entries:

```json
    - Check `governance/logs/wp_publish_log.jsonl` for latest `"action": "genesis-anchor"` entry
  "timestamp": "2025-11-13T10:30:00.123456",
  "event_type": "structural_violation",
  "severity": "high",
  "description": "Scripts found in root directory",
  "violations": "script.ps1, test.py",
  "remediation": "Move scripts to scripts/ directory",
  "component": "structural-hygiene",
  "governance_action": "monitor"
}
```

**Event Types**:
- `structural_violation`: Hygiene rule violations
- `structural_warning`: Missing documentation
- `structural_compliance`: All checks passed
- `auto_sync`: Todo synchronization actions

**Severity Levels**:
- `info`: Routine compliance checks
- `medium`: Missing documentation
- `high`: Structural violations

# Run with verbose output
Invoke-Pester tests/agent/SyncAgent.Tests.ps1 -OutputFormat Detailed

**(Note**: This file mirrors `docs/CONTRIBUTOR-GUIDE.md` and should be considered the canonical contributor guide in the wiki — the repository-level `CONTRIBUTOR-GUIDE.md` has been updated to link here.)

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
   .\scripts\sync-agent.ps1 -Sync

   # Start monitoring mode
   .\scripts\sync-agent.ps1 -Monitor -IntervalMinutes 30
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

**🔍 Diagnosis**:
- Insufficient permissions for GitHub Projects API

**🛠️ Solutions**:
- Ensure repository admin access
- Check GitHub CLI authentication scope
- Verify project board exists and is accessible

#### Interpreting Governance Logs

Logs are stored in `wp_publish_log.jsonl` with structured JSON entries:

```json
{
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

### Testing the Agent

#### Unit Tests
```powershell
# Run agent tests
Invoke-Pester tests/agent/SyncAgent.Tests.ps1

# Run with verbose output
Invoke-Pester tests/agent/SyncAgent.Tests.ps1 -OutputFormat Detailed
```

#### Integration Testing
```powershell
# Test governance logging
.\test-governance.ps1

# Test structural hygiene
# (Functions available in test suite)
```

#### Manual Testing Checklist
- [ ] Agent starts without parsing errors
- [ ] File hash calculation works
- [ ] Log entries are properly formatted
- [ ] Governance events are emitted
- [ ] No scripts in root directory
- [ ] Required directories exist

### Todo Workflow Integration

The sync agent automatically synchronizes `docs/todo.md` with the GitHub Project board, ensuring consistent task tracking across the team.

#### Todo File Structure
```markdown
# NeuroSwarm Project Todo

## Done
- [x] Completed task description

## Backlog (to be done)
- [ ] Future task description

## In Progress
- [ ] Currently active task description
```

#### Workflow Steps
1. **Add new tasks** to `docs/todo.md` in the appropriate section
2. **Move tasks** between sections as work progresses (`Backlog` → `In Progress` → `Done`)
3. **Sync automatically** happens every 30 minutes via the monitoring agent
4. **Manual sync** available with `.\sync-agent.ps1 -Sync`
5. **Check governance logs** in `wp_publish_log.jsonl` for sync confirmations

#### Best Practices
- Keep task descriptions clear and actionable
- Update task status immediately when starting/finishing work
- Use consistent formatting for easy parsing
- Reference issue numbers when applicable
- Log significant changes in governance records

### Development Workflow

1. **Make changes** to sync agent or related scripts
2. **Run tests** to validate functionality
3. **Check logs** for governance events
4. **Verify hygiene** with structural checks
5. **Test sync** with `-Sync` parameter
6. **Monitor** with `-Monitor` for continuous validation

### Troubleshooting Commands

```powershell
# Check PowerShell version
$PSVersionTable.PSVersion

# Test GitHub CLI
gh auth status
gh project list --owner brockhager

# Validate script syntax (if parsing works)
Set-StrictMode -Version Latest
& .\scripts\sync-agent.ps1

# Check log file
Get-Content wp_publish_log.jsonl -Tail 10 | ConvertFrom-Json

# Test individual functions
. .\scripts\sync-agent.ps1
Get-TodoContent
Get-FileHash "docs/todo.md"
```

### Contributing Changes

1. **Test locally** before submitting PR
2. **Update tests** for new functionality
3. **Document changes** in this guide if needed
4. **Ensure hygiene** checks pass
5. **Verify logs** contain expected governance events

---

*For issues not covered here, check the test suite at `tests/agent/` or create an issue with detailed error logs.*
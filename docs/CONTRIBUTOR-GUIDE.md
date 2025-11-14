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

## 🔧 Code Quality Standards

### Definition of Done

All code contributions must meet these requirements before merging:

- [ ] **No ESLint errors**: `npm run lint` passes without errors
- [ ] **Type safety enforced**: `npm run build` compiles without type errors
- [ ] **Tests pass**: `npm run test:ci` passes with >95% coverage
- [ ] **Race condition testing**: `npm run test:race` passes
- [ ] **Documentation updated**: Code changes documented in relevant docs

### Linting and TypeScript Standards

#### TypeScript Configuration
- **Strict mode enabled**: `tsconfig.json` has `"strict": true`
- **No implicit any**: All variables must have explicit types
- **Null safety**: Strict null checks prevent runtime null reference errors

#### ESLint Rules
- **No unused variables**: Remove all unused imports and variables
- **Explicit types**: Replace `any` with specific TypeScript types
- **Consistent formatting**: Use Prettier for code formatting

#### Auto-fix Commands
```bash
# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Type check only
npm run build
```

#### Common Issues and Solutions

**❌ ESLint: Unexpected any type**
```typescript
// ❌ Bad
const data: any = response.data;

// ✅ Good
interface ApiResponse {
  id: string;
  name: string;
  value: number;
}
const data: ApiResponse = response.data;
```

**❌ TypeScript: Property X does not exist on type Y**
```typescript
// ❌ Bad - implicit any
const result = someFunction();

// ✅ Good - explicit typing
const result: ExpectedType = someFunction();
```

**❌ ESLint: Unused variable**
```typescript
// ❌ Bad
import { UnusedType } from './types';
const unusedVar = 'test';

// ✅ Good - remove unused imports/variables
// (Remove the import and variable if not needed)
```

#### CI/CD Pipeline Requirements

The full CI pipeline (`npm run ci:full`) must pass:
1. **Linting**: No ESLint errors or warnings
2. **Type checking**: TypeScript compilation succeeds
3. **Unit tests**: All tests pass with coverage
4. **Race condition tests**: Randomized delay tests pass

**Failure Modes**:
- ❌ Linting fails → PR blocked
- ❌ Type errors → PR blocked  
- ❌ Tests fail → PR blocked
- ❌ Coverage <95% → PR blocked

### Governance Logging

Code quality events are automatically logged to `wp_publish_log.jsonl`:

```json
{
  "timestamp": "2025-11-13T20:35:00Z",
  "event_type": "code_quality_violation",
  "severity": "high",
  "description": "ESLint errors found in PR",
  "violations": "unused variables, implicit any types",
  "remediation": "Run npm run lint:fix and fix remaining issues",
  "component": "code-quality",
  "governance_action": "block_merge"
}
```

**Quality Event Types**:
- `code_quality_violation`: Linting/type errors found
- `code_quality_compliance`: All quality checks passed
- `type_safety_enforced`: Strict TypeScript rules validated
- `test_coverage_met`: Required coverage thresholds met

## 🔐 Admin Node Awareness

### Understanding the Admin Node

NeuroSwarm implements a secure, founder-only admin node for advanced governance control and observability. All contributors must understand its role, boundaries, and auditability requirements.

**📖 Reference Documentation**: See `docs/admin-node-design.md` for complete technical specifications, security model, and operational procedures.

### Admin Node Boundaries

**What the Admin Node Controls**:
- Founder-only access to sensitive governance operations
- Advanced observability dashboards for system health
- Emergency intervention capabilities
- Policy engine for automated governance
- Data export and analytics for compliance

**What Contributors Should Know**:
- Admin actions are **always logged** and auditable
- No contributor access to admin endpoints (`/v1/admin/*`)
- All admin operations require multi-signature validation
- Governance logs provide complete transparency
- Admin node enhances, doesn't replace, community governance

### Auditability Requirements

All admin actions are automatically logged to `wp_publish_log.jsonl` with cryptographic signatures:

```json
{
  "timestamp": "2025-11-13T21:30:00Z",
  "event_type": "admin_action",
  "severity": "info",
  "description": "Admin dashboard accessed",
  "actor": "founder-multisig",
  "action": "observability_query",
  "component": "admin-node",
  "governance_action": "logged"
}
```

**Admin Event Types**:
- `admin_action`: Any admin operation performed
- `admin_authentication`: Multi-signature validation events
- `admin_intervention`: Emergency governance actions
- `admin_export`: Data export operations

### Contributor Responsibilities

- [ ] **Respect boundaries**: Never attempt admin node access
- [ ] **Report concerns**: Use standard governance channels for admin-related issues
- [ ] **Understand auditability**: All admin actions are transparent and logged
- [ ] **Follow security protocols**: Multi-signature requirements are strictly enforced
- [ ] **Reference documentation**: Consult `admin-node-design.md` for technical details

**🚨 Security Note**: Attempting to bypass admin node security controls or access restricted endpoints will result in immediate governance logging and potential contributor status review.

## 🚀 Deployment Setup

### Vercel Deployment Configuration

The NeuroSwarm website is deployed to Vercel using GitHub Actions. To set up deployment, repository maintainers need to configure Vercel authentication secrets.

#### Prerequisites
- Vercel account with admin access to the NeuroSwarm project
- GitHub repository admin access to configure secrets

#### Step 1: Create Vercel Personal Access Token

1. **Log into Vercel Dashboard**: Go to [vercel.com](https://vercel.com) and sign in
2. **Navigate to Account Settings**: Click your profile → Account Settings
3. **Create Token**: Go to "Tokens" tab → "Create Token"
4. **Configure Token**:
   - Name: `neuroswarm-deployment`
   - Scope: Select your organization/team
   - Expiration: Set to "No Expiration" for continuous deployment
5. **Copy Token**: Save the generated token securely

#### Step 2: Retrieve Vercel Organization and Project IDs

1. **Get Organization ID**:
   - In Vercel dashboard, go to Settings → General
   - Copy the "Organization ID" (starts with `team_`)

2. **Get Project ID**:
   - Navigate to your NeuroSwarm project
   - Go to Settings → General
   - Copy the "Project ID"

#### Step 3: Configure GitHub Repository Secrets

1. **Go to Repository Settings**: 
   - Navigate to `https://github.com/brockhager/neuroswarm/settings/secrets/actions`

2. **Add Secrets**:
   - `VERCEL_TOKEN`: Paste your Personal Access Token
   - `VERCEL_ORG_ID`: Paste your Organization ID
   - `VERCEL_PROJECT_ID`: Paste your Project ID

#### Step 4: Verify Deployment

1. **Trigger Deployment**: Push to `main` branch or use workflow dispatch
2. **Check GitHub Actions**: Verify workflow runs without "vercel-token" errors
3. **Confirm Vercel Deployment**: Check Vercel dashboard for successful deployment

#### Troubleshooting Deployment

**❌ "Error: Input required and not supplied: vercel-token"**
```
The Vercel action requires authentication inputs that are missing.
```

**🔍 Diagnosis**:
- GitHub repository secrets not configured
- Secret names don't match workflow expectations
- Vercel token expired or invalid

**🛠️ Solutions**:
1. Verify secrets exist in repository settings
2. Check secret names match: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
3. Regenerate Vercel token if expired
4. Ensure token has correct scope and permissions

**❌ "Error: Organization not found"**
```
The specified organization ID is invalid.
```

**🔍 Diagnosis**:
- VERCEL_ORG_ID secret has incorrect value
- Token doesn't have access to the organization

**🛠️ Solutions**:
1. Double-check Organization ID in Vercel settings
2. Ensure token scope includes the correct organization
3. Verify organization name matches

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
4. **Manual sync** available with `.\agents\sync-agent.ps1 -Sync`
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
& .\agents\sync-agent.ps1

# Check log file
Get-Content wp_publish_log.jsonl -Tail 10 | ConvertFrom-Json

# Test individual functions
. .\agents\sync-agent.ps1
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
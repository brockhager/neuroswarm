# NeuroSwarm Kanban Sync Agent

This PowerShell script maintains synchronization between `docs/todo.md` and the GitHub Project board, ensuring the Kanban board stays up-to-date with the authoritative markdown backlog.

## Features

- **One-time Sync**: Run a manual synchronization to create missing cards
- **Continuous Monitoring**: Automatically detect changes to `todo.md` and update the board
- **Duplicate Prevention**: Checks for existing cards before creating new ones
- **Comprehensive Logging**: All sync actions are logged to `wp_publish_log.jsonl`

## Usage

### One-time Sync
```powershell
.\sync-agent.ps1 -Sync
```

### Continuous Monitoring
```powershell
# Monitor with default 60-minute interval
.\sync-agent.ps1 -Monitor

# Monitor with custom interval (30 minutes)
.\sync-agent.ps1 -Monitor -IntervalMinutes 30
```

### Help
```powershell
.\sync-agent.ps1
```

## How It Works

1. **Parsing**: Extracts tasks from `docs/todo.md` using regex patterns
2. **Status Mapping**:
   - Tasks under `## In Progress` → "In progress" column
   - Tasks under `## Backlog` → "Backlog" column
3. **Card Creation**: Creates draft issue cards with migration notes
4. **Logging**: Records all actions with timestamps and details

## Configuration

The script is configured for:
- Project ID: 3
- Owner: brockhager
- Todo file: `docs/todo.md`
- Log file: `wp_publish_log.jsonl`

## Integration with CI/CD

For automated syncing, add this to your CI/CD pipeline:

```yaml
# Example GitHub Actions step
- name: Sync Kanban Board
  run: .\sync-agent.ps1 -Sync
  shell: pwsh
```

## Board Hygiene Features

The NeuroSwarm Kanban board now includes:

- **Section Labels**: `shared-contracts`, `on-chain-core`, `services-layer`, `web-node`, `networking`, `security`, `governance`, `website`
- **Status Columns**: Backlog, Ready, In progress, In review, Done
- **Migration Tracking**: All cards include creation date and source information
- **Automated Sync**: Continuous monitoring prevents drift between markdown and board

## Transparency & Governance

- All board changes are logged with timestamps
- Migration notes preserve task origin and context
- Section-based organization enables focused development sprints
- Real-time sync ensures board reflects current priorities
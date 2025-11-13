# NeuroSwarm Scripts Registry

This directory contains all automation scripts for the NeuroSwarm project. Scripts are organized by function and include both Python and PowerShell implementations.

## 📋 Script Inventory

### WordPress Publishing Suite

#### `wp_publisher.py`
**Purpose**: Core WordPress content publisher for individual files
**Language**: Python 3
**Dependencies**: `requests`, `python-dotenv`

**Usage Examples**:
```bash
# Publish a single markdown file
python3 scripts/wp_publisher.py --content docs/governance/overview.md

# Publish with custom title and categories
python3 scripts/wp_publisher.py --content example-content.json --title "Custom Title" --categories "News,Updates"

# Dry run to preview
python3 scripts/wp_publisher.py --content file.md --dry-run
```

#### `batch_publish.py`
**Purpose**: Batch processing for multiple content files
**Language**: Python 3
**Dependencies**: `wp_publisher.py`, `requests`

**Usage Examples**:
```bash
# Publish all markdown files in docs/
python3 scripts/batch_publish.py --dir docs/ --pattern "*.md"

# Publish with category mapping
python3 scripts/batch_publish.py --files file1.md file2.md --category "Documentation"
```

#### `content_sync.py`
**Purpose**: Automated content synchronization with watch mode
**Language**: Python 3
**Dependencies**: `wp_publisher.py`, `watchdog`

**Usage Examples**:
```bash
# One-time sync of documentation
python3 scripts/content_sync.py --content-dirs ./docs ./content

# Watch mode with 5-minute intervals
python3 scripts/content_sync.py --watch --interval 300

# Sync specific file types
python3 scripts/content_sync.py --pattern "*.md" --exclude "*/node_modules/*"
```

#### `test_connection.py`
**Purpose**: WordPress API connectivity testing
**Language**: Python 3
**Dependencies**: `requests`

**Usage Examples**:
```bash
# Test with credentials from .wp_publisher.env
python3 tests/test_connection.py

# Test with explicit credentials
python3 tests/test_connection.py --username "user" --password "pass" --url "https://example.com"
```

#### `setup_wp_publisher.sh`
**Purpose**: Automated setup for WordPress publishing environment
**Language**: Bash
**Dependencies**: Python 3, curl

**Usage Examples**:
```bash
# Run setup (creates .wp_publisher.env if missing)
./scripts/setup_wp_publisher.sh

# After setup, available commands are displayed
```

### Content Management

#### `find_pages.py`
**Purpose**: Content discovery and indexing utility
**Language**: Python 3
**Dependencies**: None

**Usage Examples**:
```bash
# Find all markdown files
python3 scripts/find_pages.py --pattern "*.md"

# Find files with specific content
python3 scripts/find_pages.py --grep "governance"
```

#### `check_page.py`
**Purpose**: Individual page validation and linting
**Language**: Python 3
**Dependencies**: `markdown`, `pyyaml`

**Usage Examples**:
```bash
# Validate a single page
python3 scripts/check_page.py docs/governance/overview.md

# Check multiple files
python3 scripts/check_page.py file1.md file2.md
```

#### `check_hierarchy.py`
**Purpose**: Documentation structure validation
**Language**: Python 3
**Dependencies**: None

**Usage Examples**:
```bash
# Validate docs/ structure
python3 scripts/check_hierarchy.py --dir docs/

# Check for broken links
python3 scripts/check_hierarchy.py --validate-links
```

### Governance Scripts

#### `test-quorum-validation.ts`
**Purpose**: Governance quorum calculation testing and validation
**Language**: TypeScript
**Dependencies**: Node.js, governance service

**Usage Examples**:
```bash
# Run quorum validation tests
npx ts-node tests/governance/test-quorum-validation.ts

# Test with custom parameters
QUORUM_TEST=true npx ts-node tests/governance/test-quorum-validation.ts
```

#### `submit-bootstrap-proposals.ts`
**Purpose**: Bootstrap proposal submission for initial governance setup
**Language**: TypeScript
**Dependencies**: Node.js, governance service

**Usage Examples**:
```bash
# Submit bootstrap proposals
npx ts-node scripts/governance/submit-bootstrap-proposals.ts

# With custom proposal data
PROPOSAL_DATA=custom.json npx ts-node scripts/governance/submit-bootstrap-proposals.ts
```

### Sync Agent

#### `sync-agent.ps1`
**Purpose**: Automated file organization and hygiene enforcement
**Language**: PowerShell
**Dependencies**: PowerShell 5.1+

**Usage Examples**:
```powershell
# One-time sync
.\scripts\sync-agent.ps1 -Sync

# Continuous monitoring
.\scripts\sync-agent.ps1 -Monitor

# Custom interval monitoring
.\scripts\sync-agent.ps1 -Monitor -IntervalMinutes 30
```

### Validation Scripts

#### `validate-story-simple.ps1`
**Purpose**: Simplified story validation for content
**Language**: PowerShell
**Dependencies**: PowerShell 5.1+

**Usage Examples**:
```powershell
# Validate current directory
.\scripts\validate-story-simple.ps1

# Validate specific path
.\scripts\validate-story-simple.ps1 -Path "docs/"
```

#### `validate-story.ps1`
**Purpose**: Comprehensive story validation with detailed reporting
**Language**: PowerShell
**Dependencies**: PowerShell 5.1+

**Usage Examples**:
```powershell
# Full validation
.\scripts\validate-story.ps1

# Validate with custom rules
.\scripts\validate-story.ps1 -Config "validation-rules.json"
```

## 🚀 Quick Start

1. **Setup Environment**:
   ```bash
   ./scripts/setup_wp_publisher.sh
   ```

2. **Test Connection**:
   ```bash
   python3 tests/test_connection.py
   ```

3. **Run Sync Agent**:
   ```powershell
   .\scripts\sync-agent.ps1 -Sync
   ```

4. **Publish Content**:
   ```bash
   python3 scripts/wp_publisher.py --content docs/README.md
   ```

## 📝 Contributing

When adding new scripts:

1. Place in appropriate category subdirectory
2. Add entry to this README with purpose and usage
3. Include error handling and logging
4. Test on both Windows and Linux environments
5. Update CI workflows if automated execution is needed

## 🔧 Dependencies

Most scripts require:
- Python 3.8+
- PowerShell 5.1+ (Windows) or 7+ (cross-platform)
- Node.js 16+ (for TypeScript scripts)

See individual script headers for specific requirements.
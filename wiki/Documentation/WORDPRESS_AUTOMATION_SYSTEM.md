# NeuroSwarm WordPress Content Automation System

## Overview

The NeuroSwarm WordPress Content Automation System provides a complete solution for automatically publishing documentation, governance updates, and knowledge base entries to the WordPress site at `getblockchain.tech/neuroswarm/` using the REST API.

## Architecture

```
NeuroSwarm Knowledge Base
        │
        │ (JSON files)
        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Content Sync   │    │ Batch Publisher │    │  WP Publisher   │
│   Agent         │───►│                 │───►│                 │
│ (Monitors       │    │ (Bulk           │    │ (REST API       │
│  changes)       │    │  operations)    │    │  client)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
WordPress Site ←───── REST API ←─────── JSON Payloads ───────┘
(getblockchain.tech/neuroswarm/)
```

## Components

### 1. Core Publisher (`wp_publisher.py`)
**Purpose**: Main publishing engine with WordPress REST API integration

**Features**:
- Authenticates using WordPress Application Passwords
- Creates new pages or updates existing ones based on slug
- Uploads media assets and embeds them in content
- Maintains change logs and appends update notes
- Comprehensive error handling and logging

**Usage**:
```bash
python3 admin-node/scripts/wp_publisher.py \
  --username your_username \
  --password your_app_password \
  --content content-file.json
```

### 2. Batch Publisher (`batch_publish.py`)
**Purpose**: Handles bulk publishing operations with progress tracking

**Features**:
- Processes multiple content files in sequence
- Validates content before publishing
- Rate limiting to respect API limits
- Detailed progress reporting and error recovery
- Generates comprehensive batch reports

**Usage**:
```bash
python3 admin-node/scripts/batch_publish.py \
  --username your_username \
  --password your_app_password \
  --directory ./content \
  --pattern "*.json"
```

### 3. Content Sync Agent (`content_sync.py`)
**Purpose**: Automated synchronization with change detection

**Features**:
- Monitors directories for content changes
- Calculates file checksums to detect modifications
- Watch mode for continuous synchronization
- Incremental updates (only changed files)
- Configurable sync intervals

**Usage**:
```bash
# One-time sync
python3 admin-node/scripts/content_sync.py --content-dirs ./docs ./content

# Watch mode (syncs every 5 minutes)
python3 admin-node/scripts/content_sync.py --watch --interval 300
```

### 4. Connection Tester (`test_connection.py`)
**Purpose**: Validates WordPress API connectivity and permissions

**Features**:
- Tests basic API connectivity
- Validates authentication credentials
- Checks user permissions for pages and media
- Provides detailed diagnostic information
- Safe testing without creating content

**Usage**:
```bash
python3 admin-node/scripts/test_connection.py \
  --username your_username \
  --password your_app_password
```

## Content Format

All content files use JSON format with the following structure:

```json
{
  "title": "Page Title",
  "slug": "unique-page-slug",
  "content": "<h2>HTML Content</h2><p>Formatted content here...</p>",
  "status": "publish",
  "format": "html",
  "assets": [
    {
      "path": "./assets/diagram.png",
      "placeholder": "{{DIAGRAM}}",
      "alt_text": "System Architecture Diagram"
    }
  ],
  "metadata": {
    "category": "governance",
    "author": "NeuroSwarm Team",
    "tags": ["documentation", "governance"]
  }
}
```

### Required Fields
- **`title`**: Page title (string)
- **`slug`**: Unique URL slug (string)
- **`content`**: HTML content (string)

### Optional Fields
- **`status`**: "publish", "draft", "private" (default: "publish")
- **`format`**: "html" or "markdown" (default: "html")
- **`assets`**: Array of asset objects for upload
- **`metadata`**: Additional tracking information

## Setup Process

### 1. WordPress Configuration
1. Log into WordPress admin dashboard
2. Navigate to **Users → Profile**
3. Scroll to **Application Passwords** section
4. Create new application password: "NeuroSwarm Publisher"
5. Copy the generated password

### 2. Environment Setup
```bash
# Clone/configure the repository
cd neuroswarm

# Run setup script
chmod +x setup_wp_publisher.sh
./setup_wp_publisher.sh

# Configure credentials
cp .wp_publisher.env.example .wp_publisher.env
# Edit .wp_publisher.env with your credentials
```

### 3. Test Connection
```bash
python3 admin-node/scripts/test_connection.py
```

### 4. Initial Content Sync
```bash
# Sync existing documentation
python3 admin-node/scripts/content_sync.py --content-dirs ./docs ./website/content
```

## Integration Examples

### Governance Updates
When a new governance proposal is approved:

```bash
# Generate content file
python3 scripts/generate_proposal_content.py --proposal-id 123

# Publish to WordPress
python3 admin-node/scripts/wp_publisher.py --content content/proposal-123-approved.json
```

### Knowledge Base Sync
Automated sync of documentation updates:

```bash
# Start continuous sync
python3 admin-node/scripts/content_sync.py --watch --content-dirs ./docs --interval 600
```

### CI/CD Integration
Publish documentation updates on merge:

```yaml
# .github/workflows/publish-docs.yml
name: Publish Documentation
on:
  push:
    paths:
      - 'docs/**'
      - 'content/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: pip install -r requirements-wp.txt
      - name: Publish content
        run: python3 admin-node/scripts/content_sync.py
        env:
          WP_USERNAME: ${{ secrets.WP_USERNAME }}
          WP_APP_PASSWORD: ${{ secrets.WP_APP_PASSWORD }}
```

## Security Considerations

### Authentication
- Uses WordPress Application Passwords (not main password)
- Credentials stored securely (environment variables, not code)
- Separate user accounts for automation

### Content Validation
- JSON schema validation for content files
- HTML sanitization to prevent XSS
- File type validation for media uploads

### API Security
- HTTPS-only communication
- Rate limiting respect
- Error handling without credential exposure

## Monitoring & Logging

### Activity Logs
All publishing activities logged to `wp_publish_log.jsonl`:

```json
{
  "timestamp": "2024-12-19T10:30:00Z",
  "content_title": "Governance Overview",
  "content_slug": "governance-overview",
  "results": {
    "page_action": "updated",
    "page_id": 123,
    "assets_uploaded": 2,
    "success": true
  }
}
```

### Health Monitoring
```bash
# Check sync status
python3 admin-node/scripts/check_sync_status.py

# View recent activity
tail -f wp_publish_log.jsonl | jq '.'
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   ```bash
  python3 admin-node/scripts/test_connection.py  # Diagnose connection issues
   # Check: Username, application password, user permissions
   ```

2. **Page Creation Failed**
   ```bash
   # Check: Slug uniqueness, user role capabilities
  python3 admin-node/scripts/wp_publisher.py --content test-content.json --verbose
   ```

3. **Media Upload Failed**
   ```bash
   # Check: File paths, file sizes, MIME types, upload permissions
   ls -la assets/  # Verify file accessibility
   ```

### Recovery Procedures

```bash
# Retry failed publications
python3 admin-node/scripts/batch_publish.py --directory ./failed-content

# Reset checksums (force full resync)
rm .content_checksums.json
python3 admin-node/scripts/content_sync.py
```

## Performance Optimization

### Rate Limiting
- Built-in delays between API calls
- Batch processing with configurable concurrency
- Exponential backoff for failed requests

### Caching
- File checksum caching to avoid unnecessary uploads
- API response caching for repeated operations
- Connection pooling for multiple requests

### Scalability
- Modular architecture supports horizontal scaling
- Async processing for large content batches
- Database integration for content metadata

## Future Enhancements

### Planned Features
- **Webhook Integration**: Real-time sync triggers
- **Content Versioning**: Git-based version control integration
- **Multi-site Support**: Publish to multiple WordPress instances
- **Rich Media Processing**: Image optimization and responsive images
- **SEO Automation**: Automatic meta tag generation and sitemap updates

### API Extensions
- **Custom Post Types**: Support for different content types
- **Taxonomy Management**: Automatic category and tag assignment
- **User Management**: Automated user provisioning
- **Plugin Integration**: Support for popular WordPress plugins

## Support & Documentation

- **README**: `WP_PUBLISHER_README.md` - Comprehensive usage guide
- **API Reference**: Inline code documentation
- **Examples**: `example-content.json` - Sample content files
- **Scripts**: Setup and utility scripts in repository root

## Contributing

1. Follow existing code patterns and error handling
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Maintain backward compatibility
5. Test with real WordPress instances

---

*This system ensures NeuroSwarm's documentation stays synchronized with the public WordPress site, maintaining consistency and enabling automated content publishing workflows.*
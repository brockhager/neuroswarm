# NeuroSwarm WordPress Content Publisher

Automates the publishing of NeuroSwarm documentation, governance updates, and knowledge base entries to the WordPress site at `getblockchain.tech/neuroswarm/` using the REST API.

## Features

- ✅ **Automatic Authentication**: Uses WordPress Application Passwords for secure API access
- ✅ **Smart Publishing**: Creates new pages or updates existing ones based on slug
- ✅ **Content Formatting**: Converts markdown to HTML with proper structure
- ✅ **Asset Management**: Uploads images and embeds them in content
- ✅ **Change Tracking**: Maintains logs and appends change notes to prevent overwrites
- ✅ **Error Handling**: Comprehensive error reporting and recovery
- ✅ **Batch Processing**: Can process multiple content files in sequence

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements-wp.txt
```

### 2. Configure WordPress Application Password

1. Log into your WordPress admin dashboard
2. Go to **Users → Profile**
3. Scroll down to **Application Passwords**
4. Create a new application password with the name "NeuroSwarm Publisher"
5. Copy the generated password

### 3. Configure Environment

Edit `.wp_publisher.env`:

```bash
# Replace with your actual credentials
WP_USERNAME=your_wordpress_username
WP_APP_PASSWORD=your_generated_app_password
```

## Usage

### Basic Publishing

```bash
python admin-node/scripts/wp_publisher.py \
  --username your_username \
  --password your_app_password \
  --content example-content.json
```

### Using Environment Variables

```bash
# Load from .env file
export $(cat .wp_publisher.env | xargs)
python admin-node/scripts/wp_publisher.py --content governance-update.json
```

### Batch Publishing

```bash
# Publish multiple files (admin-node)
for file in content/*.json; do
  python admin-node/scripts/wp_publisher.py --content "$file"
done
```

## Content File Format

Content files should be JSON with the following structure:

```json
{
  "title": "Page Title",
  "slug": "page-slug",
  "content": "<h2>Heading</h2><p>Content here...</p>",
  "status": "publish",
  "format": "html",
  "assets": [
    {
      "path": "./assets/image.png",
      "placeholder": "{{IMAGE_PLACEHOLDER}}",
      "alt_text": "Alt text for accessibility"
    }
  ],
  "metadata": {
    "category": "governance",
    "author": "NeuroSwarm Team"
  }
}
```

### Content Fields

- **`title`** (required): Page title
- **`slug`** (required): URL slug (must be unique)
- **`content`** (required): HTML content
- **`status`** (optional): "publish", "draft", "private" (default: "publish")
- **`format`** (optional): "html" or "markdown" (default: "html")
- **`assets`** (optional): Array of asset objects to upload
- **`metadata`** (optional): Additional metadata for tracking

### Asset Upload

Assets are uploaded automatically and their URLs are embedded in content:

```json
{
  "assets": [
    {
      "path": "./images/diagram.png",
      "placeholder": "{{DIAGRAM}}",
      "alt_text": "System Architecture Diagram"
    }
  ]
}
```

In your content, use the placeholder:

```html
<img src="{{DIAGRAM}}" alt="System Architecture Diagram">
```

## Integration Examples

### Publishing Governance Updates

```bash
# When a new proposal is approved (admin-node)
python admin-node/scripts/wp_publisher.py --content governance/proposal-123-approved.json
```

### Knowledge Base Sync

```bash
# Sync updated documentation (admin-node)
python admin-node/scripts/wp_publisher.py --content kb/governance-system-update.json
```

### Automated Publishing Script

```bash
#!/bin/bash
# auto-publish.sh

# Load environment
export $(cat .wp_publisher.env | xargs)

# Check for new content files
find ./content -name "*.json" -newer last_publish.txt | while read file; do
  echo "Publishing: $file"
  python wp_publisher.py --content "$file"
done

# Update timestamp
touch last_publish.txt
```bash
# Load environment
export $(cat .wp_publisher.env | xargs)

# Check for new content files
find ./content -name "*.json" -newer last_publish.txt | while read file; do
  echo "Publishing: $file"
  python admin-node/scripts/wp_publisher.py --content "$file"
done

# Update timestamp
touch last_publish.txt
```
Uses HTTP Basic Authentication with WordPress Application Passwords:

```
Authorization: Basic base64(username:app_password)
```

## Logging and Monitoring

### Activity Log

All publishing activities are logged to `wp_publish_log.jsonl`:

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

### Monitoring Script

```python
# monitor_publishes.py
import json
from pathlib import Path

def analyze_logs():
    log_file = Path('wp_publish_log.jsonl')
    if not log_file.exists():
        return

    stats = {'created': 0, 'updated': 0, 'failed': 0, 'assets': 0}

    with open(log_file, 'r') as f:
        for line in f:
            entry = json.loads(line)
            results = entry['results']

            if results['success']:
                if results['page_action'] == 'created':
                    stats['created'] += 1
                elif results['page_action'] == 'updated':
                    stats['updated'] += 1

                stats['assets'] += len(results.get('assets_uploaded', []))
            else:
                stats['failed'] += 1

    print(f"Publishing Stats: {stats}")

if __name__ == '__main__':
    analyze_logs()
```

## Error Handling

### Common Issues

1. **Authentication Failed**
   - Check username and application password
   - Ensure Application Passwords are enabled in WordPress

2. **Page Creation Failed**
   - Verify slug uniqueness
   - Check user permissions for page creation

3. **Asset Upload Failed**
   - Verify file paths exist
   - Check file size limits (default: 10MB)
   - Ensure proper MIME types

### Recovery Procedures

```bash
# Check connection (admin-node)
python admin-node/scripts/test_connection.py --username <username> --password <app_password>

# Retry failed publishes
python wp_publisher.py --content failed-content.json --retry

# Validate content format
python -m json.tool example-content.json
```

## Security Considerations

- **Application Passwords**: Use dedicated passwords for automation
- **File Permissions**: Restrict access to configuration files
- **Content Validation**: Always validate content before publishing
- **Rate Limiting**: Respect WordPress API rate limits
- **Backup**: Regular backups of WordPress content

## Troubleshooting

### Debug Mode

Enable verbose logging:

```bash
export VERBOSE_LOGGING=true
python wp_publisher.py --content debug-content.json
```

### Test Environment

Set up a staging environment:

```bash
WP_SITE_URL=https://staging.getblockchain.tech/neuroswarm/
python wp_publisher.py --content test-content.json
```

## Contributing

1. Test all changes with the example content
2. Update documentation for new features
3. Add error handling for edge cases
4. Maintain backward compatibility

## License

This tool is part of the NeuroSwarm project and follows the same licensing terms.
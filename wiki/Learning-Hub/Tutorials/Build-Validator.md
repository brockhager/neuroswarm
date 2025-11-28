# Build Your First Validator Plugin

This tutorial guides you through creating a simple validator plugin that checks if generated text contains specific keywords.

## Prerequisites

- Node.js v18+ installed
- A running instance of NeuroSwarm Node

## Step 1: Create Plugin Directory

Navigate to your `ns-node/plugins` directory and create a new folder:

```bash
cd ns-node/plugins
mkdir my-keyword-validator
cd my-keyword-validator
```

## Step 2: Create Manifest

Create a `plugin.json` file to define your plugin:

```json
{
  "id": "my-keyword-validator",
  "name": "Keyword Validator",
  "version": "1.0.0",
  "type": "validator",
  "author": "Your Name",
  "description": "Validates that text contains required keywords",
  "entrypoint": "index.js",
  "config": {
    "keywords": ["neuroswarm", "ai"],
    "severity": "warn"
  },
  "permissions": [
    "read:text",
    "write:validation-result"
  ]
}
```

## Step 3: Implement Logic

Create `index.js` with your validation logic:

```javascript
class KeywordValidator {
    constructor(config = {}) {
        this.keywords = config.keywords || [];
        this.severity = config.severity || 'warn';
    }

    async validate(text, context) {
        const lowerText = text.toLowerCase();
        const missing = this.keywords.filter(k => !lowerText.includes(k.toLowerCase()));

        if (missing.length > 0) {
            return {
                status: this.severity,
                message: `Missing required keywords: ${missing.join(', ')}`,
                details: { missing }
            };
        }

        return {
            status: 'pass',
            message: 'All keywords present'
        };
    }
}

export default KeywordValidator;
```

## Step 4: Test It

Restart your NeuroSwarm node. The plugin will be auto-discovered.

You can test it via API:

```bash
curl -X POST http://localhost:3009/api/plugins/validators/my-keyword-validator/execute \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}'
```

Response:
```json
{
  "status": "warn",
  "message": "Missing required keywords: neuroswarm, ai",
  ...
}
```

## Next Steps

- Add more complex logic (regex, sentiment analysis).
- Publish your plugin to the community!

# NeuroSwarm Validator Plugin Starter Kit

**Build custom content validators** for the NeuroSwarm ecosystem.

This starter template provides everything you need to create, test, and deploy a validator plugin that enforces content quality standards.

---

## 🎯 What is a Validator Plugin?

Validators are plugins that **check incoming data** before it enters the NeuroSwarm Global Brain. They enforce:

- **Quality standards** (minimum length, coherence)
- **Safety rules** (spam detection, toxicity filtering)
- **Business logic** (required fields, format validation)
- **Trust metrics** (signature verification, source validation)

### Use Cases

✅ **Content Moderation**: Block spam, hate speech, or inappropriate content  
✅ **Data Quality**: Ensure submissions meet minimum standards  
✅ **Compliance**: Enforce regulatory requirements (GDPR, COPPA)  
✅ **Trust & Safety**: Verify signatures and source authenticity  
✅ **Custom Rules**: Implement domain-specific validation logic  

---

## 🚀 Quick Start

### 1. Install Dependencies

This starter kit has no external dependencies — it uses pure Node.js.

```bash
cd examples/validator-plugin
node test.js  # Run tests to verify setup
```

### 2. Customize the Validator

Edit `index.js` to implement your validation logic:

```javascript
async validate(entry) {
  // Your custom validation logic here
  if (entry.payload.includes('forbidden')) {
    return {
      valid: false,
      errors: ['Forbidden content detected']
    };
  }
  
  return { valid: true };
}
```

### 3. Test Locally

```bash
node test.js
```

Expected output:
```
🧪 Running validator plugin tests...

Test 1: Valid entry
✅ PASS

Test 2: Missing required field
✅ PASS

...

📊 Test Results: 7 passed, 0 failed
✅ All tests passed!
```

### 4. Register with NeuroSwarm

**Option A: Via API**

```bash
curl -X POST http://localhost:3009/api/plugins/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-custom-validator",
    "type": "validator",
    "path": "./examples/validator-plugin/index.js",
    "config": {
      "minLength": 10,
      "blockedWords": ["spam", "scam"]
    }
  }'
```

**Option B: Via Code**

```javascript
import PluginManager from './ns-node/src/services/plugin-manager.js';

const pluginManager = new PluginManager();
await pluginManager.loadPlugin({
  name: 'my-custom-validator',
  type: 'validator',
  path: './examples/validator-plugin/index.js',
  config: { minLength: 10 }
});
```

---

## 📚 API Reference

### Constructor

```javascript
constructor(config = {})
```

**Parameters**:
- `config.name` (string): Plugin name (default: 'custom-validator')
- `config.version` (string): Plugin version (default: '1.0.0')
- `config.enabled` (boolean): Enable/disable plugin (default: true)
- `config.minLength` (number): Minimum payload length (default: 10)
- `config.maxLength` (number): Maximum payload length (default: 10000)
- `config.blockedWords` (string[]): Words to block (default: [])
- `config.requiredFields` (string[]): Required entry fields (default: ['type', 'payload'])

### validate(entry)

Main validation method called by PluginManager.

**Parameters**:
- `entry` (Object): Data entry to validate
  - `entry.type` (string): Entry type (e.g., 'learn', 'query')
  - `entry.payload` (any): Entry content
  - `entry.signedBy` (string): Creator signature
  - `entry.metadata` (Object): Optional metadata

**Returns**: `Promise<Object>`
```javascript
{
  valid: boolean,           // true if validation passed
  validator: string,        // validator name
  version: string,          // validator version
  errors: string[],         // list of errors (if any)
  warnings: string[],       // list of warnings (if any)
  executionTime: number,    // validation time in ms
  timestamp: string         // ISO timestamp
}
```

### getMetadata()

Returns validator metadata for registration.

**Returns**: `Object`
```javascript
{
  name: string,
  version: string,
  type: 'validator',
  description: string,
  author: string,
  enabled: boolean,
  config: Object
}
```

### enable() / disable()

Enable or disable the validator dynamically.

### updateConfig(newConfig)

Update configuration at runtime.

**Parameters**:
- `newConfig` (Object): New configuration values

---

## 🎨 Customization Examples

### Example 1: Email Validator

```javascript
async validate(entry) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(entry.payload)) {
    return {
      valid: false,
      errors: ['Invalid email format'],
      validator: this.name
    };
  }
  
  return { valid: true, validator: this.name };
}
```

### Example 2: Profanity Filter

```javascript
constructor(config) {
  super(config);
  this.profanityList = config.profanityList || ['bad', 'words'];
}

async validate(entry) {
  const text = entry.payload.toLowerCase();
  
  for (const word of this.profanityList) {
    if (text.includes(word)) {
      return {
        valid: false,
        errors: [`Profanity detected: ${word}`],
        validator: this.name
      };
    }
  }
  
  return { valid: true, validator: this.name };
}
```

### Example 3: Rate Limiting Validator

```javascript
constructor(config) {
  super(config);
  this.submissions = new Map(); // user -> count
  this.limit = config.rateLimit || 10;
  this.window = config.windowMs || 60000; // 1 minute
}

async validate(entry) {
  const userId = entry.signedBy;
  const now = Date.now();
  
  if (!this.submissions.has(userId)) {
    this.submissions.set(userId, { count: 1, resetAt: now + this.window });
    return { valid: true, validator: this.name };
  }
  
  const userData = this.submissions.get(userId);
  
  if (now > userData.resetAt) {
    // Reset window
    userData.count = 1;
    userData.resetAt = now + this.window;
    return { valid: true, validator: this.name };
  }
  
  if (userData.count >= this.limit) {
    return {
      valid: false,
      errors: ['Rate limit exceeded'],
      validator: this.name
    };
  }
  
  userData.count++;
  return { valid: true, validator: this.name };
}
```

---

## 🧪 Testing Guide

### Unit Tests

Create `test.js` with test cases:

```javascript
import CustomValidator from './index.js';

const validator = new CustomValidator({ minLength: 5 });

// Test valid entry
const result = await validator.validate({
  type: 'learn',
  payload: 'Valid content here'
});

console.assert(result.valid === true, 'Should pass validation');
```

### Integration Tests

Test with real NeuroSwarm nodes:

```bash
# Start NS node
cd neuroswarm
node ns-node/server.js &

# Register plugin
curl -X POST http://localhost:3009/api/plugins/register \
  -H "Content-Type: application/json" \
  -d @plugin-manifest.json

# Submit test transaction
curl -X POST http://localhost:8080/v1/tx \
  -H "Content-Type: application/json" \
  -d '{"type":"learn","payload":"Test content"}'

# Check validation results
curl http://localhost:3009/api/plugins/active
```

---

## 📊 Performance Considerations

### Optimization Tips

1. **Async Operations**: Use `async/await` for I/O operations
2. **Caching**: Cache expensive computations (e.g., ML models)
3. **Timeouts**: Set execution timeouts to prevent blocking
4. **Error Handling**: Always catch and log errors gracefully

### Benchmarking

```javascript
const startTime = Date.now();
const result = await validator.validate(entry);
const executionTime = Date.now() - startTime;

console.log(`Validation took ${executionTime}ms`);
```

**Target**: < 50ms per validation for real-time performance

---

## 🔒 Security Best Practices

1. **Input Sanitization**: Never trust user input
2. **Signature Verification**: Always verify cryptographic signatures
3. **Resource Limits**: Prevent DoS with timeouts and size limits
4. **Error Messages**: Don't leak sensitive information in errors
5. **Dependency Audits**: Keep dependencies updated

---

## 📚 Further Reading

- **[Plugin System Architecture](../../wiki/Learning-Hub/Core-Concepts/Plugins.md)** — Deep dive
- **[Build Your First Validator Tutorial](../../wiki/Learning-Hub/Tutorials/Build-Validator.md)** — Step-by-step
- **[PluginManager API](../../wiki/Technical/Plugins.md)** — Full API reference
- **[Contributing Guidelines](../../wiki/Development/Contributor-Guide.md)** — How to contribute

---

## 🤝 Contributing

**Found a bug?** Open an issue  
**Have an improvement?** Submit a pull request  
**Need help?** Ask in [Discord #plugins](../../README.md#community)

---

## 📄 License

MIT License — See [LICENSE](../../LICENSE) for details

**Last Updated**: 2025-11-28  
**Maintainers**: NeuroSwarm Plugin Team

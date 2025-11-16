# Living Documentation Processes

This document establishes the processes and tools for maintaining NeuroSwarm's documentation as a living, trustworthy artifact that evolves with the codebase. Living documentation ensures transparency, accessibility, and accuracy across all governance and technical materials.

## Overview

Living documentation treats docs as first-class code artifacts with automated generation, validation, and versioning. This prevents documentation drift and maintains the trust foundation built by our governance and contribution systems.

**Core Principles:**
- **Documentation as Code:** Docs follow the same rigor as code (versioning, testing, CI/CD)
- **Automation First:** Manual processes are minimized through tooling
- **Validation Required:** All docs must pass automated checks before merging
- **Community Maintainable:** Clear processes enable all contributors to improve docs

## Automated Documentation Generation

### API Documentation Generation

#### TypeScript API Docs
```typescript
// neuro-services/src/routes/index.ts
/**
 * @swagger
 * /v1/index/search:
 *   get:
 *     summary: Search indexed manifests
 *     parameters:
 *       - name: q
 *         in: query
 *         schema:
 *           type: string
 *         description: Search query
 *       - name: tag
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by tag
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IndexItem'
 *                 total:
 *                   type: integer
 */
app.get('/v1/index/search', async (req, res) => {
  // Implementation
});
```

**Generation Process:**
```bash
# Generate OpenAPI spec from annotations
npm run docs:generate-api

# Build interactive API docs
npm run docs:build-api-docs
```

#### Rust Documentation
```rust
// neuro-program/programs/neuro-program/src/lib.rs
/// Manifest account structure for storing AI model metadata
///
/// # Fields
/// * `authority` - The account authorized to update this manifest
/// * `content_hash` - SHA-256 hash of the model content
/// * `metadata` - Additional metadata as JSON string
/// * `created_at` - Unix timestamp of creation
/// * `confidence` - Validator confidence score (0-100)
#[derive(Accounts)]
#[instruction(content_hash: [u8; 32])]
pub struct CreateManifest<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 4 + 1024 + 8 + 1,
        seeds = [b"manifest", authority.key().as_ref(), &content_hash],
        bump
    )]
    pub manifest: Account<'info, Manifest>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Generation Process:**
```bash
# Generate Rust docs
cargo doc --no-deps --open

# Export to Markdown for docs hub
cargo doc --no-deps && ./scripts/rust-docs-to-md.sh
```

### Architecture Diagram Generation

#### Code-to-Diagram Automation
```yaml
# .github/workflows/docs.yml
name: Generate Documentation
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'programs/**'

jobs:
  generate-diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate architecture diagrams
        run: |
          # Extract struct relationships from Rust
          cargo install cargo-deps
          cargo deps --include-orphans | dot -Tpng > docs/diagrams/architecture.png

          # Generate sequence diagrams from logs
          ./scripts/generate-sequence-diagrams.sh
```

#### Mermaid Diagram Generation
```javascript
// scripts/generate-diagrams.js
const fs = require('fs');
const { execSync } = require('child_process');

// Extract API routes and generate flow diagrams
function generateApiFlowDiagram() {
  const routes = extractRoutesFromCode();
  const mermaid = generateMermaidFlow(routes);
  fs.writeFileSync('docs/diagrams/api-flow.md', mermaid);
}

// Generate from code annotations
execSync('npx mmdc -i docs/diagrams/api-flow.md -o docs/diagrams/api-flow.png');
```

## PR Documentation Requirements

### Documentation Checklist

Every PR must include documentation updates. The following checklist is enforced by CI:

#### For Code Changes
- [ ] **API Documentation:** Updated OpenAPI/Swagger specs for new endpoints
- [ ] **Type Documentation:** Added JSDoc/TSDoc comments for public APIs
- [ ] **Error Documentation:** Documented error codes and messages
- [ ] **Migration Guide:** Breaking changes include migration instructions

#### For Feature Changes
- [ ] **User Guide Updates:** Updated relevant user guides and tutorials
- [ ] **Architecture Updates:** Modified architecture diagrams if needed
- [ ] **Playbook Updates:** Updated contributor playbooks if processes changed
- [ ] **Changelog:** Added entry to CHANGELOG.md

#### For Governance Changes
- [ ] **Governance Updates:** Updated governance docs for process changes
- [ ] **Decision Log:** Added entry to governance decision log
- [ ] **Badge Updates:** Updated recognition criteria if modified

### PR Template Enforcement

```markdown
<!-- PR Template with Documentation Requirements -->

## Documentation Updates

### Required Updates (check all that apply)
- [ ] API documentation updated
- [ ] User guides updated
- [ ] Architecture diagrams updated
- [ ] Error codes documented
- [ ] Migration guide included (for breaking changes)
- [ ] Governance docs updated (if applicable)

### Documentation Validation
- [ ] Links are valid and functional
- [ ] Code examples are tested and working
- [ ] Screenshots updated (if UI changed)
- [ ] Cross-references are accurate

### Additional Documentation
<!-- Describe any additional documentation updates made -->
```

### CI Documentation Validation

```yaml
# .github/workflows/pr-checks.yml
name: PR Validation
on: [pull_request]

jobs:
  docs-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check documentation updates
        run: |
          # Verify docs were updated for code changes
          ./scripts/check-docs-updated.sh

      - name: Validate links
        run: |
          # Check all internal links are valid
          npx markdown-link-check docs/**/*.md

      - name: Validate formatting
        run: |
          # Check markdown formatting
          npx markdownlint docs/**/*.md

      - name: Generate API docs
        run: |
          # Ensure API docs can be generated
          npm run docs:generate-api
```

## Doc CI/CD Pipeline

### Automated Documentation Pipeline

```yaml
# docs-pipeline.yml
name: Documentation Pipeline
on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'docs/**'
      - 'src/**'
      - 'programs/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install -w

      - name: Generate API docs
        run: npm run docs:generate

      - name: Validate documentation
        run: npm run docs:validate

      - name: Build documentation site
        run: npm run docs:build

      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/build
```

### Documentation Testing

#### Link Validation
```javascript
// scripts/validate-docs.js
const fs = require('fs');
const path = require('path');
const markdownLinkCheck = require('markdown-link-check');

function validateDocLinks(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) return reject(err);

      markdownLinkCheck(content, {
        baseUrl: 'https://github.com/neuroswarm/neuroswarm/blob/main/',
        httpHeaders: [{ 'User-Agent': 'NeuroSwarm-Doc-Validator' }]
      }, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  });
}
```

... (truncated for brevity)
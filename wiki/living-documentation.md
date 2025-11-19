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

#### Content Validation
```javascript
// scripts/validate-content.js
function validateDocumentation() {
  const issues = [];

  // Check for outdated version references
  if (content.includes('v0.1') && !isCurrentVersion('v0.1')) {
    issues.push('Outdated version reference found');
  }

  // Check for broken internal links
  const internalLinks = extractInternalLinks(content);
  for (const link of internalLinks) {
    if (!fs.existsSync(path.resolve(docRoot, link))) {
      issues.push(`Broken internal link: ${link}`);
    }
  }

  return issues;
}
```

## Versioned Documentation

### Documentation Versioning Strategy

#### Release-Tagged Documentation
```bash
# Tag documentation with releases
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Generate versioned docs
npm run docs:version-tag v1.0.0
```

#### Version-Specific URLs
```
# Current (main branch)
https://docs.neuroswarm.io/

# Version-specific
https://docs.neuroswarm.io/v1.0.0/
https://docs.neuroswarm.io/v1.1.0/

# Latest stable
https://docs.neuroswarm.io/stable/
```

### Version Management

#### Semantic Versioning for Docs
- **MAJOR:** Breaking changes in APIs or governance
- **MINOR:** New features or significant improvements
- **PATCH:** Bug fixes, clarifications, or minor updates

#### Version Compatibility Matrix
```markdown
| NeuroSwarm Version | Documentation Version | Compatibility |
|-------------------|----------------------|---------------|
| v1.0.x           | v1.0                | Full         |
| v1.1.x           | v1.1                | Full         |
| v2.0.x           | v2.0                | Breaking     |
```

## Community Documentation Contributions

### Documentation PR Templates

#### Bug Fix Documentation
```markdown
## Documentation Bug Fix

### Issue Description
[Describe the documentation issue]

### Root Cause
[What was incorrect or missing]

### Fix Applied
[What was changed and why]

### Validation
- [ ] Links tested and working
- [ ] Content accuracy verified
- [ ] Cross-references updated
- [ ] No broken formatting
```

#### New Feature Documentation
```markdown
## New Feature Documentation

### Feature Overview
[Brief description of the feature]

### Documentation Added
- [ ] API reference documentation
- [ ] User guide updates
- [ ] Architecture diagram updates
- [ ] Example code snippets

### Target Audience
- [ ] Developers (API docs)
- [ ] Operators (deployment guides)
- [ ] Contributors (playbooks)
- [ ] Users (tutorials)

### Review Checklist
- [ ] Technical accuracy verified
- [ ] Code examples tested
- [ ] Screenshots updated
- [ ] Cross-references added
```

### Documentation Working Group

#### WG Responsibilities
- **Review Process:** Weekly review of documentation PRs
- **Standards Maintenance:** Update documentation standards quarterly
- **Tool Maintenance:** Keep documentation tooling current
- **Community Training:** Host documentation contribution workshops

#### WG Membership
- **Automatic Eligibility:** Contributors with "Community Builder" badge
- **Application Process:** Submit documentation improvement proposal
- **Term:** 3 months, renewable based on contributions

### Documentation Bounty Program

#### Bounty Categories
- **Critical Fixes:** $500 - Security docs, API breaking changes
- **Major Improvements:** $200 - New tutorials, comprehensive guides
- **Minor Enhancements:** $50 - Typos, formatting, link fixes

#### Bounty Claim Process
1. **Identify Issue:** Find documentation gap or error
2. **Submit Proposal:** Create issue with improvement plan
3. **Claim Bounty:** Reference issue in PR for automatic bounty
4. **Review & Payment:** WG review triggers NST payment

## Documentation Maintenance Workflows

### Monthly Documentation Review

#### Process Overview
1. **Week 1:** Automated checks identify outdated content
2. **Week 2:** Working group reviews and prioritizes updates
3. **Week 3:** Community contributors update flagged content
4. **Week 4:** Final review and version tagging

#### Automated Outdated Detection
```javascript
// scripts/check-outdated-docs.js
function checkOutdatedDocumentation() {
  const issues = [];

  // Check API docs against code
  const apiChanges = getRecentApiChanges();
  for (const change of apiChanges) {
    if (!docsUpdatedForChange(change)) {
      issues.push({
        type: 'api_docs_outdated',
        change: change,
        severity: 'high'
      });
    }
  }

  // Check for dead links
  const deadLinks = findDeadLinks();
  issues.push(...deadLinks);

  return issues;
}
```

### Documentation Debt Tracking

#### Debt Categories
- **Technical Debt:** Outdated API references, broken examples
- **Content Debt:** Missing tutorials, incomplete guides
- **Structural Debt:** Poor organization, redundant content

#### Debt Prioritization
```javascript
function calculateDocDebtPriority(debt) {
  const impact = debt.userImpact * 0.4;
  const frequency = debt.accessFrequency * 0.3;
  const maintenance = (1 - debt.maintenanceCost) * 0.3;

  return impact + frequency + maintenance;
}
```

## Success Metrics & Monitoring

### Documentation Health Metrics

#### Coverage Metrics
- **API Documentation:** 100% of public endpoints documented
- **Code Coverage:** 95% of public functions have docstrings
- **User Journey:** Complete coverage of user workflows

#### Quality Metrics
- **Link Health:** <1% broken internal links
- **Update Freshness:** <30 days since last update for active features
- **User Satisfaction:** >4.5/5.0 documentation rating

#### Contribution Metrics
- **PR Acceptance Rate:** >80% documentation PRs accepted
- **Update Frequency:** Daily documentation updates
- **Community Contributions:** 50+ documentation PRs per month

### Monitoring Dashboard

#### Real-time Metrics
```javascript
// docs/metrics.js
const metrics = {
  totalPages: countMarkdownFiles(),
  brokenLinks: countBrokenLinks(),
  outdatedContent: countOutdatedContent(),
  contributorCount: countDocContributors(),
  averageUpdateAge: calculateAverageUpdateAge()
};
```

#### Automated Alerts
- **Broken Links:** Immediate alert for new broken links
- **Outdated Content:** Weekly report of content >90 days old
- **Missing Coverage:** Alert when API coverage drops below 95%

## Implementation Timeline

### Phase 1: Foundation (Q4 2025)
- [x] Documentation validation CI/CD pipeline
- [x] PR documentation requirements
- [ ] Automated API documentation generation
- [ ] Link validation system

### Phase 2: Enhancement (Q1 2026)
- [ ] Versioned documentation system
- [ ] Documentation working group formation
- [ ] Community contribution templates
- [ ] Documentation bounty program

### Phase 3: Optimization (Q2 2026)
- [ ] Advanced automation (diagrams, examples)
- [ ] Documentation health dashboard
- [ ] AI-assisted documentation generation
- [ ] Cross-repository documentation sync

## Getting Started

### For Contributors
1. **Check Requirements:** Review PR documentation checklist
2. **Use Templates:** Follow appropriate documentation PR template
3. **Validate Locally:** Run `npm run docs:validate` before submitting
4. **Get Help:** Join #documentation channel for assistance

### For Maintainers
1. **Review Automation:** Monitor CI/CD pipeline results
2. **Monthly Reviews:** Participate in documentation working group
3. **Set Standards:** Contribute to documentation guidelines
4. **Mentor Contributors:** Help new contributors with documentation

---

**Living documentation ensures NeuroSwarm's governance and technical knowledge remains current, accessible, and trustworthy. This framework transforms documentation from a maintenance burden into a community-powered asset that grows with the project.**

*Last updated: November 11, 2025*
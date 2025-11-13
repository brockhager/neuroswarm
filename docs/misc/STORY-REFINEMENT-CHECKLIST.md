# NeuroSwarm Story Refinement Checklist

## Overview
This checklist ensures draft stories are refined enough to be actionable before moving to the "Ready" column. Only stories that pass all criteria should be moved from draft status to "Ready".

## Refinement Criteria

### ✅ 1. Clear Outcome (REQUIRED)
- [ ] **Specific Deliverable**: Story describes a concrete, measurable outcome
- [ ] **Value Statement**: Explains why this matters to NeuroSwarm users/developers
- [ ] **Success Metrics**: Defines how to measure completion (not just "done")

**Examples:**
❌ Bad: "Build React UI"
✅ Good: "Build chat interface allowing users to send/receive messages with real-time updates"

### ✅ 2. Acceptance Criteria (REQUIRED)
- [ ] **Functional Requirements**: Lists specific features/behaviors
- [ ] **Non-Functional Requirements**: Performance, security, or usability constraints
- [ ] **Edge Cases**: Handles error conditions and boundary scenarios
- [ ] **Testing Approach**: How the feature will be validated

**Template:**
```
Given: [initial context]
When: [user action or system event]
Then: [expected outcome]
```

### ✅ 3. Subsystem Classification (REQUIRED)
- [ ] **Primary Label**: Has appropriate section label (shared-contracts, on-chain-core, etc.)
- [ ] **Subsystem Context**: References affected components/modules
- [ ] **Dependencies**: Lists prerequisite work or blocking factors

**Available Labels:**
- `shared-contracts` - Schema and type definitions
- `on-chain-core` - Solana program and blockchain logic
- `services-layer` - Gateway, Indexer, and APIs
- `web-node` - React UI and web interfaces
- `networking` - Peer sync and communication
- `security` - Authentication, validation, and trust
- `governance` - Voting, proposals, and governance
- `website` - Marketing site and documentation

### ✅ 4. Size & Effort Estimation (REQUIRED)
- [ ] **Story Points**: Estimated using Fibonacci scale (1, 2, 3, 5, 8, 13)
- [ ] **Time Estimate**: Rough time commitment (hours/days)
- [ ] **Complexity Level**: Simple, Medium, or Complex designation

**Size Guidelines:**
- **1-2 points**: Trivial changes, documentation updates
- **3-5 points**: Single feature implementation, moderate testing
- **8-13 points**: Complex features, multiple component changes

### ✅ 5. Priority Assignment (REQUIRED)
- [ ] **Business Value**: Impact on project goals and user value
- [ ] **Dependencies**: Blocking other work or enabling future work
- [ ] **Risk Level**: Technical risk or timeline sensitivity
- [ ] **Priority Label**: `priority-high`, `priority-medium`, or `priority-low`

**Priority Guidelines:**
- **High**: Blocks critical path, security issues, governance deadlines
- **Medium**: Current sprint focus, incremental improvements
- **Low**: Nice-to-have features, future optimizations

### ✅ 6. Definition of Ready (OPTIONAL but Recommended)
- [ ] **No Ambiguities**: All questions answered, no "TBD" items
- [ ] **Sufficient Context**: Links to relevant docs, designs, or examples
- [ ] **Breaking Changes**: Identifies potential breaking changes
- [ ] **Migration Path**: If applicable, how existing systems adapt

## Refinement Workflow

### Step 1: Initial Review
1. Open draft story in GitHub Projects
2. Review against checklist criteria
3. Identify missing information or unclear requirements

### Step 2: Story Refinement
1. **Split Oversized Stories**: If >13 points, break into smaller stories
2. **Add Missing Details**: Fill in acceptance criteria, estimates, labels
3. **Clarify Ambiguities**: Update description with specific requirements
4. **Add Context**: Include links to designs, docs, or related issues

### Step 3: Peer Review
1. **Team Validation**: Have another contributor review the refined story
2. **PO Approval**: Product owner validates business value and priority
3. **Technical Review**: Ensure technical feasibility and estimates

### Step 4: Move to Ready
1. **All Criteria Met**: Story passes complete checklist
2. **Status Update**: Move from draft to "Ready" column
3. **Assignment**: Assign to contributor or working group
4. **Sprint Planning**: Add to appropriate sprint backlog

## Quality Gates

### ❌ Automatic Rejection Criteria
- Missing acceptance criteria
- No size estimation
- Unclear success metrics
- No subsystem classification

### ⚠️ Warning Signs
- Story points >13 (consider splitting)
- Multiple subsystems affected
- High technical risk without mitigation
- Vague or ambiguous requirements

## Tools & Automation

### Automated Checks (Future Enhancement)
```powershell
# Example: Validate story meets minimum criteria
.\validate-story.ps1 -StoryId "PVTI_xxx" -Checklist
```

### Bulk Refinement
```powershell
# Review all draft stories at once
.\refinement-review.ps1 -Column "Backlog" -Checklist
```

## Success Metrics

- **Refinement Velocity**: Stories refined per week
- **Ready Column Health**: Average time in Ready before In Progress
- **Sprint Predictability**: Actual vs. estimated story points
- **Quality Score**: Percentage of stories meeting all criteria

## Examples

### ✅ Well-Refined Story
**Title:** `[services-layer] Implement IPFS storage adapter with error handling`

**Description:**
```
Implement IPFS client integration for the Indexer service with comprehensive error handling and retry logic.

Acceptance Criteria:
- Connect to IPFS node with configurable endpoints
- Upload/download files with content addressing
- Handle network failures with exponential backoff
- Validate file integrity using CIDs
- Log all operations with structured events

Technical Notes:
- Use js-ipfs or ipfs-http-client library
- Implement circuit breaker pattern for reliability
- Add metrics for upload/download performance

Size: 5 points (2-3 days)
Priority: High (blocks content storage features)
```

### ❌ Poorly Refined Story
**Title:** `Add storage stuff`

**Description:**
```
We need storage. Make it work with IPFS or something.
```

## Continuous Improvement

- **Retrospective**: Monthly review of refinement effectiveness
- **Template Updates**: Evolve story template based on lessons learned
- **Training**: Onboard new contributors with refinement best practices
- **Metrics Review**: Track quality improvements over time
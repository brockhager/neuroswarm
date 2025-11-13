# Voting in NeuroSwarm Governance

> **✅ STATUS: COMPLETE AND LIVE** - This document is the authoritative source for NeuroSwarm voting mechanics and is actively used by the governance system.

## Purpose

Voting is the cornerstone of NeuroSwarm's decentralized governance model, ensuring that all major decisions reflect the collective wisdom and priorities of our contributor community. By implementing a transparent, badge-weighted voting system, we empower contributors to shape the project's direction while maintaining accountability and preventing any single entity from dominating decision-making.

The voting system serves three critical functions:
- **Transparency**: All proposals and votes are publicly auditable, building trust through visibility
- **Fairness**: Badge-based weighting ensures experienced, committed contributors have appropriate influence
- **Community Empowerment**: Every eligible contributor can participate in shaping NeuroSwarm's future

## Voting Rights

### Badge-Weighted Voting System

NeuroSwarm uses a tiered badge system that translates contributor recognition into voting power. This approach rewards sustained participation and expertise while remaining accessible to new contributors.

**Badge Tiers & Voting Power:**
- **Bronze Badge** (1 vote): Entry-level recognition for first contributions
- **Silver Badge** (3 votes): Consistent participation across multiple areas
- **Gold Badge** (5 votes): Leadership in working groups or significant technical contributions
- **Diamond Badge** (10 votes): Exceptional contributions, committee membership, or sustained leadership

### Eligibility Requirements

To participate in voting, contributors must:
- Hold at least a Bronze badge ([see contributor-recognition.md](../contributor-recognition.md))
- Be actively contributing within the last 90 days
- Complete identity verification through the contributor registry
- Agree to the Code of Conduct

### Badge Maintenance

Badges require ongoing participation to maintain voting rights:
- **Activity Threshold**: Minimum 2 contributions per quarter
- **Review Period**: Badges reviewed quarterly by the Community Council
- **Appeal Process**: Contributors can appeal badge decisions through the governance charter

## Voting Types

NeuroSwarm categorizes votes by scope and urgency to ensure appropriate decision-making processes:

### Technical Votes
**Scope**: Protocol upgrades, validator rules, security parameters
**Process**: Requires 75% supermajority approval
**Timeline**: 14-day discussion, 7-day voting period
**Example**: Upgrading the Solana program version or changing consensus parameters

### Strategic Votes
**Scope**: Roadmap priorities, funding allocations, major feature decisions
**Process**: Requires 60% majority approval
**Timeline**: 21-day discussion, 14-day voting period
**Example**: Q4 2026 feature prioritization or ecosystem fund distribution

### Operational Votes
**Scope**: Working group decisions, process improvements, documentation updates
**Process**: Requires simple majority (50% + 1)
**Timeline**: 7-day discussion, 3-day voting period
**Example**: Updating contributor playbooks or modifying kanban workflows

### Emergency Votes
**Scope**: Critical security issues, immediate protocol fixes, urgent funding needs
**Process**: Requires 60% majority with expedited timeline
**Timeline**: 24-hour discussion, 12-hour voting period
**Example**: Emergency protocol pause or critical security patch deployment

## Voting Process

### Proposal Submission

Any contributor with a Silver badge or higher can submit proposals. Requirements include:
- **Documentation**: Complete proposal template with problem statement, solution, and impact analysis
- **Supporting Data**: Technical specifications, cost estimates, and implementation timeline
- **Stake**: Proposer must hold 100 NS tokens as commitment (returned if proposal passes)
- **Review**: Initial screening by Technical Committee within 48 hours

### Discussion Period

Following submission approval:
- **Minimum Duration**: Varies by vote type (7-21 days)
- **Channels**: GitHub Discussions, Discord governance channel, weekly community calls
- **Facilitation**: Assigned discussion moderator ensures constructive dialogue
- **Amendments**: Proposers can modify proposals based on community feedback

### Voting Period

Once discussion concludes:
- **Duration**: 3-14 days depending on vote type
- **Quorum Requirements**:
  - Technical/Strategic: 25% of eligible voters
  - Operational: 15% of eligible voters
  - Emergency: 10% of eligible voters
- **Early Closure**: Votes can close early if quorum is reached and outcome is clear

### Decision Thresholds

| Vote Type | Approval Threshold | Quorum Required |
|-----------|-------------------|-----------------|
| Technical | 75% | 25% |
| Strategic | 60% | 25% |
| Operational | 50% + 1 | 15% |
| Emergency | 60% | 10% |

### Escalation Paths

If quorum is not met:
1. **Extension**: Voting period extended by 50%
2. **Community Council Review**: Council can lower quorum threshold
3. **Technical Committee Override**: For technical votes only, with 80% committee approval

## Transparency & Auditability

### Public Decision Logs

All voting activity is publicly accessible:
- **Proposal Archive**: Complete history with original text and amendments
- **Vote Records**: Individual votes (anonymized) with timestamps
- **Outcome Documentation**: Final decision with rationale and implementation plan

### Audit Trail Requirements

Every voting event maintains:
- **Version Control**: All proposal changes tracked in Git
- **Timestamp Verification**: Blockchain-anchored timestamps for critical votes
- **Hash Integrity**: Cryptographic hashes ensure document integrity

### Accessibility

- **Public Dashboard**: Real-time voting status and results
- **API Access**: Programmatic access for analysis tools
- **Archive Policy**: All records retained indefinitely

## Conflict Resolution

### Disputed Votes

For allegations of voting irregularities:
1. **Initial Review**: Technical Committee investigates within 24 hours
2. **Evidence Submission**: 48-hour window for additional evidence
3. **Binding Decision**: Committee rules within 7 days

### Escalation to Community Council

Contributors can escalate disputes to the Community Council if:
- Technical Committee decision is contested
- Systemic issues are identified
- Badge or eligibility disputes arise

### Binding Arbitration

Final arbitration follows these principles:
- **Precedent-Based**: Decisions reference previous rulings
- **Documented Rationale**: All rulings include detailed reasoning
- **Appeal Rights**: Council decisions are final but can be appealed to full community vote

## Tools & Implementation

### Voting Platform Integration

NeuroSwarm provides multiple interfaces for participation:
- **Web Dashboard**: Full-featured interface in the contributor portal
- **CLI Tools**: Command-line voting for technical contributors
- **Mobile App**: Basic voting and notification capabilities

### Identity Verification

Robust verification ensures voting integrity:
- **Badge Validation**: Real-time verification against contributor registry
- **Multi-Factor Authentication**: Required for high-value votes
- **Sybil Protection**: Badge-based weighting prevents manipulation

### Observability

Comprehensive metrics track system health:
- **Participation Analytics**: Voter turnout by badge tier and region
- **Decision Velocity**: Average time from proposal to decision
- **Satisfaction Tracking**: Post-vote surveys measure community sentiment

## Success Metrics

### Participation Rate Targets

- **Overall Target**: 40% of eligible contributors vote quarterly
- **Tier Distribution**: Balanced participation across Bronze (30%), Silver (40%), Gold (20%), Diamond (10%)
- **Growth Goal**: 15% year-over-year increase in participation

### Decision Velocity Benchmarks

- **Technical Votes**: Average 21 days from proposal to implementation
- **Strategic Votes**: Average 35 days from proposal to implementation
- **Operational Votes**: Average 10 days from proposal to implementation

### Satisfaction Scores

- **Post-Vote Surveys**: Target 4.0/5.0 average satisfaction
- **Process Improvement**: Annual review identifies friction points
- **Retention Impact**: Track correlation between voting satisfaction and contributor retention

---

*For more information on governance processes, see: [Governance Charter](governance-charter.md), [Contributor Recognition](contributor-recognition.md), [Kanban Workflow](kanban.md)*
*For the complete documentation structure, see: [Master Documentation Outline](../master-documentation-outline.md)*
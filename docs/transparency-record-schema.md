# Transparency Record Schema

> **Status: Active** - This schema defines the structure for all governance transparency records in NeuroSwarm. It ensures consistent, auditable logging of all governance activities.

## Overview

The NeuroSwarm transparency system maintains immutable, structured records of all governance activities. This schema ensures that every proposal, vote, and decision can be independently verified and audited.

**Access Points:**
- **Live Dashboard**: [getblockchain.tech/neuroswarm/governance/transparency](https://getblockchain.tech/neuroswarm/governance/transparency)
- **API Endpoint**: `GET /api/transparency/events`
- **Export Format**: JSON schema for external analysis

## Core Data Structures

### GovernanceEvent

The fundamental unit of transparency logging. Every governance action generates an event.

```typescript
interface GovernanceEvent {
  id: string                    // Unique event identifier (e.g., "gov_1640995200000_abc123def")
  timestamp: Date              // ISO 8601 timestamp of event
  eventType: EventType         // Type of governance action
  actor: string               // Public key or identifier of actor
  details: Record<string, any> // Event-specific data
  metadata: EventMetadata      // Blockchain and system metadata
}
```

#### Event Types

| EventType | Description | Frequency | Impact |
|-----------|-------------|-----------|--------|
| `proposal_created` | New proposal submitted | Medium | High |
| `proposal_updated` | Proposal status change | High | Medium |
| `vote_cast` | Individual vote recorded | High | Low |
| `proposal_closed` | Voting period ended | Medium | High |
| `rewards_claimed` | Incentive rewards claimed | Medium | Low |
| `badge_upgraded` | Contributor badge level changed | Low | Medium |

#### Event Metadata

```typescript
interface EventMetadata {
  blockNumber?: number      // Solana block number
  transactionHash?: string  // Solana transaction signature
  ipfsHash?: string        // IPFS content hash for large data
  category: string         // "proposal", "vote", "governance"
  impact: "low" | "medium" | "high" | "critical"
}
```

### ProposalRecord

Complete lifecycle record of a governance proposal.

```typescript
interface ProposalRecord {
  proposalId: string              // Unique proposal identifier
  title: string                   // Human-readable title
  category: ProposalCategory      // Technical, Strategic, Operational, Emergency
  status: ProposalStatus          // Current lifecycle stage
  createdAt: Date                // Creation timestamp
  author: string                 // Proposer identifier

  discussionPeriod: {
    start: Date                  // Discussion start
    end: Date                    // Discussion end
    participants: number         // Unique participants
    comments: number            // Total comments/discussion items
  }

  votingPeriod: {
    start: Date                  // Voting start
    end: Date                    // Voting end
    totalVotes: number           // Total vote transactions
    yesVotes: number             // Yes vote count
    noVotes: number              // No vote count
    abstainVotes: number         // Abstain vote count
    quorumReached: boolean       // Whether quorum was met
  }

  outcome: {
    result: "passed" | "failed" | "cancelled"
    executionDate?: Date         // When outcome was determined
    executionStatus?: "pending" | "executed" | "failed"
  }

  metrics: {
    participationRate: number    // Percentage of eligible voters (0-100)
    voterDiversity: number       // Badge diversity score (0-100)
    decisionTime: number         // Days from creation to decision
  }
}
```

### VoteRecord

Individual vote transaction record with incentives.

```typescript
interface VoteRecord {
  voteId: string                // Unique vote identifier
  proposalId: string            // Associated proposal
  voterId: string              // Voter identifier
  badgeTier: BadgeTier         // Bronze, Silver, Gold, Diamond
  votingPower: number           // Vote weight (1, 3, 5, 10)
  choice: "yes" | "no" | "abstain"
  timestamp: Date              // Vote timestamp

  incentives: {
    baseReward: number          // Base NS token reward
    earlyBonus: number          // Early voting multiplier
    streakBonus: number         // Consecutive voting bonus
    totalReward: number         // Total tokens earned
  }

  metadata: {
    transactionHash: string     // Solana transaction signature
    gasUsed: number            // Computational cost
    confirmationTime: number    // Block confirmation time (ms)
  }
}
```

## Transparency Reports

### Period Reports

Generated for regular intervals (daily, weekly, monthly) to provide aggregated insights.

```typescript
interface TransparencyReport {
  period: {
    start: Date
    end: Date
  }

  summary: {
    totalProposals: number
    totalVotes: number
    totalParticipants: number
    averageParticipation: number    // Average votes per participant
    proposalPassRate: number       // Percentage of proposals that pass
  }

  proposals: ProposalRecord[]      // All proposals in period

  topVoters: Array<{
    voterId: string
    totalVotes: number
    totalVotingPower: number
    badgesEarned: string[]
  }>

  categoryBreakdown: Array<{
    category: string
    proposals: number
    passRate: number
    avgParticipation: number
  }>

  incentives: {
    totalDistributed: number       // Total NS tokens distributed
    avgRewardPerVote: number      // Average reward per vote
    earlyVoterParticipation: number // Percentage of early voters
    badgeUpgradeCount: number     // Number of badge upgrades
  }
}
```

## Data Integrity & Verification

### Cryptographic Integrity

- **Event Hashing**: Each event includes SHA-256 hash of content
- **Merkle Trees**: Events grouped into Merkle trees for batch verification
- **Blockchain Anchoring**: Critical events anchored to Solana blockchain

### Verification Methods

```typescript
// Verify event integrity
function verifyEvent(event: GovernanceEvent): boolean {
  const expectedHash = hash(event.details);
  return event.metadata.ipfsHash === expectedHash;
}

// Verify proposal outcome
function verifyProposalOutcome(proposal: ProposalRecord): boolean {
  const votes = getVotesForProposal(proposal.proposalId);
  const calculatedOutcome = calculateOutcome(votes, proposal.category);
  return calculatedOutcome === proposal.outcome.result;
}
```

## API Access

### REST Endpoints

```
GET  /api/transparency/events          # Recent events
GET  /api/transparency/events/:id      # Specific event
GET  /api/transparency/proposals       # All proposals
GET  /api/transparency/proposals/:id   # Specific proposal
GET  /api/transparency/votes/:proposal # Votes for proposal
GET  /api/transparency/reports         # Available reports
GET  /api/transparency/reports/:period # Period report
POST /api/transparency/export          # Export data (authenticated)
```

### Query Parameters

```typescript
interface TransparencyQuery {
  startDate?: Date        // Filter by date range
  endDate?: Date
  eventType?: EventType[] // Filter by event types
  category?: string[]     // Filter by categories
  actor?: string[]        // Filter by actors
  limit?: number          // Pagination limit
  offset?: number         // Pagination offset
}
```

## Export Formats

### JSON Export

```json
{
  "version": "1.0",
  "exportedAt": "2025-11-12T10:30:00Z",
  "data": {
    "events": [...],
    "proposals": [...],
    "votes": [...],
    "reports": [...]
  },
  "integrity": {
    "merkleRoot": "abc123...",
    "signature": "def456..."
  }
}
```

### CSV Export

Available for bulk analysis:
- `events.csv`: All governance events
- `proposals.csv`: Proposal lifecycle data
- `votes.csv`: Individual vote records
- `reports.csv`: Aggregated statistics

## Privacy & Anonymity

### Data Minimization

- **No Personal Data**: Only public keys and pseudonymous identifiers
- **Aggregated Reporting**: Individual votes anonymized in public reports
- **Optional Disclosure**: Contributors can choose disclosure level

### Access Controls

- **Public Access**: Summary statistics and outcomes
- **Authenticated Access**: Detailed individual records
- **Admin Access**: Full audit trails for compliance

## Implementation Details

### Storage Architecture

```
📁 transparency/
├── events/           # Individual event logs
│   ├── 2025/
│   │   ├── 11/
│   │   │   ├── 12.json
│   │   │   └── 13.json
├── proposals/        # Proposal records
├── votes/           # Vote records
├── reports/         # Generated reports
└── integrity/       # Cryptographic proofs
```

### Performance Optimizations

- **Indexing**: Events indexed by timestamp, actor, and type
- **Caching**: Frequently accessed data cached in Redis
- **Compression**: Large datasets compressed with LZ4
- **Partitioning**: Data partitioned by time for efficient queries

## Compliance & Auditing

### Regulatory Compliance

- **Data Retention**: 7 years minimum for financial/governance records
- **Audit Trails**: Complete chain of custody for all changes
- **Export Capability**: Data exportable for regulatory review

### Third-Party Audits

- **Quarterly Audits**: Independent security firm reviews
- **Open Source**: Transparency system code publicly auditable
- **Bug Bounty**: Rewards for finding integrity issues

## Future Extensions

### Planned Enhancements

- **ZK-Proofs**: Zero-knowledge proofs for vote privacy
- **DID Integration**: Decentralized identity verification
- **Cross-Chain**: Multi-blockchain transparency anchoring
- **AI Analysis**: Automated anomaly detection in governance data

---

*For implementation details, see: [Transparency Logger](../neuro-web/lib/transparency-logger.ts)*
*For API documentation, see: [Services API](../../neuro-services/docs/api.md)*
*For live transparency data, visit: [getblockchain.tech/neuroswarm/governance/transparency](https://getblockchain.tech/neuroswarm/governance/transparency)*</content>
<parameter name="filePath">c:\JS\ns\neuroswarm\docs\transparency-record-schema.md
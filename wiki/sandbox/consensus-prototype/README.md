# Consensus Mechanism Prototype

A prototype implementation of NeuroSwarm's decentralized consensus mechanism for AI agent validation and governance.

## Overview

This prototype demonstrates a stake-weighted consensus system where participants can propose changes, vote on decisions, and execute approved proposals. The system includes:

- **Stake-weighted voting** with configurable quorum and threshold requirements
- **Proposal lifecycle management** (creation → voting → finalization → execution)
- **Event-driven architecture** for extensibility
- **Comprehensive testing** with 100% pass rate

## Features

### Core Functionality
- ✅ Participant registration with stake and reputation tracking
- ✅ Proposal creation with configurable voting periods
- ✅ Stake-weighted voting (yes/no/abstain)
- ✅ Automatic consensus calculation based on quorum and threshold
- ✅ Proposal execution for passed decisions
- ✅ Event emission for monitoring and integration

### Consensus Rules
- **Quorum**: Minimum participation percentage required (default: 10%)
- **Threshold**: Minimum approval percentage of voted stake (default: 50%)
- **Stake Weighting**: Votes weighted by participant stake
- **Finalization**: Automatic calculation when voting period ends

### Security Features
- ✅ Vote validation and duplicate prevention
- ✅ Participant authentication and authorization
- ✅ Proposal state management and lifecycle enforcement
- ✅ Comprehensive error handling and validation

## Usage

### Basic Setup
```typescript
import { ConsensusEngine } from './consensus-engine';

// Create engine with 10% quorum and 50% threshold
const engine = new ConsensusEngine(0.1, 0.5);

// Register participants
engine.registerParticipant({
  id: 'alice',
  stake: 1000,
  reputation: 0.95,
  isActive: true
});

// Create a proposal
const proposalId = engine.createProposal(
  'Implement Feature X',
  'Detailed description of the proposed change',
  'alice',
  24 * 60 * 60 * 1000 // 24 hours
);

// Cast votes
engine.castVote(proposalId, 'alice', 'yes');
engine.castVote(proposalId, 'bob', 'no');

// Finalize and check result
const result = engine.finalizeProposal(proposalId);
if (result.passed) {
  engine.executeProposal(proposalId);
}
```

### Event Handling
```typescript
engine.on('proposalCreated', (proposal) => {
  console.log(`New proposal: ${proposal.title}`);
});

engine.on('voteCast', (vote) => {
  console.log(`${vote.voterId} voted ${vote.choice}`);
});

engine.on('proposalFinalized', ({ proposal, result }) => {
  console.log(`Proposal ${proposal.title}: ${result.passed ? 'PASSED' : 'FAILED'}`);
});
```

## Demo

Run the interactive demo:
```bash
npm install
npm run build
npm start
```

The demo simulates a complete consensus process with 5 participants voting on quadratic funding implementation.

## Testing

Run the comprehensive test suite:
```bash
npm test
```

**Test Coverage:**
- ✅ Participant registration and management
- ✅ Proposal creation and validation
- ✅ Voting mechanics and validation
- ✅ Consensus calculation algorithms
- ✅ Proposal execution and state management
- **Result**: 11/11 tests passing

## Architecture

### Key Components

#### ConsensusEngine
Main orchestration class handling all consensus operations.

#### Data Structures
- `ConsensusParticipant`: Registered voting participants
- `Proposal`: Governance proposals with metadata
- `Vote`: Individual votes with stake weighting
- `ConsensusResult`: Final voting outcomes

#### Event System
- `participantRegistered`: New participant added
- `proposalCreated`: Proposal submitted for voting
- `voteCast`: Vote recorded
- `proposalFinalized`: Voting period ended, result calculated
- `proposalExecuted`: Passed proposal implemented

### Consensus Algorithm

1. **Participation Check**: Verify minimum quorum met
2. **Approval Calculation**: Calculate approval rate of voted stake
3. **Threshold Comparison**: Compare against required threshold
4. **Result Determination**: Pass/fail based on both criteria

## Future Enhancements

### Phase 2 Features
- [ ] Quadratic voting implementation
- [ ] Delegated voting mechanisms
- [ ] Time-weighted voting periods
- [ ] Appeal and dispute resolution
- [ ] Multi-proposal batch processing

### Integration Points
- [ ] Blockchain integration for immutable records
- [ ] AI agent validation workflows
- [ ] Governance dashboard integration
- [ ] Cross-platform communication protocols

## Development

### Prerequisites
- Node.js 18+
- TypeScript 5.0+
- Jest for testing

### Setup
```bash
npm install
npm run build
npm test
```

### Project Structure
```
src/
├── consensus-engine.ts      # Main consensus implementation
├── consensus-engine.test.ts # Comprehensive test suite
└── index.ts                 # Demo application
```

## License

MIT - See NeuroSwarm project license for details.

## Related Documentation

- [Swarm Algorithms](../docs/swarm-algorithms.md) - Core AI coordination algorithms
- [Tokenomics](../docs/tokenomics.md) - Economic incentive mechanisms
- [Governance Dashboard](../docs/governance-dashboard.md) - System monitoring and transparency
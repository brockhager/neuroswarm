# Governance Model

**Decentralized decision-making** through blockchain-anchored voting.

This guide explains how NeuroSwarm's governance system enables democratic, transparent, and verifiable community decision-making.

---

## 🗳️ Overview

NeuroSwarm governance operates on three principles:

1. **Transparency**: All votes recorded on-chain
2. **Decentralization**: No single point of control
3. **Auditability**: Cryptographic proof of every decision

### Governance Layers

```
┌─────────────────────────────────────────────┐
│  Layer 1: Proposal Submission              │
│  (Any community member can propose)        │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Layer 2: Validator Voting                 │
│  (Stake-weighted voting by validators)     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Layer 3: Consensus & Execution            │
│  (Automatic execution if quorum reached)   │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Layer 4: Blockchain Anchoring             │
│  (Solana on-chain proof, immutable record) │
└─────────────────────────────────────────────┘
```

---

## 📝 Proposal Types

### 1. **Protocol Upgrades**
**Example**: Change consensus algorithm, update block time

**Voting Period**: 7 days  
**Quorum**: 66% of active validator stake  
**Execution**: Automatic on-chain after approval

### 2. **Parameter Changes**
**Example**: Adjust gas fees, modify cache timeout

**Voting Period**: 3 days  
**Quorum**: 51% of active validator stake  
**Execution**: Immediate

### 3. **Validator Management**
**Example**: Add/remove validators, slash malicious actors

**Voting Period**: 5 days  
**Quorum**: 75% of active validator stake (supermajority)  
**Execution**: Manual review + automatic enforcement

### 4. **Governance Process Changes**
**Example**: Modify voting periods, change quorum thresholds

**Voting Period**: 14 days  
**Quorum**: 80% of active validator stake  
**Execution**: Requires founder approval + on-chain governance update

---

## 🎯 How to Participate

### Submitting a Proposal

**Prerequisites**:
- Validator status OR community member with sponsor

**Steps**:

1. **Draft proposal** (use template):
   ```markdown
   # Proposal: [Title]
   
   ## Summary
   One-sentence description
   
   ## Motivation
   Why is this needed?
   
   ## Specification
   Technical details of the change
   
   ## Impact Analysis
   - Benefits
   - Risks
   - Breaking changes
   
   ## Implementation Plan
   Step-by-step rollout
   ```

2. **Submit via governance API**:
   ```bash
   curl -X POST http://localhost:3000/api/governance/proposals \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <your-token>" \
     -d @proposal.json
   ```

3. **Community discussion** (Discord, GitHub Discussions)

4. **Validator voting period begins** (auto-triggered after submission)

### Voting as a Validator

**Voting power** = Your staked amount / Total staked  
**Vote options**: For, Against, Abstain

**Cast vote**:
```bash
curl -X POST http://localhost:3000/api/governance/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <validator-token>" \
  -d '{
    "proposalId": "prop-123",
    "vote": "for",
    "reason": "This improves network performance"
  }'
```

**Vote is signed** with your validator key and recorded on-chain.

### Viewing Active Proposals

**Dashboard**: http://localhost:3000/governance  
**API**: `GET /api/governance/proposals?status=active`

**Response**:
```json
{
  "proposals": [
    {
      "id": "prop-123",
      "title": "Reduce block time to 1.5s",
      "type": "parameter_change",
      "status": "active",
      "votes": {
        "for": 12500000,
        "against": 3200000,
        "abstain": 500000
      },
      "quorum": 0.51,
      "currentTurnout": 0.67,
      "votingEnds": "2025-12-05T00:00:00Z",
      "anchored": false
    }
  ]
}
```

---

## ⛓️ Blockchain Anchoring

### Why Anchor to Solana?

1. **Immutability**: Once anchored, votes cannot be changed
2. **Transparency**: Anyone can verify governance history
3. **Auditability**: Cryptographic proof of every decision
4. **Decentralization**: No single entity controls the record

### Anchoring Process

**Triggered when**:
- Proposal reaches quorum
- Voting period ends
- Result is finalized

**What gets anchored**:
```json
{
  "proposalId": "prop-123",
  "title": "Reduce block time",
  "votesFor": 12500000,
  "votesAgainst": 3200000,
  "outcome": "passed",
  "executedAt": "2025-12-05T12:00:00Z",
  "blockNumber": 42,
  "validatorSignatures": ["0x...", "0x..."]
}
```

**Verification**:
```bash
# Check Solana transaction
solana transaction <signature> --url devnet

# Verify in NeuroSwarm
curl http://localhost:3000/api/governance/verify/<proposalId>
```

---

## 🛡️ Validator Responsibilities

### Expected Behavior

✅ **Review proposals thoroughly** before voting  
✅ **Participate in discussions** (Discord, GitHub)  
✅ **Vote on every proposal** (or abstain with reason)  
✅ **Run reliable infrastructure** (99%+ uptime)  
✅ **Act in network's best interest** (not just self-interest)

### Slashing Conditions

**You can be slashed for**:

| Offense | Penalty | Governance Action |
|---------|---------|-------------------|
| **Double-signing** blocks | 100% stake | Automatic |
| **Downtime** (>7 days) | 10% stake | Automatic |
| **Malicious voting** (proven) | 50% stake | Supermajority vote |
| **Spam proposals** | Warning → 5% stake | Manual review |

### Reputation System

**Validators earn reputation for**:
- Consistent uptime
- Thoughtful proposal contributions
- High voting participation rate
- Community engagement

**Benefits of high reputation**:
- Increased voting weight (planned feature)
- Priority for block production
- Governance privileges

---

## 📊 Governance Metrics

### Key Performance Indicators

**Tracked metrics**:
- **Voter turnout**: % of stake that votes
- **Proposal success rate**: % of proposals that pass
- **Average voting period**: Time from submission to decision
- **Governance participation**: % of validators actively voting

**View metrics**:
```bash
curl http://localhost:3000/api/governance/metrics
```

**Response**:
```json
{
  "totalProposals": 42,
  "activeProposals": 3,
  "passedProposals": 28,
  "rejectedProposals": 11,
  "averageTurnout": 0.73,
  "activeValidators": 15,
  "totalStake": 25000000
}
```

---

## 🔍 Audit Trail

### Governance Timeline

**Every action logged** in `governance/wp_publish_log.jsonl`:

```jsonl
{"timestamp":"2025-11-28T12:00:00Z","action":"proposal_created","proposalId":"prop-123","creator":"validator1","signature":"0x..."}
{"timestamp":"2025-11-28T14:30:00Z","action":"vote_cast","proposalId":"prop-123","voter":"validator2","vote":"for","signature":"0x..."}
{"timestamp":"2025-12-05T00:00:00Z","action":"proposal_finalized","proposalId":"prop-123","outcome":"passed","signature":"0x..."}
{"timestamp":"2025-12-05T00:10:00Z","action":"anchored_to_solana","proposalId":"prop-123","txSignature":"5xHx..."}
```

**Verify timeline integrity**:
```bash
node governance/scripts/verify-governance.ts <tx-signature> <action-type>
```

---

## 🚀 Advanced Features

### Delegation (Planned)

**Allow token holders** to delegate voting power to trusted validators.

**Benefits**:
- Increase participation from non-technical holders
- Reward active, knowledgeable validators
- Improve governance efficiency

### Time-Locked Proposals

**For critical changes**, require proposals to wait 48 hours after passing before execution.

**Gives community time** to:
- Review final decision
- Raise last-minute concerns
- Prepare for implementation

### Emergency Governance

**For urgent security fixes**, founder can bypass normal voting with:
- Immediate proposal + execution
- Recorded on-chain with justification
- Community retroactive approval within 7 days

---

## 🎓 Best Practices

### For Proposal Submitters

1. **Research thoroughly** — Check if similar proposals exist
2. **Engage early** — Discuss in Discord before formal submission
3. **Provide data** — Include performance metrics, cost analysis
4. **Anticipate objections** — Address concerns proactively
5. **Be specific** — Vague proposals are hard to vote on

### For Validators

1. **Read the full proposal** — Don't vote based on title alone
2. **Participate in discussions** — Ask questions, share concerns
3. **Vote with reason** — Explain your decision (recorded on-chain)
4. **Consider long-term impact** — Not just immediate effects
5. **Update software** — Ensure node is compatible with passed proposals

---

## 📚 Related Documentation

- **[Governance Scripts](../../Governance/README.md)** — Anchoring and verification tools
- **[Validator Setup](../../Nodes/adding-validator.md)** — Become a validator
- **[Blockchain Anchoring](../../wiki/Anchoring/readme.md)** — Technical details
- **[Security Model](./Architecture.md#security-model)** — Cryptographic guarantees

---

## ❓ FAQ

### Q: Can I vote if I'm not a validator?

**A**: Currently, only validators can vote (stake-weighted). In the future, token holders will be able to delegate voting power.

### Q: What happens if quorum isn't reached?

**A**: Proposal expires after voting period ends. Can be re-submitted with modifications.

### Q: Can I change my vote?

**A**: Yes, until the voting period ends. Most recent vote counts.

### Q: Who enforces governance decisions?

**A**: Smart contracts on Solana automatically enforce passed proposals. No single entity controls execution.

### Q: What if a malicious proposal passes?

**A**: Founder has emergency veto power for first 6 months. After that, community can submit counter-proposal to reverse.

---

**Get involved!** Check active proposals: http://localhost:3000/governance

**Questions?** Ask in [Discord #governance](../../../README.md#community)

**Last Updated**: 2025-11-28  
**Maintainers**: NeuroSwarm Governance Council

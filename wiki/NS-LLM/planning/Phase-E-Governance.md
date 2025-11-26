# Phase E: Governance & Transparency

## Objectives
- Community control over model selection
- Transparent decision-making process
- Version control for models
- Contributor visibility into AI performance

## Governance Hooks

### Model Selection Proposals
```javascript
// Proposal structure
{
  type: "model-adoption",
  model: "phi-2-2.7b",
  reason: "Better reasoning, worth the extra size",
  size_mb: 1600,
  benchmark_results: { ... },
  proposed_by: "contributor_address",
  voting_period_days: 7
}
```

### Parameter Tuning Votes
```javascript
// Vote on runtime parameters
{
  type: "parameter-change",
  parameter: "max_tokens_per_request",
  current_value: 256,
  proposed_value: 512,
  reason: "Enable longer responses",
  proposed_by: "contributor_address"
}
```

## Model Manifests in IPFS

### Manifest Format
```json
{
  "model_name": "tinyllama-1.1b-chat-v1.0",
  "version": "v1.0.0",
  "format": "gguf",
  "quantization": "Q4_K_M",
  "size_bytes": 668346368,
  "sha256": "abc123...",
  "ipfs_cid": "bafybei...",
  "license": "Apache-2.0",
  "approved_by_governance": true,
  "adoption_date": "2025-11-25",
  "metrics": {
    "avg_tokens_per_sec": 18.5,
    "memory_usage_mb": 1200,
    "quality_score": 7.2
  }
}
```

## Dashboard Transparency

### Metrics Exposed
- Model version and size
- Inference latency (p50, p95, p99)
- Memory usage
- Success/failure rates
- Cache hit rates
- Cost per query (in compute resources)

## Success Criteria

### Phase E Complete When:
- [ ] Governance proposals for models implemented
- [ ] Model manifests stored in IPFS with hashes
- [ ] Dashboard shows model version and metrics
- [ ] Contributors can propose and vote on changes
- [ ] Audit trail for all model adoptions
- [ ] Transparent performance metrics visible

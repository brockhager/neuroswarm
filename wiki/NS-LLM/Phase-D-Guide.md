# Phase D: Scaling & Governance - Complete Guide

## Overview

Phase D introduces production-ready features for scaling NS-LLM to larger models and ensuring quality through governance rules. This phase includes:

1. **Hybrid Scoring (RAG)** - Retrieval-Augmented Generation
2. **Governance Rules** - Quality gates for generated content
3. **Performance Scaling** - Support for larger models
4. **Model Registry** - Runtime model management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        NS Node                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Endpoints                                          │ │
│  │  • /api/hybrid/query (RAG)                             │ │
│  │  • /api/generate (with governance)                     │ │
│  │  • /api/models (model management)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Services                                               │ │
│  │  • HybridQueryService (RAG pipeline)                   │ │
│  │  • GenerativeGovernanceService (validation)            │ │
│  │  • ModelRegistry (model management)                    │ │
│  │  • VectorIndex (semantic search)                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      NS-LLM Backend                          │
│  • ONNX Runtime                                             │
│  • Multiple Models (GPT-2, TinyLlama, Llama-2-7B)          │
│  • Quantization (int8)                                      │
└─────────────────────────────────────────────────────────────┘
```

## 1. Hybrid Scoring (RAG)

### What is RAG?

Retrieval-Augmented Generation combines:
- **Vector Search**: Find relevant documents using embeddings
- **Context Injection**: Add retrieved documents to the prompt
- **Generation**: Generate response with context
- **Scoring**: Measure quality (coherence + relevance)

### RAG Pipeline

```
User Query
    ↓
1. Embed Query (NS-LLM)
    ↓
2. Search Vector Index (Cosine Similarity)
    ↓
3. Retrieve Top-K Documents
    ↓
4. Build Context String
    ↓
5. Generate Response (with context)
    ↓
6. Score Response
    ↓
Return { text, score, sources, metrics }
```

### API Usage

**Add Documents:**
```bash
curl -X POST http://localhost:3009/api/hybrid/add-document \
  -H "Content-Type: application/json" \
  -d '{
    "id": "doc1",
    "text": "NeuroSwarm is a decentralized AI network.",
    "metadata": {"category": "overview"}
  }'
```

**Query (RAG):**
```bash
curl -X POST http://localhost:3009/api/hybrid/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is NeuroSwarm?",
    "topK": 3,
    "maxTokens": 50
  }'
```

**Response:**
```json
{
  "text": "NeuroSwarm is a decentralized AI network that uses blockchain...",
  "score": {
    "combined": 0.85,
    "coherence": 0.82,
    "relevance": 0.89
  },
  "sources": [
    {
      "id": "doc1",
      "text": "NeuroSwarm is a decentralized...",
      "score": 0.95
    }
  ],
  "metrics": {
    "embeddingTime": 45,
    "retrievalTime": 12,
    "generationTime": 234,
    "scoringTime": 38,
    "totalTime": 329
  }
}
```

### Scoring Metrics

- **Coherence Score**: Cosine similarity between query and response embeddings (0-1)
- **Relevance Score**: Average similarity of retrieved documents (0-1)
- **Combined Score**: Weighted average (60% coherence, 40% relevance)

### Code Example

```javascript
const HybridQueryService = require('./ns-node/src/services/hybrid-query');
const nsLlmClient = require('./shared/ns-llm-client');

const hybridService = new HybridQueryService(nsLlmClient);

// Add documents
await hybridService.addDocument('doc1', 'Document text...', { category: 'tech' });

// Query
const result = await hybridService.query('What is...', {
  topK: 3,
  maxTokens: 100
});

console.log('Response:', result.text);
console.log('Score:', result.score.combined);
console.log('Sources:', result.sources.length);
```

## 2. Governance Rules

### Purpose

Ensure generated content meets quality standards:
- Length constraints
- Toxicity filtering
- Coherence validation
- Audit logging

### Validation Rules

| Rule | Default | Description |
|------|---------|-------------|
| `minTokens` | 5 | Minimum response length |
| `maxTokens` | 500 | Maximum response length |
| `minCoherence` | 0.3 | Minimum coherence score |
| `toxicityEnabled` | true | Enable toxicity detection |
| `strictMode` | false | Reject vs. warn on violations |

### API Usage

**Generate with Governance:**
```bash
curl -X POST http://localhost:3009/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Write a story about...",
    "maxTokens": 100
  }'
```

**Response (Pass):**
```json
{
  "text": "Once upon a time...",
  "tokens_generated": 45,
  "governance": {
    "status": "pass",
    "score": 0.92,
    "violations": [],
    "tokenCount": 58
  }
}
```

**Response (Warn):**
```json
{
  "text": "Short.",
  "tokens_generated": 2,
  "governance": {
    "status": "warn",
    "score": 0.45,
    "violations": [
      {
        "type": "length",
        "severity": "warn",
        "message": "Text too short: 3 tokens (min: 5)"
      }
    ],
    "tokenCount": 3
  }
}
```

**Response (Reject):**
```json
{
  "error": "governance-rejected",
  "text": "Toxic content...",
  "governance": {
    "status": "reject",
    "score": 0.0,
    "violations": [
      {
        "type": "toxicity",
        "severity": "reject",
        "message": "Potentially toxic content detected: hate, attack"
      }
    ]
  }
}
```

### Get Governance Metrics

```bash
curl http://localhost:3009/api/metrics
```

```json
{
  "totalValidations": 150,
  "passed": 120,
  "warned": 25,
  "rejected": 5,
  "lengthViolations": 18,
  "toxicityViolations": 5,
  "coherenceViolations": 7,
  "passRate": "80.00%",
  "rejectRate": "3.33%"
}
```

### Audit Log

```bash
curl http://localhost:3009/api/audit?status=reject&limit=10
```

### Configuration

**Update Governance Config:**
```bash
curl -X PUT http://localhost:3009/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "minTokens": 10,
    "maxTokens": 300,
    "strictMode": true
  }'
```

## 3. Model Registry & Scaling

### Supported Models

| Model | Parameters | Context | Quantized | Use Case |
|-------|-----------|---------|-----------|----------|
| GPT-2 | 124M | 1024 | Yes | Baseline, testing |
| TinyLlama | 1.1B | 2048 | Yes | Production, low-resource |
| Llama-2-7B | 7B | 4096 | Yes | High-quality responses |
| Mistral-7B | REMOVED_BY_POLICY | n/a | n/a | Removed from repo

### Export Models

```bash
cd NS-LLM/model-pipeline

# List available models
python export_large_models.py --list

# Export TinyLlama
python export_large_models.py --model tinyllama --out ../models

# Export Llama-2-7B (requires HF token)
python export_large_models.py --model llama2-7b --out ../models

# Export without quantization
python export_large_models.py --model gpt2 --no-quantize
```

### Model Management API

**List Models:**
```bash
curl http://localhost:3009/api/models
```

```json
{
  "models": [
    {
      "key": "gpt2",
      "params": "124M",
      "contextLength": 1024,
      "description": "GPT-2 baseline model",
      "quantized": true,
      "current": true
    },
    {
      "key": "tinyllama",
      "params": "1.1B",
      "contextLength": 2048,
      "description": "TinyLlama 1.1B chat model",
      "quantized": true,
      "current": false
    }
  ],
  "total": 2
}
```

**Switch Model:**
```bash
curl -X POST http://localhost:3009/api/models/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "tinyllama"}'
```

**Get Current Model:**
```bash
curl http://localhost:3009/api/models/current
```

### Performance Characteristics

| Model | Memory | Latency (20 tokens) | Throughput |
|-------|--------|---------------------|------------|
| GPT-2 | ~500MB | ~200ms | ~100 tokens/s |
| TinyLlama | ~1.5GB | ~350ms | ~60 tokens/s |
| Llama-2-7B | ~4GB | ~800ms | ~25 tokens/s |

*Note: Benchmarks on CPU with int8 quantization*

## 4. Complete API Reference

### Hybrid Query Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hybrid/query` | POST | Execute RAG query |
| `/api/hybrid/add-document` | POST | Add document to index |
| `/api/hybrid/stats` | GET | Get index statistics |

### Generative Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | POST | Generate with governance |
| `/api/metrics` | GET | Get governance metrics |
| `/api/config` | GET | Get governance config |
| `/api/config` | PUT | Update governance config |
| `/api/audit` | GET | Get audit log |

### Model Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/models` | GET | List all models |
| `/api/models/current` | GET | Get current model |
| `/api/models/switch` | POST | Switch to different model |
| `/api/models/stats` | GET | Get registry statistics |

## 5. Integration Examples

### JavaScript/Node.js

```javascript
const fetch = require('node-fetch');

// RAG Query
async function ragQuery(question) {
  const response = await fetch('http://localhost:3009/api/hybrid/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: question,
      topK: 3,
      maxTokens: 100
    })
  });
  
  const result = await response.json();
  console.log('Answer:', result.text);
  console.log('Score:', result.score.combined);
  console.log('Sources:', result.sources.map(s => s.id));
}

// Generate with Governance
async function generate(prompt) {
  const response = await fetch('http://localhost:3009/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: prompt,
      maxTokens: 50
    })
  });
  
  const result = await response.json();
  
  if (result.governance.status === 'reject') {
    console.error('Rejected:', result.governance.violations);
    return null;
  }
  
  return result.text;
}
```

### Python

```python
import requests

# RAG Query
def rag_query(question):
    response = requests.post('http://localhost:3009/api/hybrid/query', json={
        'query': question,
        'topK': 3,
        'maxTokens': 100
    })
    
    result = response.json()
    print(f"Answer: {result['text']}")
    print(f"Score: {result['score']['combined']}")
    print(f"Sources: {[s['id'] for s in result['sources']]}")

# Switch Model
def switch_model(model_key):
    response = requests.post('http://localhost:3009/api/models/switch', json={
        'model': model_key
    })
    
    result = response.json()
    print(f"Switched to: {result['model']['key']}")
```

## 6. Best Practices

### RAG

1. **Index Quality**: Add high-quality, relevant documents
2. **Top-K Selection**: Use 3-5 documents for best results
3. **Context Length**: Keep context under 500 tokens
4. **Caching**: Reuse embeddings when possible

### Governance

1. **Threshold Tuning**: Adjust based on your use case
2. **Audit Review**: Regularly review rejected content
3. **Toxicity Patterns**: Customize for your domain
4. **Strict Mode**: Use in production for critical applications

### Model Selection

1. **GPT-2**: Development, testing, low-latency needs
2. **TinyLlama**: Production with resource constraints
3. **Llama-2-7B**: High-quality responses, sufficient resources
4. **Mistral-7B**: *Removed from the repository* (no longer supported)

## 7. Troubleshooting

### High Latency

- Switch to smaller model (GPT-2, TinyLlama)
- Reduce `maxTokens`
- Enable quantization
- Check system resources

### Low Quality Responses

- Switch to larger model (Llama-2-7B)
- Increase `topK` for RAG
- Add more relevant documents
- Adjust governance thresholds

### Memory Issues

- Use quantized models (int8)
- Reduce context length
- Switch to smaller model
- Monitor with `/api/models/stats`

### Governance Too Strict

- Increase thresholds (`minCoherence`, `minTokens`)
- Disable `strictMode`
- Review audit log for patterns
- Customize toxicity patterns

## 8. Performance Tuning

### Optimization Checklist

- [ ] Use quantized models (int8)
- [ ] Enable connection pooling (NS-LLM client)
- [ ] Cache embeddings for repeated queries
- [ ] Batch document indexing
- [ ] Monitor metrics regularly
- [ ] Tune governance thresholds
- [ ] Use appropriate model for use case

### Monitoring

```bash
# Check NS-LLM health
curl http://localhost:3009/health

# Get governance metrics
curl http://localhost:3009/api/metrics

# Get model stats
curl http://localhost:3009/api/models/stats

# Get hybrid query stats
curl http://localhost:3009/api/hybrid/stats
```

## 9. Next Steps

- Implement KV cache for multi-turn conversations
- Add batch inference support
- GPU acceleration (CUDA, Metal)
- Model fine-tuning pipeline
- Advanced toxicity detection (ML-based)
- Distributed model serving

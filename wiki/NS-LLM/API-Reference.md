# NS-LLM API Reference

Complete API documentation for NS-LLM endpoints.

## Base URL

```
http://localhost:3009
```

## Authentication

Currently no authentication required (development mode).

---

## Embedding Endpoints

### Generate Embedding

Generate vector embedding for text.

**Endpoint:** `POST /embed`

**Request:**
```json
{
  "text": "string (required)",
  "model": "string (optional)"
}
```

**Response:**
```json
{
  "embedding": [0.123, -0.456, ...],  // Array of floats
  "dimension": 384
}
```

**Example:**
```bash
curl -X POST http://localhost:3009/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}'
```

---

## Generation Endpoints

### Generate Text (with Governance)

Generate text with automatic governance validation.

**Endpoint:** `POST /api/generate`

**Request:**
```json
{
  "text": "string (required)",      // or "prompt"
  "maxTokens": 20,                 // optional, default: 20
  "timeout": 30000,                // optional, default: 30000ms
  "skipGovernance": false          // optional, default: false
}
```

**Response (Success):**
```json
{
  "text": "Generated text...",
  "tokens_generated": 15,
  "governance": {
    "status": "pass",              // "pass" | "warn" | "reject"
    "score": 0.92,                 // 0-1
    "violations": [],
    "tokenCount": 58
  }
}
```

**Response (Rejected):**
```json
{
  "error": "governance-rejected",
  "text": "Generated text...",
  "governance": {
    "status": "reject",
    "score": 0.0,
    "violations": [
      {
        "type": "toxicity",
        "severity": "reject",
        "message": "Potentially toxic content detected"
      }
    ]
  }
}
```

**Status Codes:**
- `200`: Success (pass or warn)
- `422`: Governance rejected
- `502`: NS-LLM unavailable
- `500`: Server error

---

## Hybrid Query (RAG) Endpoints

### Execute RAG Query

Perform retrieval-augmented generation.

**Endpoint:** `POST /api/hybrid/query`

**Request:**
```json
{
  "query": "string (required)",
  "topK": 3,                       // optional, default: 3
  "maxTokens": 100                 // optional, default: 100
}
```

**Response:**
```json
{
  "text": "Generated response...",
  "score": {
    "combined": 0.85,
    "coherence": 0.82,
    "relevance": 0.89
  },
  "sources": [
    {
      "id": "doc1",
      "text": "Retrieved text...",
      "score": 0.95,
      "metadata": {}
    }
  ],
  "metrics": {
    "embeddingTime": 45,
    "retrievalTime": 12,
    "generationTime": 234,
    "scoringTime": 38,
    "totalTime": 329
  },
  "tokensGenerated": 42
}
```

### Add Document to Index

Add document for RAG retrieval.

**Endpoint:** `POST /api/hybrid/add-document`

**Request:**
```json
{
  "id": "string (required)",
  "text": "string (required)",
  "metadata": {}                   // optional
}
```

**Response:**
```json
{
  "id": "doc1",
  "indexed": true
}
```

### Get Index Statistics

Get vector index statistics.

**Endpoint:** `GET /api/hybrid/stats`

**Response:**
```json
{
  "documentCount": 42,
  "dimension": 384,
  "memoryUsage": 172032,
  "config": {
    "topK": 3,
    "similarityThreshold": 0.5,
    "maxContextLength": 500,
    "maxGenerationTokens": 100
  }
}
```

---

## Governance Endpoints

### Get Governance Metrics

Get validation statistics.

**Endpoint:** `GET /api/metrics`

**Response:**
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

### Get Governance Configuration

Get current governance rules.

**Endpoint:** `GET /api/config`

**Response:**
```json
{
  "minTokens": 5,
  "maxTokens": 500,
  "minCoherence": 0.3,
  "toxicityEnabled": true,
  "strictMode": false
}
```

### Update Governance Configuration

Update governance rules.

**Endpoint:** `PUT /api/config`

**Request:**
```json
{
  "minTokens": 10,
  "maxTokens": 300,
  "minCoherence": 0.4,
  "strictMode": true
}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "minTokens": 10,
    "maxTokens": 300,
    "minCoherence": 0.4,
    "strictMode": true
  }
}
```

### Get Audit Log

Get governance audit log.

**Endpoint:** `GET /api/audit`

**Query Parameters:**
- `status`: Filter by status (`pass`, `warn`, `reject`)
- `since`: Unix timestamp (ms)
- `limit`: Max entries (default: 100)

**Example:**
```bash
curl "http://localhost:3009/api/audit?status=reject&limit=10"
```

**Response:**
```json
{
  "entries": [
    {
      "timestamp": 1701234567890,
      "text": "Generated text...",
      "status": "reject",
      "violations": [...],
      "score": 0.0,
      "context": {
        "query": "Original query..."
      }
    }
  ],
  "total": 5
}
```

---

## Model Management Endpoints

### List Available Models

Get all registered models.

**Endpoint:** `GET /api/models`

**Response:**
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

### Get Current Model

Get currently active model.

**Endpoint:** `GET /api/models/current`

**Response:**
```json
{
  "key": "gpt2",
  "path": "/path/to/model.onnx",
  "tokenizerPath": "/path/to/tokenizer",
  "metadata": {
    "model_key": "gpt2",
    "hf_id": "gpt2",
    "params": "124M",
    "context_length": 1024,
    "quantized": true
  },
  "loaded": true
}
```

### Switch Model

Change active model.

**Endpoint:** `POST /api/models/switch`

**Request:**
```json
{
  "model": "tinyllama"
}
```

**Response:**
```json
{
  "success": true,
  "model": {
    "key": "tinyllama",
    "path": "/path/to/model.onnx",
    "metadata": {...}
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid model key
- `404`: Model not found

### Get Model Registry Statistics

Get registry statistics.

**Endpoint:** `GET /api/models/stats`

**Response:**
```json
{
  "totalModels": 3,
  "currentModel": "gpt2",
  "models": [...]
}
```

---

## Health & Monitoring

### Health Check

Get system health status.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.8",
  "uptime": 3600,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "nsLlm": {
    "available": true,
    "backend": "http",
    "metrics": {
      "totalRequests": 42,
      "successfulRequests": 40,
      "circuitBreakerState": "CLOSED"
    },
    "clientType": "http"
  },
  "system": {
    "memory": {...},
    "platform": "win32",
    "nodeVersion": "v18.0.0"
  }
}
```

---

## Error Responses

All endpoints may return these error formats:

**400 Bad Request:**
```json
{
  "error": "missing 'text' string"
}
```

**422 Unprocessable Entity:**
```json
{
  "error": "governance-rejected",
  "details": "Toxicity detected"
}
```

**500 Internal Server Error:**
```json
{
  "error": "generate-failed",
  "details": "Error message"
}
```

**502 Bad Gateway:**
```json
{
  "error": "ns-llm-unavailable",
  "details": "Backend not responding"
}
```

---

## Rate Limiting

Currently no rate limiting (development mode).

## Versioning

API version: `v1` (implicit in current endpoints)

Future versions will use `/api/v2/...` format.

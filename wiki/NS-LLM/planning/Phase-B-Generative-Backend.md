# Phase B: Generative Backend

## Objectives
- Add text generation capabilities to NS-LLM backend
- Enable chat responses without external LLM services
- Implement strict resource limits for safety
- Maintain fallback to search adapters

## API Contract

### `/generate` - Generate text completions
```http
POST /generate
Content-Type: application/json

{
  "prompt": "What is the world population?",
  "model": "tinyllama-1.1b",  // optional
  "max_tokens": 256,
  "temperature": 0.7,
  "stop": ["\n\n", "User:"]
}

Response:
{
  "text": "The world population is approximately 8 billion people as of 2024...",
  "model": "tinyllama-1.1b",
  "tokens_generated": 24,
  "latency_ms": 1850,
  "stop_reason": "eos_token"
}
```

## Model Selection

### Criteria
- **Size**: 1-3GB (quantized to ~1GB)
- **Quality**: Reasonable for basic Q&A
- **Speed**: < 10 tokens/sec on CPU acceptable
- **Format**: GGUF (best quantization support)
- **License**: Permissive

### Recommended Models
1. **TinyLlama-1.1B-Chat-v1.0** (Primary)
   - Size: ~637MB (Q4_K_M quantized)
   - Speed: ~15-20 tokens/sec on CPU
   - Quality: Good for simple queries
   - License: Apache 2.0

2. **Phi-2-2.7B** (Higher quality alternative)
   - Size: ~1.6GB (Q4_K_M quantized)
   - Speed: ~8-12 tokens/sec on CPU
   - Quality: Better reasoning
   - License: MIT

## Resource Limits

### Hard Limits (Safety)
- **Max tokens per request**: 512
- **Max concurrent requests**: 2
- **Request timeout**: 30 seconds
- **Memory limit**: 2GB RAM
- **Queue size**: 5 requests

### Graceful Degradation
```javascript
// If limits exceeded, fall back to search adapters
if (generationQueueFull() || memoryExceeded()) {
  return searchAdapterResponse(query);
}
```

## Integration Architecture

```
User Query → NS Node → Decision Tree:
                        ├─ Cache hit? → Return cached
                        ├─ Search adapter match? → Return search result
                        └─ Otherwise → NS-LLM generate (with timeout)
                            ├─ Success → Cache & return
                            └─ Failure → Return "LLM unavailable" message
```

## Success Criteria

### Phase B Complete When:
- [ ] NS-LLM backend supports `/generate` endpoint
- [ ] Quantized generative model packaged (< 1.5GB)
- [ ] Resource limits enforced (tokens, memory, timeout)
- [ ] Fallback logic tested and working
- [ ] Response quality acceptable for basic queries
- [ ] Dashboard shows generation metrics
- [ ] Performance benchmarks documented

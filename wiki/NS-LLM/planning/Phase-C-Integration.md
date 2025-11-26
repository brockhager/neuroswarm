# Phase C: Node Orchestrator Integration

## Objectives
- Seamless integration between NS Node and NS-LLM backend
- Robust error handling and retries
- Circuit breaker pattern for backend failures
- Health monitoring and auto-recovery

## Client Library: `ns-llm-client.js`

### Features
- **Connection pooling** - Reuse HTTP connections
- **Retry logic** - 3 attempts with exponential backoff
- **Circuit breaker** - Stop calling unhealthy backend
- **Timeout handling** - Prevent hanging requests
- **Metrics collection** - Track success/failure rates

### API
```javascript
const nsLlm = require('./ns-llm-client');

// Embedding
const embedding = await nsLlm.embed('query text', { timeout: 5000 });

// Generation
const response = await nsLlm.generate('prompt', { 
  maxTokens: 256,
  timeout: 30000 
});

// Health check
const healthy = await nsLlm.isHealthy();
```

## Health Check Integration

### Dashboard Updates
- Add NS-LLM status card to brain dashboard
- Show backend health, model info, latency
- Display circuit breaker state
- Real-time metrics updates

## Success Criteria

### Phase C Complete When:
- [ ] `ns-llm-client.js` library implemented and tested
- [ ] Retry and circuit breaker logic verified
- [ ] Health checks integrated into NS Node startup
- [ ] Dashboard displays NS-LLM backend status
- [ ] Graceful fallback when backend unavailable
- [ ] Metrics visible in `/health` endpoint

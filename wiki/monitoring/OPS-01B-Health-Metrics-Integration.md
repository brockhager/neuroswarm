# OPS-01B: Health and Metrics Integration Guide

## Overview

This guide demonstrates how to integrate the standardized `/health` and `/metrics` endpoints into NeuroSwarm services for Prometheus monitoring.

**File**: `shared/metrics-service.ts`

---

## Standardized Metrics

### Gateway Metrics (CN-12-A)

```typescript
neuroswarm_requests_total          # Total requests received
neuroswarm_rate_limit_blocks_total # Requests blocked by rate limiting
```

### VP Swarm Metrics (CN-12-B)

```typescript
neuroswarm_jobs_processed_total    # Jobs successfully processed
neuroswarm_jobs_failed_total       # Jobs that failed processing
```

### LLM Security Metrics (CN-06-C/A)

```typescript
neuroswarm_prompt_sanitization_count  # Prompts requiring sanitization
neuroswarm_sandbox_timeout_count      # Code sandbox timeouts
```

### Router/Ledger Metrics (CN-02)

```typescript
neuroswarm_audit_records_anchored_total  # Audit records anchored
```

---

## Integration Examples

### 1. Gateway Node Integration

**File**: `gateway-node/gateway-server.ts`

```typescript
import { setupMonitoringEndpoints, incrementMetric } from '../shared/metrics-service';

// Initialize Express app
const app = express();

// Setup monitoring endpoints
setupMonitoringEndpoints(app, 'Gateway-Node:8080');

// Middleware to track requests
app.use((req, res, next) => {
    incrementMetric('requests_total');
    next();
});

// Rate limiting middleware
function rateLimitMiddleware(req, res, next) {
    if (isRateLimited(req)) {
        incrementMetric('rate_limit_blocks_total');
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    next();
}

// Start server
app.listen(8080, () => {
    console.log('Gateway listening on port 8080');
    console.log('Health: http://localhost:8080/health');
    console.log('Metrics: http://localhost:8080/metrics');
});
```

**Test**:
```powershell
# Health check
Invoke-WebRequest -Uri http://localhost:8080/health

# Prometheus metrics
Invoke-WebRequest -Uri http://localhost:8080/metrics
```

---

### 2. VP Node Integration

**File**: `vp-node/vp-server.ts`

```typescript
import { setupMonitoringEndpoints, incrementMetric } from '../shared/metrics-service';
import { JobQueueService } from './job-queue-service';

const app = express();
const jobQueue = new JobQueueService();

// Setup monitoring endpoints
setupMonitoringEndpoints(app, 'VP-Swarm:3002');

// Job processing handler
jobQueue.onJob(async (job) => {
    try {
        // Process job
        await processJob(job);
        incrementMetric('jobs_processed_total');
    } catch (error) {
        incrementMetric('jobs_failed_total');
        throw error;
    }
});

// Sandbox execution wrapper
async function executeSandboxedCode(code: string) {
    try {
        return await executeCodeInSandbox(code, generateId());
    } catch (error) {
        if (error.message.includes('Timeout')) {
            incrementMetric('sandbox_timeout_count');
        }
        throw error;
    }
}

// Start server
app.listen(3002, () => {
    console.log('VP Node listening on port 3002');
    console.log('Health: http://localhost:3002/health');
    console.log('Metrics: http://localhost:3002/metrics');
});
```

**Test**:
```powershell
# Health check
Invoke-WebRequest -Uri http://localhost:3002/health

# Prometheus metrics
Invoke-WebRequest -Uri http://localhost:3002/metrics
```

---

### 3. Router API Integration

**File**: `router-api/router-server.ts` (future implementation)

```typescript
import { setupMonitoringEndpoints, incrementMetric } from '../shared/metrics-service';

const app = express();

// Setup monitoring endpoints
setupMonitoringEndpoints(app, 'Router-API:4001');

// Audit anchoring endpoint
app.post('/artifact/review', async (req, res) => {
    // ... validation logic ...
    
    // Persist audit record
    await anchorAuditRecord(req.body);
    incrementMetric('audit_records_anchored_total');
    
    res.json({ success: true });
});

// Start server
app.listen(4001, () => {
    console.log('Router listening on port 4001');
    console.log('Health: http://localhost:4001/health');
    console.log('Metrics: http://localhost:4001/metrics');
});
```

---

### 4. Prompt Sanitizer Integration

**File**: `vp-node/prompt-sanitizer.ts`

```typescript
import { incrementMetric } from '../shared/metrics-service';

export function sanitizePrompt(rawPrompt: string): string {
    const { sanitized, wasModified } = sanitizePromptWithDetails(rawPrompt);
    
    if (wasModified) {
        incrementMetric('prompt_sanitization_count');
    }
    
    return sanitized;
}
```

---

## Prometheus Configuration

**Update**: `prometheus.yml`

```yaml
scrape_configs:
  - job_name: 'neuroswarm-gateway'
    static_configs:
      - targets: ['gateway-node:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'neuroswarm-vp-node'
    static_configs:
      - targets: ['vp-node:3002']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'neuroswarm-router'
    static_configs:
      - targets: ['router-api:4001']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'neuroswarm-ns-node'
    static_configs:
      - targets: ['ns-node:3009']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

---

## Health Check Response Format

**Standard Response**:
```json
{
  "status": "UP",
  "service": "Gateway-Node:8080",
  "timestamp": "2025-12-06T22:00:00.000Z",
  "version": "v1.0.0"
}
```

**Future Enhancement** (with dependency checks):
```json
{
  "status": "UP",
  "service": "Gateway-Node:8080",
  "timestamp": "2025-12-06T22:00:00.000Z",
  "version": "v1.0.0",
  "dependencies": {
    "ns-node": "UP",
    "redis": "UP",
    "database": "UP"
  }
}
```

---

## Metrics Payload Format

**Prometheus Text Format**:
```
# HELP neuroswarm_requests_total Total number of requests received by the Gateway.
# TYPE neuroswarm_requests_total counter
neuroswarm_requests_total 100

# HELP neuroswarm_rate_limit_blocks_total Total requests blocked by rate limiting.
# TYPE neuroswarm_rate_limit_blocks_total counter
neuroswarm_rate_limit_blocks_total 3

# HELP neuroswarm_jobs_processed_total Total jobs successfully processed by the VP Swarm.
# TYPE neuroswarm_jobs_processed_total counter
neuroswarm_jobs_processed_total 95
```

---

## Grafana Dashboard Queries

### Gateway Request Rate

```promql
rate(neuroswarm_requests_total[5m])
```

### Rate Limit Block Percentage

```promql
(rate(neuroswarm_rate_limit_blocks_total[5m]) / rate(neuroswarm_requests_total[5m])) * 100
```

### Job Success Rate

```promql
(rate(neuroswarm_jobs_processed_total[5m]) / (rate(neuroswarm_jobs_processed_total[5m]) + rate(neuroswarm_jobs_failed_total[5m]))) * 100
```

### Sandbox Timeout Rate

```promql
rate(neuroswarm_sandbox_timeout_count[5m])
```

---

## Testing Checklist

- [x] Metrics service module created (`shared/metrics-service.ts`)
- [x] Mock integration examples working
- [x] Prometheus format validated
- [ ] Gateway integration (update `gateway-node/gateway-server.ts`)
- [ ] VP Node integration (update `vp-node/vp-server.ts`)
- [ ] Router integration (future, when Router API exists)
- [ ] NS Node integration (already has `/metrics` from OPS-01A)
- [ ] Prometheus scrape config updated
- [ ] Grafana dashboard queries created
- [ ] End-to-end monitoring validation

---

## Deployment Verification

**1. Start services**:
```powershell
docker-compose -f docker-compose.production.yml up -d
```

**2. Verify health endpoints**:
```powershell
Invoke-WebRequest -Uri http://localhost:8080/health  # Gateway
Invoke-WebRequest -Uri http://localhost:3002/health  # VP Node
Invoke-WebRequest -Uri http://localhost:3009/health  # NS Node
Invoke-WebRequest -Uri http://localhost:4001/health  # Router (future)
```

**3. Verify metrics endpoints**:
```powershell
Invoke-WebRequest -Uri http://localhost:8080/metrics  # Gateway
Invoke-WebRequest -Uri http://localhost:3002/metrics  # VP Node
Invoke-WebRequest -Uri http://localhost:3009/metrics  # NS Node
```

**4. Check Prometheus targets**:
```
Open: http://localhost:9090/targets
Verify all targets are "UP"
```

**5. View Grafana dashboards**:
```
Open: http://localhost:3001
Login: admin / <GRAFANA_ADMIN_PASSWORD>
Navigate to NeuroSwarm dashboard
```

---

## Status

✅ **Metrics service module**: Complete  
✅ **Prometheus format**: Validated  
✅ **Mock integration**: Tested  
🚧 **Gateway integration**: Pending  
🚧 **VP Node integration**: Pending  
✅ **NS Node metrics**: Already complete (OPS-01A)  

**Next Steps**: Integrate metrics service into Gateway and VP Node servers

---

*Last Updated: 2025-12-06*  
*Task: OPS-01B*

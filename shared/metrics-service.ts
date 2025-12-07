// metrics-service.ts
// OPS-01B: Extend /health and /metrics to remaining services (Router, VP Swarm, NS-LLM, etc.)
// This module provides a standardized way to expose operational data for Prometheus scraping.

// Mocking required dependencies for a standard Node/TypeScript service
interface ExpressApp {
    get(path: string, handler: (req: any, res: any) => void): void;
}

// --- 1. METRICS CORE ---
// In a real application, this would be a full library like 'prom-client'.
// We are mocking the exposure and increment logic for key NeuroSwarm metrics.

const MetricsStore: Record<string, number> = {
    // --- Gateway Metrics (CN-12-A) ---
    requests_total: 0,
    rate_limit_blocks_total: 0,
    
    // --- VP Swarm Queue Metrics (CN-12-B) ---
    jobs_processed_total: 0,
    jobs_failed_total: 0,
    
    // --- LLM Security Metrics (CN-06-C/A) ---
    prompt_sanitization_count: 0,
    sandbox_timeout_count: 0,
    
    // --- Router/Ledger Metrics (CN-02) ---
    audit_records_anchored_total: 0,
};

/**
 * Standard Prometheus format exposure for a gauge/counter.
 * @param name Metric name
 * @param help Description
 * @param value Current value
 */
function formatMetric(name: string, help: string, value: number): string {
    return `# HELP ${name} ${help}\n# TYPE ${name} counter\n${name} ${value}\n`;
}

// --- 2. PUBLIC API ---

/**
 * Increments a specific counter in the metrics store.
 * Use this function across Gateway, VP Swarm, and Router services.
 */
export function incrementMetric(key: keyof typeof MetricsStore, amount: number = 1): void {
    if (MetricsStore[key] !== undefined) {
        MetricsStore[key] += amount;
    } else {
        console.warn(`Attempted to increment unknown metric: ${key}`);
    }
}

/**
 * Generates the full Prometheus-formatted metrics payload.
 */
export function generateMetricsPayload(): string {
    let output = '';

    output += formatMetric('neuroswarm_requests_total', 'Total number of requests received by the Gateway.', MetricsStore.requests_total);
    output += formatMetric('neuroswarm_rate_limit_blocks_total', 'Total requests blocked by rate limiting.', MetricsStore.rate_limit_blocks_total);
    output += formatMetric('neuroswarm_jobs_processed_total', 'Total jobs successfully processed by the VP Swarm.', MetricsStore.jobs_processed_total);
    output += formatMetric('neuroswarm_jobs_failed_total', 'Total jobs that resulted in a VP Swarm processing failure.', MetricsStore.jobs_failed_total);
    output += formatMetric('neuroswarm_prompt_sanitization_count', 'Count of prompts that required sanitization (CN-06-C).', MetricsStore.prompt_sanitization_count);
    output += formatMetric('neuroswarm_sandbox_timeout_count', 'Count of LLM Code Sandbox executions that timed out (CN-06-A).', MetricsStore.sandbox_timeout_count);
    output += formatMetric('neuroswarm_audit_records_anchored_total', 'Total audit records persisted and anchored by the Router.', MetricsStore.audit_records_anchored_total);
    
    return output;
}

/**
 * Integrates the health and metrics endpoints into an Express-like application instance.
 * @param app The mock Express application instance.
 * @param serviceName The name of the service (e.g., 'Gateway', 'VP-Swarm').
 */
export function setupMonitoringEndpoints(app: ExpressApp, serviceName: string): void {
    
    // --- /health endpoint (Service Liveness Check) ---
    app.get('/health', (req, res) => {
        // In a real system, this would check DB connection, Redis queue connection, etc.
        const healthStatus = {
            status: 'UP',
            service: serviceName,
            timestamp: new Date().toISOString(),
            version: 'v1.0.0'
        };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(healthStatus));
    });

    // --- /metrics endpoint (Prometheus Scrape) ---
    app.get('/metrics', (req, res) => {
        const payload = generateMetricsPayload();
        res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.end(payload);
    });

    console.log(`Monitoring: Health check endpoint /health and Metrics endpoint /metrics enabled for ${serviceName}.`);
}


// --- 3. MOCK INTEGRATION EXAMPLE ---

const mockExpressApp: ExpressApp = {
    get: (path, handler) => {
        // Mocking request handlers for demonstration
        console.log(`[Mock App] Registered GET ${path}`);
    }
};

// Simulate usage in the Gateway Service
console.log('\n--- Mock Gateway Integration ---');
setupMonitoringEndpoints(mockExpressApp, 'Gateway-Node:8080');

// Simulate real-time metric updates
incrementMetric('requests_total', 100);
incrementMetric('rate_limit_blocks_total', 3);
incrementMetric('prompt_sanitization_count', 25);

// Simulate usage in the VP Swarm Service
console.log('\n--- Mock VP Swarm Integration ---');
setupMonitoringEndpoints(mockExpressApp, 'VP-Swarm:3002');
incrementMetric('jobs_processed_total', 95);
incrementMetric('jobs_failed_total', 5);
incrementMetric('sandbox_timeout_count', 2);

// Simulate usage in the Router Service
console.log('\n--- Mock Router Integration ---');
setupMonitoringEndpoints(mockExpressApp, 'Router-API:4001');
incrementMetric('audit_records_anchored_total', 95);


// Display final metrics payload (what Prometheus scrapes)
console.log('\n--- Final Prometheus Scrape Payload Sample ---');
console.log(generateMetricsPayload());

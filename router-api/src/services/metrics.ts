import { Counter, Histogram, register } from 'prom-client';

export class MetricsService {
    // Singleton instance
    private static instance: MetricsService;

    // Metrics
    public readonly ledgerWritesTotal: Counter;
    public readonly anchorSuccessTotal: Counter;
    public readonly anchorFailureTotal: Counter;
    public readonly anchorLatency: Histogram;

    private constructor() {
        // Initialize metrics (safe to re-register if reusing register)
        this.ledgerWritesTotal = this.getOrRegisterCounter(
            'router_ledger_writes_total',
            'Total number of ledger write requests'
        );

        this.anchorSuccessTotal = this.getOrRegisterCounter(
            'router_anchoring_success_total',
            'Total number of successful anchor operations'
        );

        this.anchorFailureTotal = this.getOrRegisterCounter(
            'router_anchoring_failure_total',
            'Total number of failed anchor operations'
        );

        this.anchorLatency = this.getOrRegisterHistogram(
            'router_anchoring_latency_seconds',
            'Latency of anchoring operations in seconds',
            [0.1, 0.5, 1, 2, 5, 10, 30]
        );
    }

    public static getInstance(): MetricsService {
        if (!MetricsService.instance) {
            MetricsService.instance = new MetricsService();
        }
        return MetricsService.instance;
    }

    // Helper to avoid "Metric already registered" errors in HMR/Reload scenarios
    private getOrRegisterCounter(name: string, help: string): Counter {
        const existing = register.getSingleMetric(name);
        if (existing) return existing as Counter;
        return new Counter({ name, help });
    }

    private getOrRegisterHistogram(name: string, help: string, buckets: number[]): Histogram {
        const existing = register.getSingleMetric(name);
        if (existing) return existing as Histogram;
        return new Histogram({ name, help, buckets });
    }
}

export const metrics = MetricsService.getInstance();

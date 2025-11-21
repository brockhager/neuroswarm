/**
 * Metrics Service - Prometheus-compatible metrics collector
 * Collects and exposes system metrics for monitoring
 */

export class MetricsService {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.prefix = options.prefix || 'neuroswarm_';
        this.metrics = new Map(); // name -> { type, help, values: Map(labelsKey -> value) }

        console.log('[MetricsService] Initialized');
    }

    /**
     * Register a Counter metric (monotonically increasing)
     */
    registerCounter(name, help) {
        this._registerMetric(name, 'counter', help);
    }

    /**
     * Register a Gauge metric (can go up and down)
     */
    registerGauge(name, help) {
        this._registerMetric(name, 'gauge', help);
    }

    /**
     * Register a Histogram metric (buckets) - Simplified for now
     * For this implementation, we'll just treat it as a set of counters/gauges or skip complex histograms
     * to keep dependencies low.
     */
    // registerHistogram(name, help, buckets) { ... }

    _registerMetric(name, type, help) {
        if (this.metrics.has(name)) return;

        this.metrics.set(name, {
            type,
            help,
            values: new Map() // labelString -> value
        });
    }

    /**
     * Increment a counter or gauge
     */
    inc(name, labels = {}, value = 1) {
        if (!this.enabled) return;

        const metric = this.metrics.get(name);
        if (!metric) {
            // Auto-register if not exists (convenience)
            this.registerCounter(name, 'Auto-registered metric');
            return this.inc(name, labels, value);
        }

        const labelKey = this._getLabelKey(labels);
        const current = metric.values.get(labelKey) || 0;
        metric.values.set(labelKey, current + value);
    }

    /**
     * Set a gauge value
     */
    set(name, value, labels = {}) {
        if (!this.enabled) return;

        const metric = this.metrics.get(name);
        if (!metric) {
            this.registerGauge(name, 'Auto-registered metric');
            return this.set(name, value, labels);
        }

        if (metric.type !== 'gauge') {
            // console.warn(`[Metrics] Cannot set value for non-gauge metric ${name}`);
            return;
        }

        const labelKey = this._getLabelKey(labels);
        metric.values.set(labelKey, value);
    }

    /**
     * Helper to create a stable key from labels object
     */
    _getLabelKey(labels) {
        if (!labels || Object.keys(labels).length === 0) return '';

        return Object.entries(labels)
            .sort(([k1], [k2]) => k1.localeCompare(k2))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
    }

    /**
     * Get metrics in Prometheus text format
     */
    getMetrics() {
        let output = '';

        for (const [name, metric] of this.metrics.entries()) {
            const fullName = this.prefix + name;

            // Help and Type
            output += `# HELP ${fullName} ${metric.help}\n`;
            output += `# TYPE ${fullName} ${metric.type}\n`;

            if (metric.values.size === 0) {
                // Output zero value if no labels, or just nothing?
                // Usually nothing if no observations.
            }

            for (const [labelKey, value] of metric.values.entries()) {
                if (labelKey) {
                    output += `${fullName}{${labelKey}} ${value}\n`;
                } else {
                    output += `${fullName} ${value}\n`;
                }
            }

            output += '\n';
        }

        return output;
    }

    /**
     * Reset all metrics (mostly for testing)
     */
    reset() {
        for (const metric of this.metrics.values()) {
            metric.values.clear();
        }
    }
}

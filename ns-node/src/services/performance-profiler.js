/**
 * Performance Profiler Service
 * 
 * Tracks and analyzes performance metrics for NS-LLM operations:
 * - Latency (TTFT, tokens/sec, end-to-end)
 * - Throughput (requests/sec, concurrent capacity)
 * - Resource Usage (CPU, GPU, memory, network)
 */

import os from 'os';

class PerformanceProfiler {
    constructor() {
        this.profiles = new Map();
        this.completedOperations = [];
        this.maxHistorySize = 1000;

        // Metrics aggregation
        this.metrics = {
            latency: {
                ttft: [], // Time to first token
                tokenGeneration: [], // Per-token generation time
                endToEnd: [], // Total request time
                embedding: []
            },
            throughput: {
                requestsPerSecond: 0,
                tokensPerSecond: 0,
                concurrentRequests: 0
            },
            resources: {
                cpu: [],
                memory: [],
                gpu: []
            },
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                cached: 0
            }
        };

        // Start resource monitoring
        this.startResourceMonitoring();
    }

    /**
     * Start profiling an operation
     */
    startProfile(operationId, operationType = 'generic', metadata = {}) {
        const profile = {
            id: operationId,
            type: operationType,
            metadata,
            startTime: Date.now(),
            startCpu: process.cpuUsage(),
            startMemory: process.memoryUsage(),
            checkpoints: [],
            ended: false
        };

        this.profiles.set(operationId, profile);
        this.metrics.throughput.concurrentRequests++;

        return profile;
    }

    /**
     * Add checkpoint to ongoing profile
     */
    checkpoint(operationId, checkpointName, data = {}) {
        const profile = this.profiles.get(operationId);
        if (!profile || profile.ended) return;

        profile.checkpoints.push({
            name: checkpointName,
            timestamp: Date.now(),
            elapsed: Date.now() - profile.startTime,
            data
        });
    }

    /**
     * End profiling and record metrics
     */
    endProfile(operationId, status = 'success', result = {}) {
        const profile = this.profiles.get(operationId);
        if (!profile || profile.ended) return null;

        profile.endTime = Date.now();
        profile.duration = profile.endTime - profile.startTime;
        profile.endCpu = process.cpuUsage(profile.startCpu);
        profile.endMemory = process.memoryUsage();
        profile.status = status;
        profile.result = result;
        profile.ended = true;

        this.metrics.throughput.concurrentRequests--;
        this.metrics.requests.total++;

        if (status === 'success') {
            this.metrics.requests.successful++;
        } else {
            this.metrics.requests.failed++;
        }

        // Record latency metrics based on operation type
        if (profile.type === 'generate') {
            this.recordGenerationMetrics(profile);
        } else if (profile.type === 'embed') {
            this.metrics.latency.embedding.push(profile.duration);
        }

        // Store completed operation
        this.completedOperations.push(profile);
        if (this.completedOperations.length > this.maxHistorySize) {
            this.completedOperations.shift();
        }

        // Clean up active profile
        this.profiles.delete(operationId);

        return profile;
    }

    /**
     * Record generation-specific metrics
     */
    recordGenerationMetrics(profile) {
        // Calculate TTFT (Time to First Token)
        const ttftCheckpoint = profile.checkpoints.find(cp => cp.name === 'first-token');
        if (ttftCheckpoint) {
            this.metrics.latency.ttft.push(ttftCheckpoint.elapsed);
        }

        // Calculate tokens/sec
        const tokenCount = profile.result.tokenCount || 0;
        if (tokenCount > 0 && profile.duration > 0) {
            const tokensPerSec = (tokenCount / profile.duration) * 1000;
            this.metrics.latency.tokenGeneration.push(profile.duration / tokenCount);
            this.metrics.throughput.tokensPerSecond = tokensPerSec;
        }

        // Record end-to-end latency
        this.metrics.latency.endToEnd.push(profile.duration);
    }

    /**
     * Get current metrics
     */
    getMetrics(timeWindow = 60000) { // Default: last 60 seconds
        const cutoff = Date.now() - timeWindow;
        const recentOps = this.completedOperations.filter(op => op.endTime >= cutoff);

        // Calculate percentiles
        const calculatePercentiles = (values) => {
            if (values.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0 };

            const sorted = [...values].sort((a, b) => a - b);
            const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
            const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1] || 0;
            const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1] || 0;
            const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;

            return { p50, p95, p99, avg };
        };

        // Recent latency values
        const recentTtft = this.metrics.latency.ttft.slice(-100);
        const recentEndToEnd = this.metrics.latency.endToEnd.slice(-100);
        const recentTokenGen = this.metrics.latency.tokenGeneration.slice(-100);
        const recentEmbedding = this.metrics.latency.embedding.slice(-100);

        return {
            latency: {
                ttft: calculatePercentiles(recentTtft),
                endToEnd: calculatePercentiles(recentEndToEnd),
                perToken: calculatePercentiles(recentTokenGen),
                embedding: calculatePercentiles(recentEmbedding)
            },
            throughput: {
                requestsPerSecond: (recentOps.length / (timeWindow / 1000)).toFixed(2),
                tokensPerSecond: this.metrics.throughput.tokensPerSecond.toFixed(2),
                concurrentRequests: this.metrics.throughput.concurrentRequests
            },
            requests: {
                ...this.metrics.requests,
                successRate: ((this.metrics.requests.successful / this.metrics.requests.total) * 100).toFixed(2)
            },
            resources: {
                cpu: {
                    loadAverage: os.loadavg(),
                    usage: process.cpuUsage()
                },
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    process: process.memoryUsage()
                }
            },
            timeWindow: `${timeWindow / 1000}s`,
            sampleSize: recentOps.length
        };
    }

    /**
     * Analyze bottlenecks from recent operations
     */
    analyzeBottlenecks(limit = 100) {
        const recent = this.completedOperations.slice(-limit);

        const bottlenecks = [];

        // Analyze slow operations (p95 latency)
        const durations = recent.map(op => op.duration);
        const sorted = [...durations].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;

        const slowOps = recent.filter(op => op.duration > p95);
        if (slowOps.length > 0) {
            bottlenecks.push({
                type: 'slow_operations',
                severity: 'medium',
                count: slowOps.length,
                threshold: `${p95}ms`,
                suggestion: 'Optimize inference pipeline or enable caching'
            });
        }

        // Analyze high failure rate
        const failureRate = (this.metrics.requests.failed / this.metrics.requests.total) * 100;
        if (failureRate > 5) {
            bottlenecks.push({
                type: 'high_failure_rate',
                severity: 'high',
                rate: `${failureRate.toFixed(2)}%`,
                suggestion: 'Check error logs and model availability'
            });
        }

        // Analyze low throughput
        const avgTokensPerSec = this.metrics.throughput.tokensPerSecond;
        if (avgTokensPerSec < 10 && recent.length > 10) {
            bottlenecks.push({
                type: 'low_throughput',
                severity: 'medium',
                current: `${avgTokensPerSec} tokens/sec`,
                target: '12+ tokens/sec',
                suggestion: 'Enable GPU acceleration or optimize model'
            });
        }

        // Analyze memory usage
        const memUsage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
        if (memUsage > 80) {
            bottlenecks.push({
                type: 'high_memory_usage',
                severity: 'high',
                usage: `${memUsage.toFixed(1)}%`,
                suggestion: 'Implement cache eviction or increase memory limit'
            });
        }

        return {
            bottlenecks,
            analyzed: recent.length,
            timeframe: 'last ' + limit + ' operations'
        };
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const metrics = this.getMetrics();
        const bottlenecks = this.analyzeBottlenecks();

        // Performance Score (0-100)
        const calculateScore = () => {
            let score = 100;

            // Deduct for high latency
            if (metrics.latency.endToEnd.p95 > 1000) score -= 20;
            else if (metrics.latency.endToEnd.p95 > 500) score -= 10;

            // Deduct for low throughput
            if (parseFloat(metrics.throughput.tokensPerSecond) < 10) score -= 15;

            // Deduct for failures
            const failureRate = parseFloat(metrics.requests.successRate);
            if (failureRate < 95) score -= (100 - failureRate);

            // Deduct for bottlenecks
            score -= bottlenecks.bottlenecks.filter(b => b.severity === 'high').length * 10;
            score -= bottlenecks.bottlenecks.filter(b => b.severity === 'medium').length * 5;

            return Math.max(0, Math.min(100, score));
        };

        return {
            summary: {
                score: calculateScore(),
                grade: calculateScore() >= 80 ? 'A' : calculateScore() >= 60 ? 'B' : 'C',
                timestamp: new Date().toISOString()
            },
            metrics,
            bottlenecks,
            recommendations: this.generateRecommendations(metrics, bottlenecks)
        };
    }

    /**
     * Generate optimization recommendations
     */
    generateRecommendations(metrics, bottlenecks) {
        const recommendations = [];

        // Based on bottlenecks
        bottlenecks.bottlenecks.forEach(b => {
            recommendations.push({
                priority: b.severity,
                category: b.type,
                action: b.suggestion
            });
        });

        // Additional recommendations based on metrics
        if (parseFloat(metrics.throughput.tokensPerSecond) < 12) {
            recommendations.push({
                priority: 'high',
                category: 'performance',
                action: 'Enable GPU acceleration for inference'
            });
        }

        if (metrics.latency.ttft.avg > 100) {
            recommendations.push({
                priority: 'medium',
                category: 'latency',
                action: 'Implement model preloading and connection pooling'
            });
        }

        return recommendations;
    }

    /**
     * Start monitoring system resources
     */
    startResourceMonitoring() {
        setInterval(() => {
            this.metrics.resources.cpu.push({
                timestamp: Date.now(),
                loadAvg: os.loadavg()[0]
            });

            this.metrics.resources.memory.push({
                timestamp: Date.now(),
                used: process.memoryUsage().heapUsed,
                total: process.memoryUsage().heapTotal
            });

            // Trim history
            if (this.metrics.resources.cpu.length > 100) {
                this.metrics.resources.cpu.shift();
                this.metrics.resources.memory.shift();
            }
        }, 5000); // Every 5 seconds
    }

    /**
     * Clear history
     */
    clear() {
        this.completedOperations = [];
        this.metrics.latency.ttft = [];
        this.metrics.latency.tokenGeneration = [];
        this.metrics.latency.endToEnd = [];
        this.metrics.latency.embedding = [];
        this.metrics.requests = {
            total: 0,
            successful: 0,
            failed: 0,
            cached: 0
        };
    }
}

export default PerformanceProfiler;

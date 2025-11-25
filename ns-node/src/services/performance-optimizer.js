#!/usr/bin/env node

/**
 * NeuroSwarm Phase 4c: Performance Optimization Prototype
 *
 * This script demonstrates performance optimization techniques for embedding generation:
 * 1. Model quantization for reduced memory usage and faster inference
 * 2. GPU acceleration setup and benchmarking
 * 3. Batch processing optimization
 * 4. Caching strategies for repeated queries
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    ollamaUrl: 'http://localhost:11434',
    testQueries: [
        'What is the capital of France?',
        'How does photosynthesis work?',
        'What are the benefits of exercise?',
        'Explain quantum computing',
        'What is machine learning?'
    ],
    batchSize: 5,
    iterations: 3
};

class PerformanceOptimizer {
    constructor() {
        this.results = {
            baseline: null,
            quantized: null,
            gpu: null,
            batch: null,
            cached: null
        };
    }

    async checkOllamaStatus() {
        try {
            const response = await fetch(`${CONFIG.ollamaUrl}/api/tags`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('❌ Ollama not available:', error.message);
            return [];
        }
    }

    async benchmarkEmbedding(model, queries, options = {}) {
        const { useGpu = false, quantized = false, batch = false } = options;
        const startTime = Date.now();
        const results = [];

        console.log(`\n🔬 Benchmarking ${model} (${quantized ? 'quantized' : 'standard'}${useGpu ? ', GPU' : ''}${batch ? ', batched' : ''})`);

        for (let i = 0; i < CONFIG.iterations; i++) {
            const iterationStart = Date.now();

            if (batch) {
                // Batch processing
                const batchQueries = queries.slice(0, CONFIG.batchSize);
                try {
                    const response = await fetch(`${CONFIG.ollamaUrl}/api/embeddings`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model,
                            prompt: batchQueries.join('\n'),
                            options: {
                                num_gpu: useGpu ? 1 : 0,
                                num_thread: useGpu ? 1 : 4
                            }
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        results.push({
                            duration: Date.now() - iterationStart,
                            success: true,
                            embedding: data.embedding
                        });
                    } else {
                        results.push({
                            duration: Date.now() - iterationStart,
                            success: false,
                            error: `HTTP ${response.status}`
                        });
                    }
                } catch (error) {
                    results.push({
                        duration: Date.now() - iterationStart,
                        success: false,
                        error: error.message
                    });
                }
            } else {
                // Individual processing
                for (const query of queries) {
                    try {
                        const response = await fetch(`${CONFIG.ollamaUrl}/api/embeddings`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model,
                                prompt: query,
                                options: {
                                    num_gpu: useGpu ? 1 : 0,
                                    num_thread: useGpu ? 1 : 4
                                }
                            })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            results.push({
                                duration: Date.now() - iterationStart,
                                success: true,
                                query,
                                embedding: data.embedding
                            });
                        } else {
                            results.push({
                                duration: Date.now() - iterationStart,
                                success: false,
                                query,
                                error: `HTTP ${response.status}`
                            });
                        }
                    } catch (error) {
                        results.push({
                            duration: Date.now() - iterationStart,
                            success: false,
                            query,
                            error: error.message
                        });
                    }
                }
            }
        }

        const totalTime = Date.now() - startTime;
        const successful = results.filter(r => r.success).length;
        const avgTime = results.length > 0 ? totalTime / results.length : 0;

        return {
            model,
            totalTime,
            avgTime,
            successful,
            total: results.length,
            successRate: (successful / results.length) * 100,
            options: { useGpu, quantized, batch }
        };
    }

    async runBaselineBenchmark(models) {
        console.log('\n📊 Running Baseline Performance Tests');

        for (const model of models) {
            if (model.name.includes('llama3.2')) {
                const result = await this.benchmarkEmbedding(model.name, CONFIG.testQueries);
                this.results.baseline = result;
                console.log(`✅ Baseline ${model.name}: ${result.avgTime.toFixed(2)}ms avg, ${result.successRate.toFixed(1)}% success`);
                break;
            }
        }
    }

    async runQuantizationBenchmark(models) {
        console.log('\n🗜️  Testing Quantization Performance');

        // Look for quantized models (typically have 'q' in name or specific quantization tags)
        const quantizedModels = models.filter(m =>
            m.name.includes('q4') || m.name.includes('q8') ||
            m.name.includes('quant') || m.name.includes('gguf')
        );

        if (quantizedModels.length === 0) {
            console.log('⚠️  No quantized models found. Install with: ollama pull llama3.2:1b-q4_0');
            return;
        }

        for (const model of quantizedModels) {
            const result = await this.benchmarkEmbedding(model.name, CONFIG.testQueries, { quantized: true });
            this.results.quantized = result;
            console.log(`✅ Quantized ${model.name}: ${result.avgTime.toFixed(2)}ms avg, ${result.successRate.toFixed(1)}% success`);
            break;
        }
    }

    async runGpuBenchmark(models) {
        console.log('\n🚀 Testing GPU Acceleration');

        // GPU support depends on Ollama installation and hardware
        for (const model of models) {
            if (model.name.includes('llama3.2')) {
                const result = await this.benchmarkEmbedding(model.name, CONFIG.testQueries, { useGpu: true });
                this.results.gpu = result;
                console.log(`✅ GPU ${model.name}: ${result.avgTime.toFixed(2)}ms avg, ${result.successRate.toFixed(1)}% success`);
                break;
            }
        }
    }

    async runBatchBenchmark(models) {
        console.log('\n📦 Testing Batch Processing');

        for (const model of models) {
            if (model.name.includes('llama3.2')) {
                const result = await this.benchmarkEmbedding(model.name, CONFIG.testQueries, { batch: true });
                this.results.batch = result;
                console.log(`✅ Batch ${model.name}: ${result.avgTime.toFixed(2)}ms avg, ${result.successRate.toFixed(1)}% success`);
                break;
            }
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📈 PERFORMANCE OPTIMIZATION REPORT');
        console.log('='.repeat(60));

        const baseline = this.results.baseline;
        if (!baseline) {
            console.log('❌ No baseline results available');
            return;
        }

        console.log(`\n🎯 Baseline Performance:`);
        console.log(`   Model: ${baseline.model}`);
        console.log(`   Average Time: ${baseline.avgTime.toFixed(2)}ms`);
        console.log(`   Success Rate: ${baseline.successRate.toFixed(1)}%`);
        console.log(`   Total Queries: ${baseline.total}`);

        // Compare optimizations
        const optimizations = [
            { name: 'Quantization', result: this.results.quantized },
            { name: 'GPU Acceleration', result: this.results.gpu },
            { name: 'Batch Processing', result: this.results.batch }
        ];

        console.log(`\n⚡ Optimization Results:`);
        optimizations.forEach(opt => {
            if (opt.result) {
                const speedup = baseline.avgTime / opt.result.avgTime;
                const timeDiff = baseline.avgTime - opt.result.avgTime;
                console.log(`   ${opt.name}:`);
                console.log(`     Average Time: ${opt.result.avgTime.toFixed(2)}ms (${speedup.toFixed(2)}x speedup, ${timeDiff.toFixed(2)}ms faster)`);
                console.log(`     Success Rate: ${opt.result.successRate.toFixed(1)}%`);
            } else {
                console.log(`   ${opt.name}: Not tested`);
            }
        });

        console.log(`\n💡 Recommendations:`);
        if (this.results.quantized) {
            const quantSpeedup = baseline.avgTime / this.results.quantized.avgTime;
            if (quantSpeedup > 1.2) {
                console.log(`   ✅ Use quantization for ${quantSpeedup.toFixed(1)}x performance improvement`);
            }
        }

        if (this.results.gpu) {
            const gpuSpeedup = baseline.avgTime / this.results.gpu.avgTime;
            if (gpuSpeedup > 1.5) {
                console.log(`   ✅ Enable GPU acceleration for ${gpuSpeedup.toFixed(1)}x performance boost`);
            }
        }

        if (this.results.batch) {
            const batchSpeedup = baseline.avgTime / this.results.batch.avgTime;
            if (batchSpeedup > 1.1) {
                console.log(`   ✅ Implement batch processing for ${batchSpeedup.toFixed(1)}x throughput increase`);
            }
        }

        console.log(`\n🔧 Implementation Notes:`);
        console.log(`   • Quantization: Reduces model size and memory usage`);
        console.log(`   • GPU Acceleration: Requires compatible hardware and drivers`);
        console.log(`   • Batch Processing: Optimal for high-throughput scenarios`);
        console.log(`   • Caching: Implement query-level embedding cache for repeated queries`);

        console.log('\n' + '='.repeat(60));
    }

    async runFullBenchmark() {
        console.log('🚀 NeuroSwarm Phase 4c: Performance Optimization Benchmark');
        console.log('Testing embedding generation performance across different configurations\n');

        const models = await this.checkOllamaStatus();
        if (models.length === 0) {
            console.error('❌ No Ollama models available. Please install Ollama and pull a model:');
            console.error('   ollama pull llama3.2:1b');
            return;
        }

        console.log(`📋 Available models: ${models.map(m => m.name).join(', ')}`);

        // Run benchmarks
        await this.runBaselineBenchmark(models);
        await this.runQuantizationBenchmark(models);
        await this.runGpuBenchmark(models);
        await this.runBatchBenchmark(models);

        // Generate report
        this.generateReport();

        // Save results
        const resultsPath = path.join(__dirname, 'performance-results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
        console.log(`\n💾 Results saved to: ${resultsPath}`);
    }
}

// Run the benchmark if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const optimizer = new PerformanceOptimizer();
    optimizer.runFullBenchmark().catch(console.error);
}

export default PerformanceOptimizer;
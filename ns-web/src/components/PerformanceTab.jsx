import { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

function PerformanceTab() {
    const [gpuData, setGpuData] = useState(null);
    const [cacheData, setCacheData] = useState(null);
    const [perfMetrics, setPerfMetrics] = useState(null);
    const [latencyHistory, setLatencyHistory] = useState({
        timestamps: [],
        p50: [],
        p95: [],
        p99: []
    });

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Update every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [gpu, cache, perf] = await Promise.all([
                fetch('/api/gpu/status').then(r => r.json()).catch(() => null),
                fetch('/api/kv-cache/stats').then(r => r.json()).catch(() => null),
                fetch('/api/performance/metrics').then(r => r.json()).catch(() => null)
            ]);

            setGpuData(gpu);
            setCacheData(cache);
            setPerfMetrics(perf);

            // Update latency history
            if (perf?.latency) {
                const now = new Date().toLocaleTimeString();
                setLatencyHistory(prev => {
                    const newHistory = {
                        timestamps: [...prev.timestamps, now].slice(-20), // Keep last 20 data points
                        p50: [...prev.p50, perf.latency.endToEnd.p50].slice(-20),
                        p95: [...prev.p95, perf.latency.endToEnd.p95].slice(-20),
                        p99: [...prev.p99, perf.latency.endToEnd.p99].slice(-20)
                    };
                    return newHistory;
                });
            }
        } catch (error) {
            console.error('Failed to fetch performance data:', error);
        }
    };

    return (
        <div className="fade-in">
            <h1>Performance Metrics</h1>
            <p className="text-secondary mb-lg">
                Real-time monitoring of GPU utilization, cache efficiency, and latency trends
            </p>

            {/* GPU Utilization */}
            {gpuData && gpuData.capabilities.hasGpu && (
                <div className="card mb-lg">
                    <h2>⚡ GPU Utilization</h2>
                    <div className="mb-md">
                        <div className="flex gap-md mb-md">
                            <div className="metric-card flex-1">
                                <div className="metric-value text-success">
                                    {gpuData.capabilities.vendor.toUpperCase()}
                                </div>
                                <div className="metric-label">GPU Vendor</div>
                            </div>
                            <div className="metric-card flex-1">
                                <div className="metric-value">
                                    {gpuData.capabilities.deviceCount}
                                </div>
                                <div className="metric-label">Devices</div>
                            </div>
                            <div className="metric-card flex-1">
                                <div className="metric-value">
                                    {(gpuData.capabilities.totalVram / 1024).toFixed(1)} GB
                                </div>
                                <div className="metric-label">Total VRAM</div>
                            </div>
                        </div>
                    </div>
                    <GpuUtilizationChart data={gpuData} />
                </div>
            )}

            {/* Cache Performance */}
            {cacheData && (
                <div className="card mb-lg">
                    <h2>💾 Cache Performance</h2>
                    <div className="flex gap-md mb-md">
                        <div className="metric-card flex-1">
                            <div className="metric-value text-success">{cacheData.hitRate}%</div>
                            <div className="metric-label">Hit Rate</div>
                        </div>
                        <div className="metric-card flex-1">
                            <div className="metric-value">{cacheData.hits}</div>
                            <div className="metric-label">Cache Hits</div>
                        </div>
                        <div className="metric-card flex-1">
                            <div className="metric-value">{cacheData.misses}</div>
                            <div className="metric-label">Cache Misses</div>
                        </div>
                        <div className="metric-card flex-1">
                            <div className="metric-value">
                                {cacheData.memorySize}/{cacheData.diskSize}
                            </div>
                            <div className="metric-label">Memory/Disk</div>
                        </div>
                    </div>
                    <CacheHitRateChart data={cacheData} />
                </div>
            )}

            {/* Latency Trends */}
            {perfMetrics && (
                <div className="card">
                    <h2>📈 Latency Trends</h2>
                    <div className="flex gap-md mb-md">
                        <div className="metric-card flex-1">
                            <div className="metric-value">
                                {perfMetrics.latency?.endToEnd?.p50?.toFixed(0) || 0}ms
                            </div>
                            <div className="metric-label">P50 Latency</div>
                        </div>
                        <div className="metric-card flex-1">
                            <div className="metric-value">
                                {perfMetrics.latency?.endToEnd?.p95?.toFixed(0) || 0}ms
                            </div>
                            <div className="metric-label">P95 Latency</div>
                        </div>
                        <div className="metric-card flex-1">
                            <div className="metric-value">
                                {perfMetrics.throughput?.tokensPerSecond || 0}
                            </div>
                            <div className="metric-label">Tokens/Second</div>
                        </div>
                        <div className="metric-card flex-1">
                            <div className="metric-value">{perfMetrics.requests?.successRate || 0}%</div>
                            <div className="metric-label">Success Rate</div>
                        </div>
                    </div>
                    <LatencyTrendChart data={latencyHistory} />
                </div>
            )}
        </div>
    );
}

// GPU Utilization Chart Component
function GpuUtilizationChart({ data }) {
    if (!data.current || !data.current.devices) {
        return <div className="text-muted">No GPU data available</div>;
    }

    const chartData = {
        labels: data.current.devices.map((_, i) => `GPU ${i}`),
        datasets: [
            {
                label: 'Utilization (%)',
                data: data.current.devices.map(d => d.utilization),
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgb(102, 126, 234)',
                borderWidth: 2
            },
            {
                label: 'Memory Used (%)',
                data: data.current.devices.map(d =>
                    ((d.memoryUsed / d.memoryTotal) * 100).toFixed(1)
                ),
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 2
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    callback: value => `${value}%`,
                    color: '#a8b2d1'
                },
                grid: { color: 'rgba(168, 178, 209, 0.1)' }
            },
            x: {
                ticks: { color: '#a8b2d1' },
                grid: { color: 'rgba(168, 178, 209, 0.1)' }
            }
        }
    };

    return <Bar data={chartData} options={options} />;
}

// Cache Hit Rate Chart Component
function CacheHitRateChart({ data }) {
    const chartData = {
        labels: ['Hits', 'Misses'],
        datasets: [{
            data: [data.hits, data.misses],
            backgroundColor: [
                'rgba(16, 185, 129, 0.8)',
                'rgba(239, 68, 68, 0.8)'
            ],
            borderColor: [
                'rgb(16, 185, 129)',
                'rgb(239, 68, 68)'
            ],
            borderWidth: 2
        }]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'bottom', labels: { color: '#a8b2d1' } },
            title: { display: false },
            tooltip: {
                callbacks: {
                    label: context => {
                        const total = data.hits + data.misses;
                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                        return `${context.label}: ${context.parsed} (${percentage}%)`;
                    }
                }
            }
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <Doughnut data={chartData} options={options} />
        </div>
    );
}

// Latency Trend Chart Component
function LatencyTrendChart({ data }) {
    const chartData = {
        labels: data.timestamps,
        datasets: [
            {
                label: 'P50 Latency',
                data: data.p50,
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'P95 Latency',
                data: data.p95,
                borderColor: 'rgb(245, 158, 11)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'P99 Latency',
                data: data.p99,
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    };

    const options = {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: { position: 'top', labels: { color: '#a8b2d1' } },
            title: { display: false },
            tooltip: {
                callbacks: {
                    label: context => `${context.dataset.label}: ${context.parsed.y.toFixed(0)}ms`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: value => `${value}ms`,
                    color: '#a8b2d1'
                },
                grid: { color: 'rgba(168, 178, 209, 0.1)' }
            },
            x: {
                ticks: {
                    color: '#a8b2d1',
                    maxRotation: 45,
                    minRotation: 45
                },
                grid: { color: 'rgba(168, 178, 209, 0.1)' }
            }
        }
    };

    return <Line data={chartData} options={options} />;
}

export default PerformanceTab;

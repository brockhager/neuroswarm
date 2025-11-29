import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// --- Mock Data ---

const MOCK_SYSTEM_DATA = {
    version: '0.2.0',
    status: 'Operational',
    uptime: '4d 12h 30m',
    nodeType: 'NS-Node (Brain)',
    peers: 5
};

const MOCK_PERFORMANCE_DATA = {
    p95Latency: 75, // ms/token
    throughput: 15.2, // tokens/s
    ttft: 85, // ms
    score: 'A',
    history: {
        labels: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25'],
        latency: [72, 75, 78, 74, 76, 75],
        throughput: [14, 15, 15.5, 15.2, 14.8, 15.2]
    }
};

const MOCK_GOVERNANCE_DATA = {
    activeProposals: 3,
    lastAnchoredBlock: '0x7f8a...3b21',
    toxicityFlagRate: 0.05, // 0.05%
    activity: [
        { id: 1, type: 'vote', user: 'node-alpha', proposal: 'PROP-102', action: 'APPROVE', time: '2m ago' },
        { id: 2, type: 'anchor', hash: '0x7f8a...3b21', time: '15m ago' },
        { id: 3, type: 'proposal', title: 'Increase Context Window', user: 'node-beta', time: '1h ago' }
    ]
};

const MOCK_PLUGINS_DATA = [
    { id: 'validator-core', version: '1.2.0', type: 'validator', status: 'Active', executions: 1250, avgTime: '12ms', successRate: '99.8%' },
    { id: 'vis-dashboard', version: '0.9.5', type: 'visualization', status: 'Active', executions: 45, avgTime: '5ms', successRate: '100%' },
    { id: 'scorer-bias', version: '1.0.1', type: 'scorer', status: 'Disabled', executions: 0, avgTime: '-', successRate: '-' }
];

// --- Sub-Components ---

const SystemOverview = () => {
    const data = MOCK_SYSTEM_DATA;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">System Status</h3>
                <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                    <span className="text-2xl font-bold text-white">{data.status}</span>
                </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Version</h3>
                <span className="text-2xl font-bold text-blue-400">v{data.version}</span>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Uptime</h3>
                <span className="text-2xl font-bold text-purple-400">{data.uptime}</span>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
                <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Active Peers</h3>
                <span className="text-2xl font-bold text-yellow-400">{data.peers}</span>
            </div>
        </div>
    );
};

const PerformanceView = () => {
    const data = MOCK_PERFORMANCE_DATA;
    const isLatencyGood = data.p95Latency < 80;

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: false },
        },
        scales: {
            y: { grid: { color: '#374151' }, ticks: { color: '#9CA3AF' } },
            x: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
        }
    };

    const latencyChartData = {
        labels: data.history.labels,
        datasets: [{
            label: 'Latency (ms)',
            data: data.history.latency,
            borderColor: '#34D399',
            backgroundColor: 'rgba(52, 211, 153, 0.5)',
            tension: 0.4
        }]
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Metrics Cards */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-xs uppercase mb-1">P95 Latency</h3>
                    <div className="flex items-end">
                        <span className={`text-4xl font-bold ${isLatencyGood ? 'text-green-400' : 'text-red-400'}`}>
                            {data.p95Latency}
                        </span>
                        <span className="text-gray-500 ml-2 mb-1">ms</span>
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-xs uppercase mb-1">Throughput</h3>
                    <div className="flex items-end">
                        <span className="text-4xl font-bold text-blue-400">{data.throughput}</span>
                        <span className="text-gray-500 ml-2 mb-1">tok/s</span>
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-xs uppercase mb-1">TTFT</h3>
                    <div className="flex items-end">
                        <span className="text-4xl font-bold text-purple-400">{data.ttft}</span>
                        <span className="text-gray-500 ml-2 mb-1">ms</span>
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col items-center justify-center">
                    <h3 className="text-gray-400 text-xs uppercase mb-2">Grade</h3>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-2xl font-bold text-white">
                        {data.score}
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-white font-bold mb-4">Latency Trend</h3>
                    <Line options={chartOptions} data={latencyChartData} />
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-white font-bold mb-4">Throughput Trend</h3>
                    <Line options={chartOptions} data={{
                        labels: data.history.labels,
                        datasets: [{
                            label: 'Throughput (tok/s)',
                            data: data.history.throughput,
                            borderColor: '#60A5FA',
                            backgroundColor: 'rgba(96, 165, 250, 0.5)',
                            tension: 0.4
                        }]
                    }} />
                </div>
            </div>
        </div>
    );
};

const GovernanceView = () => {
    const data = MOCK_GOVERNANCE_DATA;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-xs uppercase">Active Proposals</h3>
                    <p className="text-3xl font-bold text-white mt-1">{data.activeProposals}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-xs uppercase">Last Anchored Block</h3>
                    <p className="text-xl font-mono text-yellow-400 mt-2 truncate">{data.lastAnchoredBlock}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-xs uppercase">Toxicity Flag Rate</h3>
                    <p className="text-3xl font-bold text-red-400 mt-1">{data.toxicityFlagRate}%</p>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                    <h3 className="font-bold text-white">Recent Activity</h3>
                </div>
                <div className="divide-y divide-gray-700">
                    {data.activity.map((item) => (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors">
                            <div className="flex items-center">
                                <span className="mr-3 text-xl">
                                    {item.type === 'vote' ? '🗳️' : item.type === 'anchor' ? '🔗' : '📜'}
                                </span>
                                <div>
                                    <p className="text-sm text-white">
                                        {item.type === 'vote' && <span><span className="font-bold text-blue-400">{item.user}</span> voted <span className="font-bold text-green-400">{item.action}</span> on {item.proposal}</span>}
                                        {item.type === 'anchor' && <span>Anchored block <span className="font-mono text-yellow-400">{item.hash}</span></span>}
                                        {item.type === 'proposal' && <span><span className="font-bold text-blue-400">{item.user}</span> created proposal: {item.title}</span>}
                                    </p>
                                    <p className="text-xs text-gray-500">{item.time}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PluginView = () => {
    const [plugins, setPlugins] = useState(MOCK_PLUGINS_DATA);
    const [reloading, setReloading] = useState(false);

    const handleReload = () => {
        setReloading(true);
        setTimeout(() => {
            setReloading(false);
            alert("Plugins reloaded successfully!");
        }, 1500);
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Installed Plugins</h2>
                <button
                    onClick={handleReload}
                    disabled={reloading}
                    className={`px-4 py-2 rounded font-medium transition-colors text-sm ${reloading
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                >
                    {reloading ? 'Reloading...' : 'Reload Plugins'}
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                            <th className="py-3 px-6">ID</th>
                            <th className="py-3 px-6">Type</th>
                            <th className="py-3 px-6">Version</th>
                            <th className="py-3 px-6">Executions</th>
                            <th className="py-3 px-6">Avg Time</th>
                            <th className="py-3 px-6">Success Rate</th>
                            <th className="py-3 px-6">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-300 divide-y divide-gray-700">
                        {plugins.map((plugin) => (
                            <tr key={plugin.id} className="hover:bg-gray-700/30 transition-colors">
                                <td className="py-4 px-6 font-mono text-sm font-medium text-white">{plugin.id}</td>
                                <td className="py-4 px-6 capitalize">
                                    <span className="px-2 py-1 rounded-full bg-gray-700 text-xs">
                                        {plugin.type}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-sm">{plugin.version}</td>
                                <td className="py-4 px-6 text-sm">{plugin.executions}</td>
                                <td className="py-4 px-6 text-sm">{plugin.avgTime}</td>
                                <td className="py-4 px-6 text-sm text-green-400">{plugin.successRate}</td>
                                <td className="py-4 px-6">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plugin.status === 'Active'
                                            ? 'bg-green-900/50 text-green-400'
                                            : 'bg-gray-700 text-gray-400'
                                        }`}>
                                        {plugin.status === 'Active' && <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>}
                                        {plugin.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Main Dashboard Component ---

const NS_LLM_Dashboard = () => {
    const [activeView, setActiveView] = useState('system');

    const renderActiveView = () => {
        switch (activeView) {
            case 'system': return <SystemOverview />;
            case 'performance': return <PerformanceView />;
            case 'governance': return <GovernanceView />;
            case 'plugins': return <PluginView />;
            default: return <SystemOverview />;
        }
    };

    const NavButton = ({ view, label, icon }) => (
        <button
            onClick={() => setActiveView(view)}
            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 font-medium ${activeView === view
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
        >
            <span className="mr-2">{icon}</span>
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                            NeuroSwarm Dashboard
                        </h1>
                        <p className="text-gray-500 mt-1">System Visualization & Control</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-wrap gap-2 bg-gray-800 p-1 rounded-xl border border-gray-700">
                        <NavButton view="system" label="Overview" icon="🖥️" />
                        <NavButton view="performance" label="Performance" icon="⚡" />
                        <NavButton view="governance" label="Governance" icon="⚖️" />
                        <NavButton view="plugins" label="Plugins" icon="🧩" />
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="transition-all duration-300 ease-in-out">
                    {renderActiveView()}
                </main>
            </div>
        </div>
    );
};

export default NS_LLM_Dashboard;

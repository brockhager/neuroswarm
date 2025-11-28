import { useState, useEffect } from 'react';
import { pluginLoader } from '../services/PluginLoader';

function PluginDashboard() {
    const [plugins, setPlugins] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            await pluginLoader.loadPlugins();
            setPlugins(pluginLoader.getComponents());
            setLoading(false);
        };
        load();
    }, []);

    if (loading) {
        return <div className="p-md text-center text-secondary">Loading extensions...</div>;
    }

    if (plugins.length === 0) {
        return (
            <div className="card text-center p-xl">
                <div className="text-4xl mb-md">🧩</div>
                <h2>No Extensions Active</h2>
                <p className="text-secondary">
                    Enable visualization plugins to see them here.
                </p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="flex justify-between items-center mb-lg">
                <h1>Dashboard Extensions</h1>
                <span className="badge badge-primary">{plugins.length} Active</span>
            </div>

            <div className="grid grid-cols-2 gap-lg">
                {plugins.map(plugin => (
                    <div key={plugin.id} className="card">
                        <div className="flex justify-between items-start mb-md">
                            <h3>{plugin.name}</h3>
                            <span className="text-xs text-muted">{plugin.id}</span>
                        </div>
                        <p className="text-sm text-secondary mb-lg">{plugin.description}</p>

                        {/* Placeholder for actual plugin widget rendering */}
                        <div className="bg-darker p-md rounded border border-white-10 text-center">
                            <span className="text-2xl">📊</span>
                            <p className="text-xs mt-sm text-muted">Widget Content Placeholder</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PluginDashboard;

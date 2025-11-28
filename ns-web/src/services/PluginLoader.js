/**
 * Plugin Loader Service
 * 
 * Handles dynamic loading of visualization plugins in the frontend.
 */

class PluginLoader {
    constructor() {
        this.plugins = new Map();
        this.components = new Map();
    }

    /**
     * Fetch and load enabled visualization plugins
     */
    async loadPlugins() {
        try {
            const response = await fetch('/api/plugins?type=visualization&enabled=true');
            const data = await response.json();

            if (!data.plugins) return;

            for (const plugin of data.plugins) {
                await this.loadPlugin(plugin);
            }

            return this.components;
        } catch (error) {
            console.error('Failed to load plugins:', error);
            return new Map();
        }
    }

    /**
     * Load a single plugin
     */
    async loadPlugin(plugin) {
        if (this.plugins.has(plugin.id)) return;

        try {
            // In a real implementation, we would load a JS bundle
            // For this prototype, we'll simulate loading by checking config
            console.log(`Loading plugin: ${plugin.name}`);

            // Register plugin metadata
            this.plugins.set(plugin.id, plugin);

            // If it's our example system-monitor, we register a placeholder component
            // In production, this would import() a module from the plugin's asset URL
            if (plugin.id === 'system-monitor') {
                // We'll handle the actual component rendering in the dashboard
                // by checking the registry
                this.components.set(plugin.id, {
                    id: plugin.id,
                    name: plugin.name,
                    description: plugin.description,
                    type: 'widget'
                });
            }
        } catch (error) {
            console.error(`Failed to load plugin ${plugin.id}:`, error);
        }
    }

    getComponents() {
        return Array.from(this.components.values());
    }
}

export const pluginLoader = new PluginLoader();

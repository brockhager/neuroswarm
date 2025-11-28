/**
 * Plugin Manager
 * 
 * Manages loading, registration, and execution of plugins for validators, scorers, and visualizations.
 * Enables community contributions through an extensible plugin architecture.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PluginManager {
    constructor(options = {}) {
        this.pluginsDir = options.pluginsDir || path.join(__dirname, '../../plugins');
        this.plugins = new Map();
        this.validators = new Map();
        this.scorers = new Map();
        this.visualizations = new Map();

        this.stats = {
            loaded: 0,
            failed: 0,
            enabled: 0,
            disabled: 0
        };
    }

    /**
     * Initialize plugin manager and discover plugins
     */
    async initialize() {
        console.log('[PluginManager] Initializing...');

        // Ensure plugins directory exists
        try {
            await fs.mkdir(this.pluginsDir, { recursive: true });
        } catch (err) {
            console.error('[PluginManager] Failed to create plugins directory:', err.message);
        }

        // Discover and load plugins
        await this.discoverPlugins();

        console.log(`[PluginManager] Initialized - Loaded: ${this.stats.loaded}, Failed: ${this.stats.failed}`);
    }

    /**
     * Discover plugins in the plugins directory
     */
    async discoverPlugins() {
        try {
            const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });

            for (const entry of entries) {
                if (!entry.isDirectory()) continue;

                const pluginDir = path.join(this.pluginsDir, entry.name);
                const manifestPath = path.join(pluginDir, 'plugin.json');

                try {
                    const manifestData = await fs.readFile(manifestPath, 'utf8');
                    const manifest = JSON.parse(manifestData);

                    await this.registerPlugin(manifest, pluginDir);
                } catch (err) {
                    console.error(`[PluginManager] Failed to load plugin ${entry.name}:`, err.message);
                    this.stats.failed++;
                }
            }
        } catch (err) {
            console.error('[PluginManager] Plugin discovery failed:', err.message);
        }
    }

    /**
     * Register a plugin
     * @param {Object} manifest - Plugin manifest
     * @param {string} pluginDir - Plugin directory path
     */
    async registerPlugin(manifest, pluginDir) {
        // Validate manifest
        this.validateManifest(manifest);

        // Load plugin code
        const entrypoint = path.join(pluginDir, manifest.entrypoint);
        const pluginModule = await import(`file://${entrypoint}`);
        const PluginClass = pluginModule.default;

        // Instantiate plugin
        const pluginInstance = new PluginClass(manifest.config || {});

        // Register by type
        const pluginId = manifest.id;

        switch (manifest.type) {
            case 'validator':
                this.validators.set(pluginId, pluginInstance);
                break;
            case 'scorer':
                this.scorers.set(pluginId, pluginInstance);
                break;
            case 'visualization':
                this.visualizations.set(pluginId, pluginInstance);
                break;
            default:
                throw new Error(`Unknown plugin type: ${manifest.type}`);
        }

        // Store plugin metadata
        this.plugins.set(pluginId, {
            manifest,
            instance: pluginInstance,
            enabled: true,
            loadedAt: Date.now()
        });

        this.stats.loaded++;
        this.stats.enabled++;

        console.log(`[PluginManager] Registered ${manifest.type}: ${pluginId} (${manifest.name} v${manifest.version})`);
    }

    /**
     * Validate plugin manifest
     */
    validateManifest(manifest) {
        const required = ['id', 'name', 'version', 'type', 'entrypoint'];

        for (const field of required) {
            if (!manifest[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        const validTypes = ['validator', 'scorer', 'visualization'];
        if (!validTypes.includes(manifest.type)) {
            throw new Error(`Invalid plugin type: ${manifest.type}. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate version format (semver)
        if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
            throw new Error(`Invalid version format: ${manifest.version}. Expected semver (e.g., 1.0.0)`);
        }
    }

    /**
     * Execute a validator plugin
     * @param {string} validatorId - Validator plugin ID
     * @param {string} text - Text to validate
     * @param {Object} context - Validation context
     */
    async executeValidator(validatorId, text, context = {}) {
        const plugin = this.validators.get(validatorId);

        if (!plugin) {
            throw new Error(`Validator plugin not found: ${validatorId}`);
        }

        const pluginMeta = this.plugins.get(validatorId);
        if (!pluginMeta.enabled) {
            throw new Error(`Validator plugin is disabled: ${validatorId}`);
        }

        try {
            const result = await plugin.validate(text, context);

            // Ensure result has required fields
            if (!result.status) {
                throw new Error('Validation result missing status field');
            }

            return {
                ...result,
                validator: validatorId,
                timestamp: Date.now()
            };
        } catch (err) {
            console.error(`[PluginManager] Validator ${validatorId} failed:`, err.message);
            return {
                status: 'error',
                message: `Plugin execution failed: ${err.message}`,
                validator: validatorId
            };
        }
    }

    /**
     * Execute a scorer plugin
     */
    async executeScorer(scorerId, data, context = {}) {
        const plugin = this.scorers.get(scorerId);

        if (!plugin) {
            throw new Error(`Scorer plugin not found: ${scorerId}`);
        }

        const pluginMeta = this.plugins.get(scorerId);
        if (!pluginMeta.enabled) {
            throw new Error(`Scorer plugin is disabled: ${scorerId}`);
        }

        return await plugin.score(data, context);
    }

    /**
     * List all plugins
     */
    listPlugins(type = null, enabledOnly = false) {
        let plugins = Array.from(this.plugins.entries()).map(([id, data]) => ({
            id,
            name: data.manifest.name,
            version: data.manifest.version,
            type: data.manifest.type,
            author: data.manifest.author,
            description: data.manifest.description,
            enabled: data.enabled,
            loadedAt: data.loadedAt
        }));

        if (type) {
            plugins = plugins.filter(p => p.type === type);
        }

        if (enabledOnly) {
            plugins = plugins.filter(p => p.enabled);
        }

        return plugins;
    }

    /**
    enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }

        if (!plugin.enabled) {
            plugin.enabled = true;
            this.stats.enabled++;
            this.stats.disabled--;
        }

        console.log(`[PluginManager] Enabled plugin: ${pluginId}`);
    }

    /**
     * Disable a plugin
     */
    disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }

        if (plugin.enabled) {
            plugin.enabled = false;
            this.stats.enabled--;
            this.stats.disabled++;
        }

        console.log(`[PluginManager] Disabled plugin: ${pluginId}`);
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            validators: this.validators.size,
            scorers: this.scorers.size,
            visualizations: this.visualizations.size
        };
    }

    /**
     * Reload all plugins
     */
    async reload() {
        console.log('[PluginManager] Reloading plugins...');

        // Clear existing plugins
        this.plugins.clear();
        this.validators.clear();
        this.scorers.clear();
        this.visualizations.clear();

        this.stats = {
            loaded: 0,
            failed: 0,
            enabled: 0,
            disabled: 0
        };

        // Rediscover
        await this.discoverPlugins();
    }
}

export default PluginManager;

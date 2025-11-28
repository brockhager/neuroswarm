import express from 'express';
import path from 'path';

export default function createPluginRouter(pluginManager) {
    const router = express.Router();

    // List all plugins
    router.get('/', (req, res) => {
        try {
            const type = req.query.type;
            const enabledOnly = req.query.enabled === 'true';
            const plugins = pluginManager.listPlugins(type, enabledOnly);
            res.json({ plugins, count: plugins.length });
        } catch (error) {
            res.status(500).json({ error: 'Failed to list plugins', details: error.message });
        }
    });

    // Get plugin details
    router.get('/:pluginId', (req, res) => {
        try {
            const plugin = pluginManager.getPlugin(req.params.pluginId);
            if (!plugin) {
                return res.status(404).json({ error: 'Plugin not found' });
            }
            res.json(plugin);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get plugin', details: error.message });
        }
    });

    // Execute validator plugin
    router.post('/validators/:validatorId/execute', async (req, res) => {
        try {
            const { validatorId } = req.params;
            const { text, context } = req.body;

            if (!text) {
                return res.status(400).json({ error: 'Missing required field: text' });
            }

            const result = await pluginManager.executeValidator(validatorId, text, context || {});
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: 'Validation failed', details: error.message });
        }
    });

    // Enable plugin
    router.post('/:pluginId/enable', (req, res) => {
        try {
            pluginManager.enablePlugin(req.params.pluginId);
            res.json({ success: true, message: 'Plugin enabled' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to enable plugin', details: error.message });
        }
    });

    // Disable plugin
    router.post('/:pluginId/disable', (req, res) => {
        try {
            pluginManager.disablePlugin(req.params.pluginId);
            res.json({ success: true, message: 'Plugin disabled' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to disable plugin', details: error.message });
        }
    });

    // Get plugin statistics
    router.get('/stats', (req, res) => {
        try {
            const stats = pluginManager.getStats();
            res.json(stats);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get stats', details: error.message });
        }
    });

    // Serve plugin assets
    router.use('/:pluginId/assets', (req, res, next) => {
        const pluginId = req.params.pluginId;
        const plugin = pluginManager.getPlugin(pluginId);

        if (!plugin) {
            return res.status(404).json({ error: 'Plugin not found' });
        }

        // Construct path to plugin directory
        // Note: In a real app, we'd want more robust path security here
        const pluginDir = path.dirname(plugin.manifestPath || ''); // We need to expose manifestPath in getPlugin

        if (!pluginDir) {
            // Fallback if manifestPath isn't available (should be added to PluginManager)
            // For now, assume standard structure if not provided
            return res.status(500).json({ error: 'Plugin path not resolved' });
        }

        const assetPath = path.join(pluginDir, 'assets');
        express.static(assetPath)(req, res, next);
    });

    // Reload all plugins
    router.post('/reload', async (req, res) => {
        try {
            await pluginManager.reload();
            res.json({ success: true, message: 'Plugins reloaded' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to reload plugins', details: error.message });
        }
    });

    return router;
}

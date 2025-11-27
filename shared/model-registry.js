/**
 * Model Registry Service
 * 
 * Manages available models, metadata, and model switching
 */

const fs = require('fs');
const path = require('path');

class ModelRegistry {
    constructor(modelsDir) {
        this.modelsDir = modelsDir || path.join(__dirname, '../../../NS-LLM/models');
        this.models = new Map();
        this.currentModel = null;
        this.loadModels();
    }

    /**
     * Load all models from the models directory
     */
    loadModels() {
        if (!fs.existsSync(this.modelsDir)) {
            console.warn(`[Model Registry] Models directory not found: ${this.modelsDir}`);
            return;
        }

        const entries = fs.readdirSync(this.modelsDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const modelPath = path.join(this.modelsDir, entry.name);
                const metadataPath = path.join(modelPath, 'metadata.json');

                if (fs.existsSync(metadataPath)) {
                    try {
                        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

                        // Find ONNX model file
                        const files = fs.readdirSync(modelPath);
                        const onnxFile = files.find(f => f.endsWith('.onnx'));

                        if (onnxFile) {
                            this.models.set(entry.name, {
                                key: entry.name,
                                path: path.join(modelPath, onnxFile),
                                tokenizerPath: modelPath,
                                metadata,
                                loaded: false
                            });

                            console.log(`[Model Registry] Registered: ${entry.name} (${metadata.params})`);
                        }
                    } catch (e) {
                        console.warn(`[Model Registry] Failed to load metadata for ${entry.name}:`, e.message);
                    }
                }
            }
        }

        // Set default model (gpt2 if available, otherwise first model)
        if (this.models.has('gpt2')) {
            this.currentModel = 'gpt2';
        } else if (this.models.size > 0) {
            this.currentModel = this.models.keys().next().value;
        }

        console.log(`[Model Registry] Loaded ${this.models.size} models`);
        if (this.currentModel) {
            console.log(`[Model Registry] Default model: ${this.currentModel}`);
        }
    }

    /**
     * Get list of all available models
     */
    listModels() {
        const models = [];
        for (const [key, model] of this.models) {
            models.push({
                key,
                params: model.metadata.params,
                contextLength: model.metadata.context_length,
                description: model.metadata.description,
                quantized: model.metadata.quantized,
                current: key === this.currentModel
            });
        }
        return models;
    }

    /**
     * Get model by key
     */
    getModel(key) {
        return this.models.get(key);
    }

    /**
     * Get current model
     */
    getCurrentModel() {
        return this.currentModel ? this.models.get(this.currentModel) : null;
    }

    /**
     * Switch to a different model
     */
    switchModel(key) {
        if (!this.models.has(key)) {
            throw new Error(`Model not found: ${key}`);
        }

        this.currentModel = key;
        console.log(`[Model Registry] Switched to model: ${key}`);
        return this.models.get(key);
    }

    /**
     * Get registry statistics
     */
    getStats() {
        return {
            totalModels: this.models.size,
            currentModel: this.currentModel,
            models: this.listModels()
        };
    }
}

module.exports = ModelRegistry;

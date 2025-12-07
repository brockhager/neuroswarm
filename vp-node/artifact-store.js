import fs from 'fs';
import path from 'path';

export class ArtifactStore {
    constructor() {
        this.dataDir = path.resolve(process.cwd(), '../data/artifacts');
        this.init();
    }

    init() {
        if (!fs.existsSync(this.dataDir)) {
            try {
                fs.mkdirSync(this.dataDir, { recursive: true });
                console.log(`[ArtifactStore] Created data directory: ${this.dataDir}`);
            } catch (err) {
                console.error(`[ArtifactStore] Failed to create directory: ${err.message}`);
            }
        }
    }

    getFilePath(id) {
        // Sanitize ID just in case
        const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
        return path.join(this.dataDir, `${safeId}.json`);
    }

    async save(id, data) {
        try {
            const filePath = this.getFilePath(id);
            const content = JSON.stringify(data, null, 2);
            await fs.promises.writeFile(filePath, content, 'utf8');
            return true;
        } catch (err) {
            console.error(`[ArtifactStore] Failed to save artifact ${id}:`, err.message);
            return false;
        }
    }

    async get(id) {
        try {
            const filePath = this.getFilePath(id);
            if (!fs.existsSync(filePath)) return null;
            const content = await fs.promises.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (err) {
            console.error(`[ArtifactStore] Failed to get artifact ${id}:`, err.message);
            return null;
        }
    }

    async update(id, updates) {
        try {
            const current = await this.get(id);
            if (!current) {
                console.warn(`[ArtifactStore] Cannot update - artifact ${id} not found`);
                return false;
            }

            const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
            return await this.save(id, updated);
        } catch (err) {
            console.error(`[ArtifactStore] Failed to update artifact ${id}:`, err.message);
            return false;
        }
    }
}

export default ArtifactStore;

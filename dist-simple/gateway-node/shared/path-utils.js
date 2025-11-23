import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the directory of the current module.
 * Safe for ESM and potentially bundled environments.
 */
export function getModuleDir(metaUrl) {
    try {
        return path.dirname(fileURLToPath(metaUrl));
    } catch (e) {
        return process.cwd();
    }
}

/**
 * Get the data directory.
 * Prefers process.env.NS_DATA_DIR, then a 'data' folder in cwd.
 * This avoids relying on relative paths from source files which break in binaries.
 */
export function getDataDir() {
    if (process.env.NS_DATA_DIR) {
        return path.resolve(process.env.NS_DATA_DIR);
    }
    // Default to ./data in the current working directory (where the binary is run)
    return path.join(process.cwd(), 'data');
}

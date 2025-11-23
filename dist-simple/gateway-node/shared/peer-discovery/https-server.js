/**
 * HTTPS Server Wrapper for NeuroSwarm Nodes
 * Add this to enable encrypted P2P communication
 * 
 * Usage: Import and call startHTTPSServer(app, port, nodeType, nodeId)
 */

import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Start HTTPS server alongside HTTP server
 * @param {Express} app - Express application
 * @param {number} httpPort - HTTP port (HTTPS will use httpPort + 1)
 * @param {string} nodeType - Node type (NS, Gateway, VP)
 * @param {string} nodeId - Node identifier
 * @returns {Promise<Server|null>} HTTPS server instance or null if disabled/failed
 */
export async function startHTTPSServer(app, httpPort, nodeType, nodeId) {
    const enableTLS = process.env.P2P_ENABLE_TLS !== 'false'; // Default: enabled

    if (!enableTLS) {
        console.log('[HTTPS] TLS encryption disabled (P2P_ENABLE_TLS=false)');
        return null;
    }

    try {
        const { CryptoManager } = await import('./crypto.js');

        const cryptoManager = new CryptoManager({
            nodeId: nodeId,
            nodeType: nodeType,
            certDir: path.join(__dirname, '../data/certs')
        });

        const tlsOptions = await cryptoManager.getTLSOptions();
        const httpsPort = parseInt(httpPort) + 1;

        const httpsServer = https.createServer(tlsOptions, app);

        return new Promise((resolve, reject) => {
            httpsServer.listen(httpsPort, () => {
                console.log(`[HTTPS] ${nodeType} node HTTPS server listening on port ${httpsPort}`);
                console.log(`[HTTPS] TLS encryption enabled`);
                resolve(httpsServer);
            });

            httpsServer.on('error', (err) => {
                console.error(`[HTTPS] Server error: ${err.message}`);
                console.log(`[HTTPS] Continuing with HTTP-only mode`);
                resolve(null);
            });
        });
    } catch (err) {
        console.error(`[HTTPS] Failed to start HTTPS server: ${err.message}`);
        console.log(`[HTTPS] Continuing with HTTP-only mode`);
        return null;
    }
}

/**
 * Get HTTPS URL for a peer
 * @param {string} host - Peer host
 * @param {number} port - Peer HTTP port
 * @param {boolean} supportsHttps - Whether peer supports HTTPS
 * @returns {string} Full URL (http:// or https://)
 */
export function getPeerURL(host, port, supportsHttps = false) {
    if (supportsHttps) {
        return `https://${host}:${port + 1}`;
    }
    return `http://${host}:${port}`;
}

/**
 * Get HTTPS agent for making requests to peers with self-signed certs
 * @returns {https.Agent}
 */
export function getHTTPSAgent() {
    return new https.Agent({
        rejectUnauthorized: false  // Accept self-signed certificates
    });
}

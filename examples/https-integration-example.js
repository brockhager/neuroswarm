/**
 * Example: How to add HTTPS to any NeuroSwarm node
 * 
 * This shows the minimal code needed to enable encrypted P2P communication
 */

import express from 'express';
import { PeerManager, P2PProtocol, startHTTPSServer } from '../shared/peer-discovery/index.js';

const app = express();
const PORT = process.env.PORT || 3009;

// Initialize peer discovery
const peerManager = new PeerManager({
    nodeType: 'NS',
    port: PORT,
    bootstrapPeers: process.env.BOOTSTRAP_PEERS || ''
});

const p2pProtocol = new P2PProtocol(peerManager);

// ... add your routes and middleware ...

// Start HTTP server
const httpServer = app.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
});

// ⭐ ADD THIS ONE LINE TO ENABLE HTTPS ⭐
startHTTPSServer(app, PORT, 'NS', peerManager.nodeId).then(httpsServer => {
    if (httpsServer) {
        console.log('✅ HTTPS encryption enabled');
    } else {
        console.log('ℹ️  Running in HTTP-only mode');
    }
});

// That's it! Your node now supports encrypted P2P communication.
// - HTTP runs on PORT (e.g., 3009)
// - HTTPS runs on PORT + 1 (e.g., 3010)
// - Certificates are auto-generated on first run
// - Both servers share the same Express app

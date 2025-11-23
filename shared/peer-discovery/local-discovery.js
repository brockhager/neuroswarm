import dgram from 'dgram';
import os from 'os';

const DISCOVERY_PORT = 19000;
const BROADCAST_INTERVAL = 5000; // 5 seconds

export class LocalDiscovery {
    constructor(options = {}) {
        this.nodeId = options.nodeId;
        this.port = options.port; // TCP port for the actual service
        this.type = options.type || 'NS';
        this.enabled = options.enabled !== false;

        this.socket = null;
        this.broadcastTimer = null;
        this.knownPeers = new Set();
        this.onPeerDiscovered = options.onPeerDiscovered || (() => { });
    }

    start() {
        if (!this.enabled) return;

        try {
            this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

            this.socket.on('error', (err) => {
                console.error(`[LocalDiscovery] Socket error:\n${err.stack}`);
                this.socket.close();
            });

            this.socket.on('message', (msg, rinfo) => {
                this.handleMessage(msg, rinfo);
            });

            this.socket.on('listening', () => {
                const address = this.socket.address();
                console.log(`[LocalDiscovery] Listening on ${address.address}:${address.port}`);
                this.socket.setBroadcast(true);
                this.startBroadcasting();
            });

            this.socket.bind(DISCOVERY_PORT);
        } catch (e) {
            console.error('[LocalDiscovery] Failed to start:', e);
        }
    }

    startBroadcasting() {
        this.broadcastTimer = setInterval(() => {
            this.broadcastPresence();
        }, BROADCAST_INTERVAL);
        this.broadcastPresence(); // Immediate broadcast
    }

    broadcastPresence() {
        if (!this.socket) return;

        const message = JSON.stringify({
            type: 'neuroswarm-discovery',
            nodeId: this.nodeId,
            servicePort: this.port,
            nodeType: this.type,
            timestamp: Date.now()
        });

        const buffer = Buffer.from(message);

        // Broadcast to local network
        this.socket.send(buffer, 0, buffer.length, DISCOVERY_PORT, '255.255.255.255', (err) => {
            if (err) console.error('[LocalDiscovery] Broadcast error:', err);
        });
    }

    handleMessage(msg, rinfo) {
        try {
            const data = JSON.parse(msg.toString());

            // Ignore non-neuroswarm messages
            if (data.type !== 'neuroswarm-discovery') return;

            // Ignore self
            if (data.nodeId === this.nodeId) return;

            // Construct peer address
            const peerAddress = `${rinfo.address}:${data.servicePort}`;

            // Notify if new
            if (!this.knownPeers.has(peerAddress)) {
                this.knownPeers.add(peerAddress);
                console.log(`[LocalDiscovery] Found peer: ${peerAddress} (${data.nodeType})`);
                this.onPeerDiscovered({
                    id: data.nodeId,
                    address: peerAddress,
                    type: data.nodeType
                });
            }
        } catch (e) {
            // Ignore malformed messages
        }
    }

    stop() {
        if (this.broadcastTimer) clearInterval(this.broadcastTimer);
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

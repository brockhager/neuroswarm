/**
 * NAT Traversal - STUN Client for Public IP Discovery
 * Implements RFC 5389 (STUN) for NAT traversal
 * 
 * Enables nodes behind NAT/firewalls to discover their public IP and port
 */

import dgram from 'dgram';
import crypto from 'crypto';

/**
 * STUN Message Types
 */
const STUN_BINDING_REQUEST = 0x0001;
const STUN_BINDING_RESPONSE = 0x0101;

/**
 * STUN Attributes
 */
const STUN_ATTR_MAPPED_ADDRESS = 0x0001;
const STUN_ATTR_XOR_MAPPED_ADDRESS = 0x0020;

/**
 * STUN Magic Cookie (RFC 5389)
 */
const STUN_MAGIC_COOKIE = 0x2112A442;

/**
 * NATTraversal - Discovers public IP/port using STUN
 */
export class NATTraversal {
    constructor(options = {}) {
        this.localPort = options.localPort || 0; // 0 = random port
        this.stunServers = options.stunServers || [
            'stun.l.google.com:19302',
            'stun1.l.google.com:19302',
            'stun2.l.google.com:19302',
            'stun3.l.google.com:19302'
        ];

        this.publicIP = null;
        this.publicPort = null;
        this.natType = null;
        this.lastRefresh = null;

        this.refreshInterval = options.refreshInterval || 300000; // 5 minutes
        this.refreshTimer = null;

        this.enabled = options.enabled !== false; // Default: enabled
    }

    /**
     * Discover public IP and port using STUN
     */
    async discoverPublicAddress() {
        if (!this.enabled) {
            console.log('[NAT] NAT traversal disabled');
            return null;
        }

        for (const server of this.stunServers) {
            try {
                const [host, port] = server.split(':');
                const result = await this.sendSTUNRequest(host, parseInt(port));

                if (result) {
                    this.publicIP = result.ip;
                    this.publicPort = result.port;
                    this.lastRefresh = new Date();

                    console.log(`[NAT] Public address discovered: ${this.publicIP}:${this.publicPort} via ${server}`);
                    return result;
                }
            } catch (err) {
                console.log(`[NAT] STUN server ${server} failed: ${err.message}`);
                continue; // Try next server
            }
        }

        console.log('[NAT] All STUN servers failed');
        return null;
    }

    /**
     * Send STUN binding request and parse response
     */
    async sendSTUNRequest(host, port) {
        return new Promise((resolve, reject) => {
            const socket = dgram.createSocket('udp4');
            const transactionId = crypto.randomBytes(12);

            // Create STUN binding request
            const request = this.createSTUNBindingRequest(transactionId);

            const timeout = setTimeout(() => {
                socket.close();
                reject(new Error('STUN request timeout'));
            }, 5000);

            socket.on('message', (msg) => {
                clearTimeout(timeout);

                try {
                    const response = this.parseSTUNResponse(msg, transactionId);
                    socket.close();

                    if (response) {
                        resolve(response);
                    } else {
                        reject(new Error('Invalid STUN response'));
                    }
                } catch (err) {
                    socket.close();
                    reject(err);
                }
            });

            socket.on('error', (err) => {
                clearTimeout(timeout);
                socket.close();
                reject(err);
            });

            // Send STUN request
            socket.send(request, port, host, (err) => {
                if (err) {
                    clearTimeout(timeout);
                    socket.close();
                    reject(err);
                }
            });
        });
    }

    /**
     * Create STUN binding request (RFC 5389)
     */
    createSTUNBindingRequest(transactionId) {
        const buffer = Buffer.alloc(20);

        // Message Type: Binding Request (0x0001)
        buffer.writeUInt16BE(STUN_BINDING_REQUEST, 0);

        // Message Length: 0 (no attributes)
        buffer.writeUInt16BE(0, 2);

        // Magic Cookie
        buffer.writeUInt32BE(STUN_MAGIC_COOKIE, 4);

        // Transaction ID (12 bytes)
        transactionId.copy(buffer, 8);

        return buffer;
    }

    /**
     * Parse STUN binding response
     */
    parseSTUNResponse(buffer, expectedTransactionId) {
        if (buffer.length < 20) {
            throw new Error('STUN response too short');
        }

        // Verify message type
        const messageType = buffer.readUInt16BE(0);
        if (messageType !== STUN_BINDING_RESPONSE) {
            throw new Error('Not a STUN binding response');
        }

        // Verify magic cookie
        const magicCookie = buffer.readUInt32BE(4);
        if (magicCookie !== STUN_MAGIC_COOKIE) {
            throw new Error('Invalid magic cookie');
        }

        // Verify transaction ID
        const transactionId = buffer.slice(8, 20);
        if (!transactionId.equals(expectedTransactionId)) {
            throw new Error('Transaction ID mismatch');
        }

        // Parse attributes
        const messageLength = buffer.readUInt16BE(2);
        let offset = 20;

        while (offset < 20 + messageLength) {
            const attrType = buffer.readUInt16BE(offset);
            const attrLength = buffer.readUInt16BE(offset + 2);
            const attrValue = buffer.slice(offset + 4, offset + 4 + attrLength);

            // XOR-MAPPED-ADDRESS (preferred)
            if (attrType === STUN_ATTR_XOR_MAPPED_ADDRESS) {
                return this.parseXorMappedAddress(attrValue, transactionId);
            }

            // MAPPED-ADDRESS (fallback)
            if (attrType === STUN_ATTR_MAPPED_ADDRESS) {
                return this.parseMappedAddress(attrValue);
            }

            // Move to next attribute (with padding)
            offset += 4 + attrLength;
            offset += (4 - (attrLength % 4)) % 4; // Padding to 4-byte boundary
        }

        return null;
    }

    /**
     * Parse XOR-MAPPED-ADDRESS attribute
     */
    parseXorMappedAddress(buffer, transactionId) {
        const family = buffer.readUInt8(1);
        if (family !== 0x01) { // IPv4
            return null;
        }

        // XOR port with first 16 bits of magic cookie
        const xorPort = buffer.readUInt16BE(2);
        const port = xorPort ^ (STUN_MAGIC_COOKIE >> 16);

        // XOR IP with magic cookie
        const xorIP = buffer.readUInt32BE(4);
        const ip = xorIP ^ STUN_MAGIC_COOKIE;

        const ipAddress = [
            (ip >> 24) & 0xFF,
            (ip >> 16) & 0xFF,
            (ip >> 8) & 0xFF,
            ip & 0xFF
        ].join('.');

        return { ip: ipAddress, port };
    }

    /**
     * Parse MAPPED-ADDRESS attribute
     */
    parseMappedAddress(buffer) {
        const family = buffer.readUInt8(1);
        if (family !== 0x01) { // IPv4
            return null;
        }

        const port = buffer.readUInt16BE(2);
        const ip = buffer.readUInt32BE(4);

        const ipAddress = [
            (ip >> 24) & 0xFF,
            (ip >> 16) & 0xFF,
            (ip >> 8) & 0xFF,
            ip & 0xFF
        ].join('.');

        return { ip: ipAddress, port };
    }

    /**
     * Detect NAT type (simplified)
     */
    async detectNATType() {
        // Simplified NAT detection
        // Full implementation would require multiple STUN requests
        // For now, return 'unknown' - can be enhanced later

        if (!this.publicIP) {
            await this.discoverPublicAddress();
        }

        if (!this.publicIP) {
            return 'unknown';
        }

        // Basic detection: if we got a public IP, assume port-restricted
        // Full detection requires multiple tests (RFC 3489)
        this.natType = 'port-restricted';
        return this.natType;
    }

    /**
     * Start periodic refresh of public address
     */
    startPeriodicRefresh() {
        if (!this.enabled) {
            return;
        }

        // Initial discovery
        this.discoverPublicAddress();

        // Periodic refresh
        this.refreshTimer = setInterval(async () => {
            console.log('[NAT] Refreshing public address...');
            await this.discoverPublicAddress();
        }, this.refreshInterval);

        console.log(`[NAT] Periodic refresh enabled (every ${this.refreshInterval / 1000}s)`);
    }

    /**
     * Stop periodic refresh
     */
    stopPeriodicRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('[NAT] Periodic refresh stopped');
        }
    }

    /**
     * Get current public address
     */
    getPublicAddress() {
        return {
            ip: this.publicIP,
            port: this.publicPort,
            natType: this.natType,
            lastRefresh: this.lastRefresh
        };
    }

    /**
     * Check if behind NAT
     */
    isBehindNAT(localIP) {
        if (!this.publicIP) {
            return false;
        }

        // If public IP differs from local IP, we're behind NAT
        return this.publicIP !== localIP;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopPeriodicRefresh();
    }
}

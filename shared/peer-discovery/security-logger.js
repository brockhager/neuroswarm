import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Security Logger - Logs security events to the governance timeline
 * Provides an audit trail for security-related actions and violations
 */
export class SecurityLogger {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.dataDir = options.dataDir || path.join(__dirname, '../data');
        this.timelineFile = options.timelineFile || path.join(this.dataDir, 'governance-timeline.jsonl');
        this.snapshotInterval = options.snapshotInterval || 3600000; // 1 hour
        this.contributorId = options.contributorId || 'system';

        // Ensure data directory exists
        if (this.enabled && !fs.existsSync(this.dataDir)) {
            try {
                fs.mkdirSync(this.dataDir, { recursive: true });
            } catch (err) {
                console.error('[SecurityLogger] Failed to create data directory:', err.message);
                this.enabled = false;
            }
        }

        // Start periodic snapshots if enabled
        if (this.enabled && options.enableSnapshots !== false) {
            this.startSnapshotTimer();
        }
    }

    /**
     * Log a security event
     * @param {string} eventType - Type of event (e.g., INVALID_SIGNATURE, RATE_LIMIT)
     * @param {string} peerId - ID of the peer involved
     * @param {object} details - Additional details about the event
     */
    logSecurityEvent(eventType, peerId, details = {}) {
        if (!this.enabled) return;

        const event = {
            timestamp: Date.now(),
            type: 'SECURITY_EVENT',
            eventType,
            peerId,
            contributorId: this.contributorId,
            details,
            severity: this.getSeverity(eventType)
        };

        this.appendToTimeline(event);
    }

    /**
     * Log a security snapshot (periodic summary)
     * @param {object} stats - Statistics to include in the snapshot
     */
    logSecuritySnapshot(stats) {
        if (!this.enabled) return;

        const snapshot = {
            timestamp: Date.now(),
            type: 'SECURITY_SNAPSHOT',
            contributorId: this.contributorId,
            stats
        };

        this.appendToTimeline(snapshot);
    }

    /**
     * Append an event to the timeline file
     * @param {object} event - Event object to log
     */
    appendToTimeline(event) {
        try {
            const line = JSON.stringify(event) + '\n';
            fs.appendFileSync(this.timelineFile, line);
        } catch (err) {
            console.error('[SecurityLogger] Failed to write to timeline:', err.message);
        }
    }

    /**
     * Get severity level for an event type
     * @param {string} eventType 
     * @returns {string} HIGH, MEDIUM, or LOW
     */
    getSeverity(eventType) {
        const highSeverity = [
            'INVALID_SIGNATURE',
            'REPLAY_ATTACK',
            'INVALID_CERTIFICATE',
            'PEER_BANNED'
        ];

        const mediumSeverity = [
            'RATE_LIMIT_EXCEEDED',
            'MISSING_CERTIFICATE',
            'EXPIRED_CERTIFICATE'
        ];

        if (highSeverity.includes(eventType)) return 'HIGH';
        if (mediumSeverity.includes(eventType)) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Start the periodic snapshot timer
     * Note: Actual stats collection needs to be injected or provided via callback
     * This is a placeholder for the timer mechanism
     */
    startSnapshotTimer() {
        // In a real implementation, we would need a way to gather stats from other modules
        // For now, we'll rely on the main application to call logSecuritySnapshot
    }
}

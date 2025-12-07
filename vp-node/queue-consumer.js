import fs from 'fs';
import path from 'path';
import ArtifactStore from './artifact-store.js';

export class QueueConsumer {
    constructor(config = {}) {
        this.config = config;
        this.dataDir = path.resolve(process.cwd(), '../data');
        this.queueFile = path.join(this.dataDir, 'queue.jsonl');
        this.isRunning = false;
        this.currentPosition = 0;
        this.checkInterval = 1000; // Poll every 1s
        this.processing = false;
        this.artifactStore = new ArtifactStore();
    }

    async start() {
        console.log(`[QueueConsumer] Starting... watching ${this.queueFile}`);
        // If file exists, start from the end to avoid re-processing old messages (unless configured otherwise)
        try {
            if (fs.existsSync(this.queueFile)) {
                const stats = fs.statSync(this.queueFile);
                this.currentPosition = stats.size;
                console.log(`[QueueConsumer] Caught up. Starting read from byte ${this.currentPosition}`);
            }
        } catch (e) {
            console.warn('[QueueConsumer] Queue file check failed', e.message);
        }

        this.isRunning = true;
        this.poll();
    }

    async poll() {
        if (!this.isRunning) return;

        if (this.processing) {
            setTimeout(() => this.poll(), this.checkInterval);
            return;
        }

        this.processing = true;

        try {
            if (fs.existsSync(this.queueFile)) {
                const stats = fs.statSync(this.queueFile);
                if (stats.size > this.currentPosition) {
                    // New data found
                    const stream = fs.createReadStream(this.queueFile, {
                        start: this.currentPosition,
                        end: stats.size
                    });

                    let chunk = '';
                    for await (const buffer of stream) {
                        chunk += buffer.toString();
                    }

                    // Update position for next time
                    this.currentPosition = stats.size;

                    // Process lines
                    const lines = chunk.split('\n').filter(line => line.trim().length > 0);
                    for (const line of lines) {
                        try {
                            const msg = JSON.parse(line);
                            await this.processMessage(msg);
                        } catch (err) {
                            console.error('[QueueConsumer] Failed to parse message line:', err.message);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[QueueConsumer] Polling error:', err.message);
        } finally {
            this.processing = false;
            setTimeout(() => this.poll(), this.checkInterval);
        }
    }

    async processMessage(msg) {
        // Logic for CN-13-A: Consume, Validate, Log
        const { id, type, payload, timestamp } = msg;

        console.log(`\n📥 [QueueConsumer] Received Artifact:`);
        console.log(`   ID: ${id}`);
        console.log(`   Type: ${type}`);
        console.log(`   Timestamp: ${timestamp}`);

        if (msg.topic === 'artifact-submissions') {
            const artifact = payload;
            console.log(`   Title: ${artifact?.metadata?.title || 'Untitled'}`);
            console.log(`   Validating artifact content length... ${artifact?.content?.length || 0} chars`);

            // Simulate validation
            if (!artifact || !artifact.content) {
                console.error(`❌ [QueueConsumer] Validation Failed: Missing content`);
                return;
            }

            console.log(`✅ [QueueConsumer] Validation Passed. Persisting...`);

            const success = await this.artifactStore.save(id, {
                id,
                type,
                payload: artifact,
                metadata: msg.metadata || {},
                status: 'RECEIVED',
                receivedAt: new Date().toISOString()
            });

            if (success) {
                console.log(`💾 [QueueConsumer] Persisted artifact ${id} to disk`);

                // CN-13-C: Mock Processing
                this.simulateProcessing(id, artifact);
            } else {
                console.error(`❌ [QueueConsumer] Failed to persist artifact ${id}`);
            }
        }
    }

    // CN-13-C: Simulate processing delay and result generation
    async simulateProcessing(id, artifact) {
        console.log(`⚙️  [Processing] Started for ${id}... (4s simulation)`);

        // Simulate non-blocking work but block poller logic for simplicity (or use await)
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Generate mock critique
        const critique = `Mock critique for "${artifact.metadata?.title}": Structure is sound. Content logic is valid. Generated at ${new Date().toISOString()}`;

        const updates = {
            status: 'COMPLETED',
            critique,
            completedAt: new Date().toISOString(),
            score: Math.floor(Math.random() * 10) + 1
        };

        const updated = await this.artifactStore.update(id, updates);

        if (updated) {
            console.log(`✅ [Processing] Completed for ${id}. result saved.`);
            // CN-14-A: Notification
            this.sendNotification(id, updates);
        } else {
            console.error(`❌ [Processing] Failed to update status for ${id}`);
        }
    }

    // CN-14-A: Mock WebSocket Notification
    sendNotification(id, result) {
        console.log(`🔔 [NotificationService] Sending update to client for ${id}...`);
        // In real implementation: ws.send(...)
        console.log(`   Event: STATUS_UPDATE`);
        console.log(`   Payload: ${JSON.stringify({ id, status: result.status })}`);
        console.log(`📡 [NotificationService] Sent.`);
    }

    stop() {
        console.log('[QueueConsumer] Stopping...');
        this.isRunning = false;
    }
}

// Export singleton or class
export default QueueConsumer;

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
        // For this dev setup, we'll start from the beginning if the file is small, or just seek to end.
        // Actually, persistence means we *should* process old messages if we crashed. 
        // But for simplicity/spam prevention in this demo, let's start from current size.
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
                metadata: msg.metadata || {}, // preserve queue metadata
                status: 'RECEIVED',
                receivedAt: new Date().toISOString()
            });

            if (success) {
                console.log(`💾 [QueueConsumer] Persisted artifact ${id} to disk`);
            } else {
                console.error(`❌ [QueueConsumer] Failed to persist artifact ${id}`);
            }
        }
    }

    stop() {
        console.log('[QueueConsumer] Stopping...');
        this.isRunning = false;
    }
}

// Export singleton or class
export default QueueConsumer;

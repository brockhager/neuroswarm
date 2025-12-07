/**
 * QueueService
 * 
 * Handles asynchronous message passing between the API Gateway and the VP Swarm.
 * Currently uses a mock implementation, but allows for swapping in Kafka/RabbitMQ.
 */

export interface QueueConfig {
    type: 'mock' | 'kafka' | 'rabbitmq';
    connectionString?: string;
}

export interface QueueMessage {
    id: string;
    type: string;
    payload: any;
    timestamp: string;
    metadata?: Record<string, any>;
}

export class QueueService {
    private config: QueueConfig;

    constructor(config: QueueConfig = { type: 'mock' }) {
        this.config = config;
        console.log(`🔌 QueueService initialized with type: ${config.type}`);
    }

    /**
     * Publishes a message to a specific topic/queue
     * @param topic The topic or queue name (e.g., 'artifact-submissions')
     * @param message The message payload to send
     * @returns Promise<boolean> True if published successfully
     */
    async publish(topic: string, message: QueueMessage): Promise<boolean> {
        try {
            if (this.config.type === 'mock') {
                return this.mockPublish(topic, message);
            }

            // Future implementations for Kafka/RabbitMQ would go here
            throw new Error(`Queue type ${this.config.type} not implemented yet`);
        } catch (error) {
            console.error(`❌ Failed to publish to ${topic}:`, error);
            return false;
        }
    }

    private async mockPublish(topic: string, message: QueueMessage): Promise<boolean> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));

        console.log(`\n📨 [Mock Queue] Published to '${topic}':`);
        console.log(JSON.stringify(message, null, 2));

        return true;
    }

    /**
     * Connects to the queue infrastructure
     */
    async connect(): Promise<void> {
        if (this.config.type === 'mock') {
            console.log('✅ Mock queue connected');
            return;
        }
        // Real connection logic would go here
    }
}

// Export singleton instance
export const queueService = new QueueService();

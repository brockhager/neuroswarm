import QueueConsumer from './queue-consumer.js';

console.log('Testing QueueConsumer...');
try {
    const consumer = new QueueConsumer();
    await consumer.start();
    console.log('Consumer started. listening for 15 seconds...');

    // Wait a bit to let it poll
    await new Promise(r => setTimeout(r, 15000));

    consumer.stop();
    console.log('Consumer stopped.');
} catch (e) {
    console.error('Test failed:', e);
}

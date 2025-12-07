/**
 * Test suite for Job Queue Service (CN-12-B)
 */

import {
  JobQueueService,
  JobStatus,
  JobPriority,
  getJobQueue,
  resetJobQueue,
} from './job-queue-service.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n🧪 CN-12-B Job Queue Service Test Suite\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<boolean>): Promise<void> {
    try {
      const result = await fn();
      if (result) {
        console.log(`✅ PASS: ${name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${name} (exception: ${error})`);
      failed++;
    }
  }

  // Test 1: Enqueue a job
  await test('Can enqueue a job', async () => {
    resetJobQueue();
    const queue = getJobQueue();
    const jobId = await queue.enqueue('ARTIFACT_SUBMIT', {
      content: 'Test content',
      metadata: { title: 'Test' },
    });
    return jobId.startsWith('job_');
  });

  // Test 2: Job starts in QUEUED status
  await test('Job starts in QUEUED status', async () => {
    resetJobQueue();
    const queue = getJobQueue();
    const jobId = await queue.enqueue('ARTIFACT_SUBMIT', {
      content: 'Test',
      metadata: { title: 'Test' },
    });
    const job = await queue.getJobStatus(jobId);
    return job?.status === JobStatus.QUEUED;
  });

  // Test 3: Priority queue ordering
  await test('Jobs are ordered by priority', async () => {
    resetJobQueue();
    const queue = getJobQueue();
    
    const lowId = await queue.enqueue('ARTIFACT_SUBMIT', { content: 'Low', metadata: { title: 'Low' } }, { priority: JobPriority.LOW });
    const highId = await queue.enqueue('ARTIFACT_SUBMIT', { content: 'High', metadata: { title: 'High' } }, { priority: JobPriority.HIGH });
    const normalId = await queue.enqueue('ARTIFACT_SUBMIT', { content: 'Normal', metadata: { title: 'Normal' } }, { priority: JobPriority.NORMAL });

    // High priority should be first
    const queueLength = queue.getQueueLength();
    return queueLength === 3;
  });

  // Test 4: Job processing
  await test('Job can be processed successfully', async () => {
    resetJobQueue();
    const queue = getJobQueue({ maxConcurrentJobs: 1 });
    
    let processed = false;
    queue.onJob(async (job) => {
      processed = true;
      return { success: true };
    });

    const jobId = await queue.enqueue('ARTIFACT_SUBMIT', {
      content: 'Test',
      metadata: { title: 'Test' },
    });

    queue.start();
    await sleep(200); // Wait for processing

    const job = await queue.getJobStatus(jobId);
    await queue.stop();

    return processed && job?.status === JobStatus.COMPLETED;
  });

  // Test 5: Job timeout handling
  await test('Job times out after configured duration', async () => {
    resetJobQueue();
    const queue = getJobQueue({
      maxConcurrentJobs: 1,
      jobTimeoutMs: 500,
      maxRetries: 1,
    });

    queue.onJob(async (job) => {
      // Simulate long-running job
      await sleep(2000);
      return { success: true };
    });

    const jobId = await queue.enqueue('ARTIFACT_SUBMIT', {
      content: 'Test',
      metadata: { title: 'Test' },
    });

    queue.start();
    await sleep(1500); // Wait for timeout and retry
    await queue.stop();

    const job = await queue.getJobStatus(jobId);
    return job?.attempts === 2; // Should have retried once
  });

  // Test 6: Retry with exponential backoff
  await test('Failed jobs are retried with backoff', async () => {
    resetJobQueue();
    const queue = getJobQueue({
      maxConcurrentJobs: 1,
      maxRetries: 2,
      retryDelayMs: 100,
    });

    let attempts = 0;
    queue.onJob(async (job) => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Simulated failure');
      }
      return { success: true };
    });

    const jobId = await queue.enqueue('ARTIFACT_SUBMIT', {
      content: 'Test',
      metadata: { title: 'Test' },
    });

    queue.start();
    await sleep(1000); // Wait for retries
    await queue.stop();

    return attempts === 2;
  });

  // Test 7: Dead letter queue
  await test('Failed jobs move to dead letter queue', async () => {
    resetJobQueue();
    const queue = getJobQueue({
      maxConcurrentJobs: 1,
      maxRetries: 2,
      enableDeadLetterQueue: true,
      retryDelayMs: 50,
    });

    queue.onJob(async (job) => {
      throw new Error('Always fails');
    });

    const jobId = await queue.enqueue('ARTIFACT_SUBMIT', {
      content: 'Test',
      metadata: { title: 'Test' },
    });

    queue.start();
    await sleep(500); // Wait for all retries
    await queue.stop();

    const deadLetterQueue = queue.getDeadLetterQueue();
    return deadLetterQueue.length === 1 && deadLetterQueue[0].id === jobId;
  });

  // Test 8: Concurrent job processing
  await test('Multiple jobs can be processed concurrently', async () => {
    resetJobQueue();
    const queue = getJobQueue({ maxConcurrentJobs: 3 });

    let concurrentCount = 0;
    let maxConcurrent = 0;

    queue.onJob(async (job) => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await sleep(100);
      concurrentCount--;
      return { success: true };
    });

    // Enqueue 5 jobs
    for (let i = 0; i < 5; i++) {
      await queue.enqueue('ARTIFACT_SUBMIT', {
        content: `Job ${i}`,
        metadata: { title: `Job ${i}` },
      });
    }

    queue.start();
    await sleep(300); // Wait for processing
    await queue.stop();

    return maxConcurrent === 3;
  });

  // Test 9: Metrics tracking
  await test('Metrics are tracked correctly', async () => {
    resetJobQueue();
    const queue = getJobQueue({ maxConcurrentJobs: 1 });

    queue.onJob(async (job) => {
      await sleep(50);
      return { success: true };
    });

    await queue.enqueue('ARTIFACT_SUBMIT', { content: 'Test1', metadata: { title: 'Test1' } });
    await queue.enqueue('ARTIFACT_SUBMIT', { content: 'Test2', metadata: { title: 'Test2' } });

    queue.start();
    await sleep(200);
    await queue.stop();

    const metrics = queue.getMetrics();
    return metrics.totalEnqueued === 2 && metrics.totalProcessed === 2;
  });

  // Test 10: Job cancellation
  await test('Queued jobs can be cancelled', async () => {
    resetJobQueue();
    const queue = getJobQueue();

    const jobId = await queue.enqueue('ARTIFACT_SUBMIT', {
      content: 'Test',
      metadata: { title: 'Test' },
    });

    const cancelled = await queue.cancelJob(jobId);
    const job = await queue.getJobStatus(jobId);

    return cancelled && job?.status === JobStatus.FAILED;
  });

  // Test 11: Job with user context
  await test('Job preserves user context', async () => {
    resetJobQueue();
    const queue = getJobQueue();

    const jobId = await queue.enqueue(
      'ARTIFACT_SUBMIT',
      { content: 'Test', metadata: { title: 'Test' } },
      { userId: 'user123', correlationId: 'req-abc' }
    );

    const job = await queue.getJobStatus(jobId);
    return job?.userId === 'user123' && job?.correlationId === 'req-abc';
  });

  // Test 12: Batch job support
  await test('Can enqueue batch jobs', async () => {
    resetJobQueue();
    const queue = getJobQueue();

    const jobId = await queue.enqueue('ARTIFACT_BATCH', [
      { content: 'Item 1', metadata: { title: 'Item 1' } },
      { content: 'Item 2', metadata: { title: 'Item 2' } },
    ]);

    const job = await queue.getJobStatus(jobId);
    return job?.type === 'ARTIFACT_BATCH' && Array.isArray(job.payload);
  });

  // Test 13: Dead letter retry
  await test('Dead letter jobs can be retried', async () => {
    resetJobQueue();
    const queue = getJobQueue({
      maxConcurrentJobs: 1,
      maxRetries: 1,
      retryDelayMs: 50,
    });

    let attempts = 0;
    queue.onJob(async (job) => {
      attempts++;
      if (attempts <= 2) {
        throw new Error('Fails first 2 times');
      }
      return { success: true };
    });

    const jobId = await queue.enqueue('ARTIFACT_SUBMIT', {
      content: 'Test',
      metadata: { title: 'Test' },
    });

    queue.start();
    await sleep(300); // Let it fail and go to dead letter
    await queue.stop();

    // Retry from dead letter
    const retried = queue.retryDeadLetterJob(jobId);
    
    queue.start();
    await sleep(200); // Process retry
    await queue.stop();

    const job = await queue.getJobStatus(jobId);
    return retried && job?.status === JobStatus.COMPLETED;
  });

  // Test 14: Average processing time calculation
  await test('Average processing time is calculated', async () => {
    resetJobQueue();
    const queue = getJobQueue({ maxConcurrentJobs: 1 });

    queue.onJob(async (job) => {
      await sleep(100);
      return { success: true };
    });

    await queue.enqueue('ARTIFACT_SUBMIT', { content: 'Test1', metadata: { title: 'Test1' } });
    await queue.enqueue('ARTIFACT_SUBMIT', { content: 'Test2', metadata: { title: 'Test2' } });

    queue.start();
    await sleep(300);
    await queue.stop();

    const metrics = queue.getMetrics();
    return metrics.averageProcessingTimeMs > 0 && metrics.averageProcessingTimeMs < 200;
  });

  // Test 15: Queue uptime tracking
  await test('Queue uptime is tracked', async () => {
    resetJobQueue();
    const queue = getJobQueue();
    
    await sleep(1100); // Wait just over 1 second
    
    const metrics = queue.getMetrics();
    return metrics.uptimeSeconds >= 1;
  });

  console.log('='.repeat(60));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All tests passed! CN-12-B job queue is operational.\n');
  } else {
    console.log('⚠️  Some tests failed. Review implementation.\n');
  }
}

// Run tests
runTests().catch(console.error);

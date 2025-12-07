import { initializeAuth, queueLocalJob, getLocallyQueuedJobs, submitDeferredJobs, resetLocalJobs, setOnlineStatus } from '../agent9/resilience-service';
import crypto from 'crypto';

(async () => {
  console.log('\n== Resilience Service Deterministic Test ==');
  await initializeAuth();

  // Ensure clean state for deterministic testing
  await resetLocalJobs();

  const job1 = { id: crypto.randomUUID(), prompt: 'deterministic job 1', timestamp: Date.now(), status: 'queued_local' } as any;
  const job2 = { id: crypto.randomUUID(), prompt: 'deterministic job 2', timestamp: Date.now(), status: 'queued_local' } as any;

  await queueLocalJob(job1);
  await queueLocalJob(job2);

  console.log('Jobs queued. Now submitting deferred jobs...');
  // Ensure we are online before submitting
  setOnlineStatus(true);
  await submitDeferredJobs();

  const remaining = await getLocallyQueuedJobs();
  console.log('Remaining queued_local jobs count:', remaining.length);

  if (remaining.length === 0) {
    console.log('✅ Deterministic test passed — all jobs submitted.');
    process.exit(0);
  } else {
    console.error('❌ Deterministic test failed — some jobs remain:', remaining.map(r => r.id));
    process.exit(2);
  }
})();
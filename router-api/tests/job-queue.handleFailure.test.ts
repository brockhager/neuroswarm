import { JobQueueService } from '../src/services/job-queue';

// We'll mock the internal pool.query used by JobQueueService to exercise handleFailure
describe('JobQueueService.handleFailure', () => {
  test('increments retry_count and requeues when under maxRetries', async () => {
    const svc = new JobQueueService();

    // Mock pool.query behavior with jest mocking
    // We replace the internal pool with a mock object
    // @ts-ignore - assign private for test
    svc['pool'] = {
      query: jest.fn()
        // First call: SELECT FOR UPDATE returns a row with retry_count = 0
        .mockResolvedValueOnce({ rows: [{ id: 'job-1', retry_count: 0 }] })
        // Second call: the UPDATE returns the updated row
        .mockResolvedValueOnce({ rows: [{ id: 'job-1', retry_count: 1, status: 'queued' }] })
    } as any;

    const updated = await svc.handleFailure('job-1', 3);
    expect(updated).not.toBeNull();
    expect(updated!.retry_count).toBe(1);
    expect((svc['pool'].query as any).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('marks refunded if retries >= maxRetries', async () => {
    const svc = new JobQueueService();

    svc['pool'] = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'job-2', retry_count: 3 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'job-2', retry_count: 3, status: 'refunded' }] })
    } as any;

    const updated = await svc.handleFailure('job-2', 3);
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('refunded');
    expect((svc['pool'].query as any).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

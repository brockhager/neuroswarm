import RefundReconciliationService from '../src/services/refund-reconciliation';

describe('RefundReconciliationService throttling and retry behavior', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.REFUND_ALERT_THROTTLE_SECONDS;
    delete process.env.REFUND_RETRY_MAX;
    delete process.env.REFUND_RETRY_INTERVAL_SECONDS;
  });

  test('throttles aggregated unsigned refund alerts', async () => {
    process.env.REFUND_ALERT_THROTTLE_SECONDS = '3600';

    const mockJobQueue: any = {
      getUnsignedRefundJobs: jest.fn().mockResolvedValue([{ id: 'job-1' }, { id: 'job-2' }]),
      getJobsByStatus: jest.fn().mockResolvedValue([]),
      getMostRecentRefundAlertTimestamp: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(new Date()),
      markJobsAlerted: jest.fn().mockResolvedValue(undefined),
    };

    const mockSolana: any = { checkTransactionConfirmation: jest.fn() };
    const mockAlert: any = { dispatchCritical: jest.fn().mockResolvedValue(undefined) };

    const svc = new RefundReconciliationService(mockJobQueue, mockSolana, mockAlert);

    // first tick -> should send alert
    await (svc as any).tick();
    expect(mockAlert.dispatchCritical).toHaveBeenCalledTimes(1);
    expect(mockJobQueue.markJobsAlerted).toHaveBeenCalledWith(['job-1', 'job-2']);

    // calling again immediately -> should be throttled (no new alert)
    await (svc as any).tick();
    expect(mockAlert.dispatchCritical).toHaveBeenCalledTimes(1);
  });

  test('auto-retries refunds up to max and then alerts', async () => {
    process.env.REFUND_RETRY_MAX = '2';
    process.env.REFUND_RETRY_INTERVAL_SECONDS = '0';
    process.env.REFUND_ALERT_THROTTLE_SECONDS = '3600';

    // single refunded job with signature that remains unconfirmed
    const refundedJob: any = { id: 'job-xyz', refund_tx_signature: 'orig-sig', user_wallet: 'Hn7c', nsd_burned: '10', refund_retry_count: 0, refund_last_attempt_at: null, refund_alert_count: 0, refund_last_alert_at: null };

    // We'll allow incrementRefundRetry to mutate the refundedJob mock
    const mockJobQueue: any = {
      getUnsignedRefundJobs: jest.fn().mockResolvedValue([]),
      getJobsByStatus: jest.fn().mockResolvedValue([refundedJob]),
      updateJobStatus: jest.fn().mockResolvedValue(undefined),
      setRefundSignature: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn().mockImplementation(async (id: string) => refundedJob),
      incrementRefundRetry: jest.fn().mockImplementation(async (jobId: string) => {
        refundedJob.refund_retry_count = (refundedJob.refund_retry_count || 0) + 1;
        refundedJob.refund_last_attempt_at = new Date();
        return refundedJob;
      }),
      markJobsAlerted: jest.fn().mockResolvedValue(undefined),
    };

    const mockSolana: any = {
      checkTransactionConfirmation: jest.fn().mockResolvedValue(false),
      triggerRefund: jest.fn()
        .mockResolvedValueOnce('retry-tx-1')
        .mockResolvedValueOnce('retry-tx-2')
    };

    const mockAlert: any = { dispatchCritical: jest.fn().mockResolvedValue(undefined) };

    const svc = new RefundReconciliationService(mockJobQueue, mockSolana, mockAlert);

    // First tick -> will attempt retry #1
    await (svc as any).tick();
    expect(mockSolana.triggerRefund).toHaveBeenCalledTimes(1);
    expect(mockJobQueue.setRefundSignature).toHaveBeenCalledWith('job-xyz', 'retry-tx-1');

    // Second tick -> state allows immediate retry (interval=0) -> attempt #2
    await (svc as any).tick();
    expect(mockSolana.triggerRefund).toHaveBeenCalledTimes(2);
    expect(mockJobQueue.setRefundSignature).toHaveBeenCalledWith('job-xyz', 'retry-tx-2');

    // Third tick -> retries exhausted -> should generate a per-job critical alert
    await (svc as any).tick();
    expect(mockAlert.dispatchCritical).toHaveBeenCalled();
  });
});

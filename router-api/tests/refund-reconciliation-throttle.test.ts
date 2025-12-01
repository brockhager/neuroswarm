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
    };

    const mockSolana: any = { checkTransactionConfirmation: jest.fn() };
    const mockAlert: any = { dispatchCritical: jest.fn().mockResolvedValue(undefined) };

    const svc = new RefundReconciliationService(mockJobQueue, mockSolana, mockAlert);

    // first tick -> should send alert
    await (svc as any).tick();
    expect(mockAlert.dispatchCritical).toHaveBeenCalledTimes(1);

    // calling again immediately -> should be throttled (no new alert)
    await (svc as any).tick();
    expect(mockAlert.dispatchCritical).toHaveBeenCalledTimes(1);
  });

  test('auto-retries refunds up to max and then alerts', async () => {
    process.env.REFUND_RETRY_MAX = '2';
    process.env.REFUND_RETRY_INTERVAL_SECONDS = '0';
    process.env.REFUND_ALERT_THROTTLE_SECONDS = '3600';

    // single refunded job with signature that remains unconfirmed
    const refundedJob = { id: 'job-xyz', refund_tx_signature: 'orig-sig', user_wallet: 'Hn7c', nsd_burned: '10' };

    const mockJobQueue: any = {
      getUnsignedRefundJobs: jest.fn().mockResolvedValue([]),
      getJobsByStatus: jest.fn().mockResolvedValue([refundedJob]),
      updateJobStatus: jest.fn().mockResolvedValue(undefined),
      setRefundSignature: jest.fn().mockResolvedValue(undefined),
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

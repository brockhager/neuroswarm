import RefundReconciliationService from '../src/services/refund-reconciliation';

describe('RefundReconciliationService', () => {
  test('alerts on unsigned refunded jobs', async () => {
    const mockJobQueue: any = {
      getUnsignedRefundJobs: jest.fn().mockResolvedValue([{ id: 'job-1' }]),
      getJobsByStatus: jest.fn().mockResolvedValue([]),
      getMostRecentRefundAlertTimestamp: jest.fn().mockResolvedValue(null),
      markJobsAlerted: jest.fn().mockResolvedValue(undefined),
      updateJobStatus: jest.fn(),
    };

    const mockSolana: any = {
      checkTransactionConfirmation: jest.fn()
    };

    const mockAlert: any = { dispatchCritical: jest.fn().mockResolvedValue(undefined) };
    const svc = new RefundReconciliationService(mockJobQueue, mockSolana, mockAlert);

    // Call private tick via casting to any for testing
    await (svc as any).tick();

    expect(mockJobQueue.getUnsignedRefundJobs).toHaveBeenCalled();
    expect(mockAlert.dispatchCritical).toHaveBeenCalled();
    expect(mockJobQueue.markJobsAlerted).toHaveBeenCalledWith(['job-1']);
  });

  test('confirms refunded jobs and updates status when tx is confirmed', async () => {
    const refundedJob = { id: 'job-2', refund_tx_signature: 'sig-abcdef' };

    const mockJobQueue: any = {
      getUnsignedRefundJobs: jest.fn().mockResolvedValue([]),
      getJobsByStatus: jest.fn().mockResolvedValue([refundedJob]),
      updateJobStatus: jest.fn().mockResolvedValue(undefined),
    };

    const mockSolana: any = {
      checkTransactionConfirmation: jest.fn().mockResolvedValue(true)
    };

    const svc = new RefundReconciliationService(mockJobQueue, mockSolana);

    await (svc as any).tick();

    expect(mockJobQueue.getJobsByStatus).toHaveBeenCalledWith('refunded');
    expect(mockSolana.checkTransactionConfirmation).toHaveBeenCalledWith(refundedJob.refund_tx_signature);
    expect(mockJobQueue.updateJobStatus).toHaveBeenCalledWith('job-2', 'refunded', 'CONFIRMED');
  });
});

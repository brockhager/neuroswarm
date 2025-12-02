import { anchorAudit } from '../src/services/audit-anchoring';
import axios from 'axios';

jest.mock('axios');

describe('Audit Anchoring Service', () => {
  test('computes deterministic SHA-256 hash for a canonical payload', async () => {
    const payload = {
      event_type: 'mass_refund_failure',
      timestamp: '2025-12-01T00:00:00.000Z',
      triggering_job_ids: ['job-a', 'job-b'],
      details: 'Mass refund processing failed during reconciliation.'
    };

    const res = await anchorAudit(payload as any);
    expect(res).toHaveProperty('audit_hash');
    // Hash should be a 64-character hex string
    expect(res.audit_hash).toMatch(/^[0-9a-f]{64}$/);
    // Transaction signature should be present and look like the mock_tx_ prefix
    expect(res.transaction_signature).toMatch(/^mock_tx_[0-9a-f]{64}$/);
    expect(res.ipfs_cid).toBeTruthy();
  });

  test('uploads to IPFS (mock) and notifies governance sink when configured', async () => {
    // Ensure axios.post resolves so sendGovernanceNotification returns true when webhook set
    (axios.post as jest.Mock).mockResolvedValue({ status: 200, data: { ok: true } });

    // Provide a governance webhook URL for this test
    process.env.GOVERNANCE_WEBHOOK_URL = 'http://localhost:9999/gov-sink';

    const payload = {
      event_type: 'mass_refund_failure',
      timestamp: new Date().toISOString(),
      triggering_job_ids: ['job-a'],
      details: 'Mass refund test'
    } as any;

    // Ensure IPFS_API_URL is unset so we use mocked IPFS via axios.post
    delete process.env.IPFS_API_URL;
    const res = await anchorAudit(payload);
    expect(res).toHaveProperty('audit_hash');
    expect(res).toHaveProperty('ipfs_cid');
    expect(res.governance_notified).toBe(true);
    expect(res.transaction_signature).toBeTruthy();

    delete process.env.GOVERNANCE_WEBHOOK_URL;
  });

  test('retries IPFS pinning and succeeds', async () => {
    // First two attempts fail, third succeeds (IPFS), then governance notification succeeds
    (axios.post as jest.Mock)
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('502 Bad Gateway'))
      .mockResolvedValueOnce({ data: { cid: 'QmTestCid' } })
      .mockResolvedValue({ status: 200, data: { ok: true } });

    process.env.IPFS_API_URL = 'http://ipfs.mock/add';
    process.env.GOVERNANCE_WEBHOOK_URL = 'http://gov.mock/notify';

    const payload = {
      event_type: 'pin_retry_test',
      timestamp: new Date().toISOString(),
      triggering_job_ids: ['job-x'],
      details: 'IPFS retry test'
    } as any;

    const res = await anchorAudit(payload);
    expect(res.ipfs_cid).toBe('QmTestCid');
    expect(res.transaction_signature).toBeTruthy();

    delete process.env.IPFS_API_URL;
    delete process.env.GOVERNANCE_WEBHOOK_URL;
  });

  test('fails when IPFS pinning exhausts retries', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('unreachable'));
    process.env.IPFS_API_URL = 'http://ipfs.mock/add';

    const payload = {
      event_type: 'pin_failure_test',
      timestamp: new Date().toISOString(),
      triggering_job_ids: ['job-y'],
      details: 'IPFS failure test'
    } as any;

    await expect(anchorAudit(payload)).rejects.toThrow(/IPFS pinning failed/);
    delete process.env.IPFS_API_URL;
  });
});

import anchorModule from '../audit-anchoring';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('audit-anchoring IPFS (Kubo multipart) integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('uses Kubo HTTP /api/v0/add and returns extracted CID from line-delimited response', async () => {
    process.env.IPFS_API_URL = 'http://127.0.0.1:5001';

    // Simulate Kubo's line-delimited JSON response
    const resp = '{"Name":"audit_event.json","Hash":"QmTESTCID","Size":"123"}\n';
    mockedAxios.post.mockResolvedValueOnce({ data: resp } as any);

    const event = { event_type: 'T23_PREFLIGHT_TEST', timestamp: new Date().toISOString(), details: 'unit test' };
    const result = await (anchorModule as any).anchorAudit(event);

    expect(result.ipfs_cid).toBe('QmTESTCID');
    expect(mockedAxios.post).toHaveBeenCalled();
    // ensure the call was to /api/v0/add
    const callUrl = (mockedAxios.post.mock.calls[0][0] as string);
    expect(callUrl.includes('/api/v0/add')).toBeTruthy();
  });

  test('mock IPFS returns deterministic CID when IPFS_API_URL=mock', async () => {
    process.env.IPFS_API_URL = 'mock';

    const event = { event_type: 'T23_PREFLIGHT_TEST', timestamp: new Date().toISOString(), details: 'unit test' };
    const result = await (anchorModule as any).anchorAudit(event);

    expect(result.ipfs_cid.startsWith('Qm')).toBeTruthy();
  });
});

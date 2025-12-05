import { reviewArtifactHandler, fetchArtifactContent } from '../artifact-review';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the ns-llm client module
jest.unstable_mockModule('../../../../shared/ns-llm-client.js', () => ({
  default: {
    generate: jest.fn(async (prompt: string) => ({ text: JSON.stringify([
      { severity: 'minor', line_number: 1, comment: 'Minor nit: prefer const' }
    ]) }))
  }
}));

describe('artifact review handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => { process.env = originalEnv; });

  test('fetchArtifactContent returns null when not found', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('not found'));
    const content = await fetchArtifactContent('does-not-exist');
    expect(content).toBeNull();
  });

  test('reviewArtifactHandler returns structured critique', async () => {
    const fakeReq: any = { body: { artifactId: 'A1' } };
    const fakeRes: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

    // Provide artifact content
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: 'function hello() { return 1 }' } as any);

    // Import the mocked client dynamically so the handler picks it up
    const { default: nsClient } = await import('../../../../shared/ns-llm-client.js');

    // Replace generate with an explicit predictable response
    (nsClient.generate as jest.Mock).mockResolvedValueOnce({ text: JSON.stringify([
      { severity: 'major', line_number: 1, comment: 'Missing return type annotation (TypeScript)' }
    ]) });

    await reviewArtifactHandler(fakeReq, fakeRes);

    expect(fakeRes.status).toHaveBeenCalledWith(200);
    expect(fakeRes.json).toHaveBeenCalled();

    const payload = (fakeRes.json as jest.Mock).mock.calls[0][0];
    expect(payload).toHaveProperty('artifactId', 'A1');
    expect(payload).toHaveProperty('critique');
    expect(Array.isArray(payload.critique)).toBeTruthy();
    expect(payload.critique[0]).toHaveProperty('severity', 'major');
  });
});

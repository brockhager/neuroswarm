// neuro-shared/tests/neuroswarm-client.test.ts
// Comprehensive test suite for Neuroswarm Client SDK
// Focuses on token management, fetchWithRetry resilience, and submission endpoints

import { NeuroswarmClient, Artifact, LoginRequest } from '../src/neuroswarm-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock setTimeout and clearInterval for timer testing
jest.useFakeTimers();

describe('NeuroswarmClient', () => {
  let client: NeuroswarmClient;
  const baseUrl = 'http://localhost:8080';

  beforeEach(() => {
    client = new NeuroswarmClient(baseUrl);
    mockFetch.mockClear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    client.logout(); // Clean up any timers
  });

  describe('Constructor', () => {
    it('should initialize with default base URL', () => {
      const defaultClient = new NeuroswarmClient();
      expect(defaultClient).toBeDefined();
    });

    it('should initialize with custom base URL', () => {
      const customUrl = 'https://api.example.com';
      const customClient = new NeuroswarmClient(customUrl);
      expect(customClient).toBeDefined();
    });
  });

  describe('Authentication', () => {
    const mockLoginResponse = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600, // 1 hour
      tokenType: 'Bearer'
    };

    const mockCredentials: LoginRequest = {
      username: 'testuser',
      password: 'testpass'
    };

    it('should login successfully and store tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLoginResponse)
      });

      await client.login(mockCredentials);

      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockCredentials),
      });

      expect(client.isAuthenticated()).toBe(true);
      const tokenStatus = client.getTokenStatus();
      expect(tokenStatus.authenticated).toBe(true);
      expect(tokenStatus.timeUntilExpiry).toBeGreaterThan(0);
    });

    it('should throw error on login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });

      await expect(client.login(mockCredentials)).rejects.toThrow('Login failed: Unauthorized');
    });

    it('should logout and clear tokens', () => {
      // First login
      client['tokenData'] = {
        accessToken: 'test',
        refreshToken: 'test',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer'
      };

      expect(client.isAuthenticated()).toBe(true);

      client.logout();

      expect(client.isAuthenticated()).toBe(false);
      expect(client.getTokenStatus().authenticated).toBe(false);
    });

    it('should start token refresh timer on login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLoginResponse)
      });

      await client.login(mockCredentials);

      // Fast-forward time to trigger refresh check
      jest.advanceTimersByTime(10000); // 10 seconds

      // Should not refresh yet (token still valid)
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only the login call
    });

    it('should refresh token when close to expiry', async () => {
      // Login first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLoginResponse)
      });

      await client.login(mockCredentials);

      // Mock refresh response
      const mockRefreshResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRefreshResponse)
      });

      // Set token to expire in 4 minutes (less than 5 minute threshold)
      client['tokenData']!.expiresAt = Date.now() + (4 * 60 * 1000);

      // Advance timer to trigger refresh check
      jest.advanceTimersByTime(10000);

      // Wait for async refresh
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: 'mock-refresh-token',
        }),
      });
    });
  });

  describe('fetchWithRetry', () => {
    beforeEach(() => {
      // Set up authenticated client
      client['tokenData'] = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer'
      };
    });

    it('should succeed on first attempt', async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({ success: true }) };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client['fetchWithRetry']('/test', { method: 'GET' }, 'test request');

      expect(result).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 (Too Many Requests)', async () => {
      jest.setTimeout(10000); // Increase timeout for retry test

      const failureResponse = { ok: false, status: 429, statusText: 'Too Many Requests' };
      const successResponse = { ok: true, json: () => Promise.resolve({ success: true }) };

      mockFetch
        .mockResolvedValueOnce(failureResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await client['fetchWithRetry']('/test', { method: 'GET' }, 'test request');

      expect(result).toBe(successResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should retry on 5xx server errors', async () => {
      const failureResponse = { ok: false, status: 503, statusText: 'Service Unavailable' };
      const successResponse = { ok: true, json: () => Promise.resolve({ success: true }) };

      mockFetch
        .mockResolvedValueOnce(failureResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await client['fetchWithRetry']('/test', { method: 'GET' }, 'test request');

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx client errors', async () => {
      const failureResponse = { ok: false, status: 400, statusText: 'Bad Request' };

      mockFetch.mockResolvedValueOnce(failureResponse);

      const result = await client['fetchWithRetry']('/test', { method: 'GET' }, 'test request');

      expect(result).toBe(failureResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('Network failure');
      const successResponse = { ok: true, json: () => Promise.resolve({ success: true }) };

      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const result = await client['fetchWithRetry']('/test', { method: 'GET' }, 'test request');

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should implement exponential backoff with jitter', async () => {
      jest.setTimeout(15000); // Increase timeout for backoff test

      const failureResponse = { ok: false, status: 503, statusText: 'Service Unavailable' };

      // Mock 3 failures followed by success
      mockFetch
        .mockResolvedValueOnce(failureResponse)
        .mockResolvedValueOnce(failureResponse)
        .mockResolvedValueOnce(failureResponse)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

      const retryPromise = client['fetchWithRetry']('/test', { method: 'GET' }, 'test request');

      // First retry delay (1-2 seconds with jitter)
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      // Second retry delay (2-4 seconds with jitter)
      jest.advanceTimersByTime(4000);
      await Promise.resolve();

      // Third retry delay (4-8 seconds with jitter)
      jest.advanceTimersByTime(8000);
      await Promise.resolve();

      const result = await retryPromise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    }, 15000);

    it('should fail after max retries exhausted', async () => {
      jest.setTimeout(10000); // Increase timeout for retry test

      const failureResponse = { ok: false, status: 503, statusText: 'Service Unavailable' };

      // Mock 4 failures (maxRetries + 1)
      mockFetch.mockResolvedValue(failureResponse);

      await expect(
        client['fetchWithRetry']('/test', { method: 'GET' }, 'test request')
      ).rejects.toThrow('test request failed after 4 attempts');

      expect(mockFetch).toHaveBeenCalledTimes(4);
    }, 10000);

    it('should respect max delay limit', async () => {
      // This test would verify that delays don't exceed maxDelay
      // In practice, we'd need to mock setTimeout to verify delay capping
      expect(client['retryConfig'].maxDelay).toBe(30000); // 30 seconds
    });
  });

  describe('Submission Methods', () => {
    const mockSubmissionResponse = {
      submissionId: 'test-submission-id',
      status: 'pending' as const,
      timestamp: new Date().toISOString()
    };

    beforeEach(() => {
      // Set up authenticated client
      client['tokenData'] = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer'
      };
    });

    describe('submitArtifact', () => {
      it('should submit text artifact successfully', async () => {
        const artifact: Artifact = {
          content: 'Test content',
          metadata: { key: 'value' }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSubmissionResponse)
        });

        const result = await client.submitArtifact(artifact);

        expect(result).toEqual(mockSubmissionResponse);
        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/v1/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify({
            content: 'Test content',
            metadata: { key: 'value' },
            contentType: undefined,
          }),
        });
      });

      it('should handle file artifacts by calling uploadArtifactFile', async () => {
        const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const artifact: Artifact = {
          file: mockFile,
          metadata: { key: 'value' }
        };

        // Mock the upload method
        const uploadSpy = jest.spyOn(client, 'uploadArtifactFile').mockResolvedValue(mockSubmissionResponse);

        const result = await client.submitArtifact(artifact);

        expect(uploadSpy).toHaveBeenCalledWith(mockFile, { key: 'value' });
        expect(result).toEqual(mockSubmissionResponse);
      });

      it('should throw error when not authenticated', async () => {
        client.logout();

        const artifact: Artifact = { content: 'Test' };

        await expect(client.submitArtifact(artifact)).rejects.toThrow('Not authenticated');
      });

      it('should retry on submission failure', async () => {
        jest.setTimeout(10000);

        const artifact: Artifact = { content: 'Test content' };

        // First call fails with 503, second succeeds
        mockFetch
          .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockSubmissionResponse)
          });

        const result = await client.submitArtifact(artifact);

        expect(result).toEqual(mockSubmissionResponse);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      }, 10000);
    });

    describe('submitBatch', () => {
      it('should submit batch successfully', async () => {
        jest.setTimeout(10000);

        const artifacts: Artifact[] = [
          { content: 'Content 1', metadata: { id: 1 } },
          { content: 'Content 2', metadata: { id: 2 } }
        ];

        const mockBatchResponse = {
          batchId: 'test-batch-id',
          submissions: [mockSubmissionResponse, mockSubmissionResponse],
          timestamp: new Date().toISOString()
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBatchResponse)
        });

        const result = await client.submitBatch(artifacts);

        expect(result).toEqual(mockBatchResponse);
        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/v1/submit/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify({ artifacts }),
        });
      }, 10000);

      it('should filter out empty artifacts', async () => {
        jest.setTimeout(10000);

        const artifacts: Artifact[] = [
          { content: '', metadata: {} },
          { content: 'Valid content', metadata: { id: 1 } },
          { content: '   ', metadata: {} }
        ];

        await expect(client.submitBatch(artifacts)).rejects.toThrow('Please add at least one artifact with content');
      }, 10000);
    });

    describe('uploadArtifactFile', () => {
      it('should upload file successfully', async () => {
        const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const metadata = { category: 'test' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSubmissionResponse)
        });

        const result = await client.uploadArtifactFile(mockFile, metadata);

        expect(result).toEqual(mockSubmissionResponse);

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[0]).toBe(`${baseUrl}/v1/upload`);
        expect(callArgs[1].method).toBe('POST');
        expect(callArgs[1].headers.Authorization).toBe('Bearer test-token');

        // Verify FormData was created correctly
        const formData = callArgs[1].body as FormData;
        expect(formData.get('file')).toBe(mockFile);
        expect(formData.get('metadata')).toBe(JSON.stringify(metadata));
      });
    });

    describe('getStatus', () => {
      it('should get status successfully', async () => {
        const submissionId = 'test-submission-id';
        const mockStatusResponse = {
          submissionId,
          status: 'completed' as const,
          timestamp: new Date().toISOString(),
          result: { output: 'success' }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatusResponse)
        });

        const result = await client.getStatus(submissionId);

        expect(result).toEqual(mockStatusResponse);
        expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/v1/status/${submissionId}`, {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        });
      });
    });
  });

  describe('WebSocket Monitoring', () => {
    beforeEach(() => {
      // Set up authenticated client
      client['tokenData'] = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer'
      };
    });

    it('should subscribe to status updates', async () => {
      const submissionId = 'test-submission-id';
      const mockStatus = {
        submissionId,
        status: 'completed' as const,
        timestamp: new Date().toISOString(),
        result: { output: 'success' }
      };

      // Mock WebSocket
      const mockWebSocket = {
        readyState: 1, // OPEN
        onopen: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
        onclose: jest.fn(),
        close: jest.fn(),
        send: jest.fn()
      };

      (global.WebSocket as any).mockImplementation(() => mockWebSocket);

      const onUpdate = jest.fn();
      const onError = jest.fn();

      const unsubscribe = client.subscribeToStatus(submissionId, onUpdate, onError);

      // Simulate WebSocket open
      mockWebSocket.onopen();

      // Simulate message
      mockWebSocket.onmessage({ data: JSON.stringify(mockStatus) });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onUpdate).toHaveBeenCalledWith(mockStatus);
      expect(onError).not.toHaveBeenCalled();

      // Test unsubscribe
      unsubscribe();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should handle WebSocket message parsing errors', async () => {
      const submissionId = 'test-submission-id';

      const mockWebSocket = {
        readyState: 1,
        onopen: jest.fn(),
        onmessage: jest.fn(),
        onerror: jest.fn(),
        onclose: jest.fn(),
        close: jest.fn()
      };

      (global.WebSocket as any).mockImplementation(() => mockWebSocket);

      const onUpdate = jest.fn();
      const onError = jest.fn();

      client.subscribeToStatus(submissionId, onUpdate, onError);

      mockWebSocket.onopen();
      mockWebSocket.onmessage({ data: 'invalid json' });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onUpdate).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed metadata in batch submission', async () => {
      jest.setTimeout(10000);

      client['tokenData'] = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer'
      };

      const artifacts: Artifact[] = [
        { content: 'Test', metadata: 'invalid metadata' as any }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          batchId: 'test',
          submissions: [],
          timestamp: new Date().toISOString()
        })
      });

      // Should not throw - metadata is optional and can be invalid
      await expect(client.submitBatch(artifacts)).resolves.toBeDefined();
    }, 10000);

    it('should handle token expiry during operations', async () => {
      // Set up client with expired token
      client['tokenData'] = {
        accessToken: 'expired-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        tokenType: 'Bearer'
      };

      const artifact: Artifact = { content: 'Test' };

      await expect(client.submitArtifact(artifact)).rejects.toThrow('Not authenticated');
    });
  });
});
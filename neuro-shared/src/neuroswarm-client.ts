// neuro-shared/src/neuroswarm-client.ts
// Core Neuroswarm Client SDK for external client access

export interface Artifact {
  content?: string;
  file?: File;
  metadata?: Record<string, any>;
  contentType?: string;
}

export interface SubmissionResponse {
  submissionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
}

export interface BatchSubmissionResponse {
  batchId: string;
  submissions: SubmissionResponse[];
  timestamp: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp
  tokenType: string;
}

export interface StatusResponse {
  submissionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
  result?: any;
  error?: string;
}

export class NeuroswarmClient {
  private baseUrl: string;
  private tokenData?: TokenData;
  private refreshTimer?: NodeJS.Timeout;
  private isRefreshing = false;

  // Retry configuration
  private retryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Request Timeout, Too Many Requests, Server Errors
  };

  constructor(baseUrl: string = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    context: string = 'request'
  ): Promise<Response> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // If successful or not a retryable error, return immediately
        if (response.ok || !this.retryConfig.retryableStatusCodes.includes(response.status)) {
          return response;
        }

        // For retryable errors, throw to trigger retry logic
        throw new Error(`${context} failed with status ${response.status}: ${response.statusText}`);

      } catch (error) {
        lastError = error as Error;

        // Don't retry on the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
        const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
        const delay = Math.min(baseDelay + jitter, this.retryConfig.maxDelay);

        console.warn(`${context} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}): ${lastError.message}. Retrying in ${Math.round(delay)}ms...`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    throw new Error(`${context} failed after ${this.retryConfig.maxRetries + 1} attempts: ${lastError.message}`);
  }

  /**
   * Authenticate with username/password and get tokens
   */
  async login(credentials: LoginRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const loginResponse: LoginResponse = await response.json();

    // Store token data
    this.tokenData = {
      accessToken: loginResponse.accessToken,
      refreshToken: loginResponse.refreshToken,
      expiresAt: Date.now() + (loginResponse.expiresIn * 1000),
      tokenType: loginResponse.tokenType,
    };

    // Start background refresh task
    this.startTokenRefresh();
  }

  /**
   * Logout and clear tokens
   */
  logout(): void {
    this.tokenData = undefined;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.tokenData && this.tokenData.expiresAt > Date.now());
  }

  /**
   * Get current token status
   */
  getTokenStatus(): { authenticated: boolean; expiresAt?: number; timeUntilExpiry?: number } {
    if (!this.tokenData) {
      return { authenticated: false };
    }

    const now = Date.now();
    const authenticated = this.tokenData.expiresAt > now;
    const timeUntilExpiry = authenticated ? this.tokenData.expiresAt - now : undefined;

    return {
      authenticated,
      expiresAt: this.tokenData.expiresAt,
      timeUntilExpiry,
    };
  }

  /**
   * Start background token refresh task
   */
  private startTokenRefresh(): void {
    // Clear any existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Check every 10 seconds for demo purposes (in production, check more frequently)
    this.refreshTimer = setInterval(async () => {
      if (this.tokenData && this.shouldRefreshToken()) {
        await this.refreshToken();
      }
    }, 10000); // 10 seconds
  }

  /**
   * Check if token should be refreshed (when < 5 minutes remaining)
   */
  private shouldRefreshToken(): boolean {
    if (!this.tokenData) return false;
    const timeUntilExpiry = this.tokenData.expiresAt - Date.now();
    return timeUntilExpiry < 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshToken(): Promise<void> {
    if (this.isRefreshing || !this.tokenData) return;

    this.isRefreshing = true;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.tokenData.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const refreshResponse: LoginResponse = await response.json();

      // Update token data
      this.tokenData = {
        accessToken: refreshResponse.accessToken,
        refreshToken: refreshResponse.refreshToken, // May be rotated
        expiresAt: Date.now() + (refreshResponse.expiresIn * 1000),
        tokenType: refreshResponse.tokenType,
      };

      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed:', error);
      // In production, you might want to logout or retry
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get authorization headers for authenticated requests
   */
  private getAuthHeaders(): Record<string, string> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    return {
      'Authorization': `${this.tokenData!.tokenType} ${this.tokenData!.accessToken}`,
    };
  }

  /**
   * Submit an artifact for processing
   */
  async submitArtifact(artifact: Artifact): Promise<SubmissionResponse> {
    if (artifact.file) {
      return this.uploadArtifactFile(artifact.file, artifact.metadata);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
    };

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: artifact.content,
        metadata: artifact.metadata,
        contentType: artifact.contentType,
      }),
    }, 'Artifact submission');

    if (!response.ok) {
      throw new Error(`Submission failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Submit multiple artifacts in a batch
   */
  async submitBatch(artifacts: Artifact[]): Promise<BatchSubmissionResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
    };

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/submit/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ artifacts }),
    }, 'Batch submission');

    if (!response.ok) {
      throw new Error(`Batch submission failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upload a file artifact for processing
   */
  async uploadArtifactFile(file: File, metadata?: Record<string, any>): Promise<SubmissionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const headers: Record<string, string> = {
      ...this.getAuthHeaders(),
    };

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/upload`, {
      method: 'POST',
      headers,
      body: formData,
    }, 'File upload');

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Query the status of a submission
   */
  async getStatus(submissionId: string): Promise<StatusResponse> {
    const headers: Record<string, string> = {
      ...this.getAuthHeaders(),
    };

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/status/${submissionId}`, {
      method: 'GET',
      headers,
    }, 'Status query');

    if (!response.ok) {
      throw new Error(`Status query failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Subscribe to real-time status updates via WebSocket (replaces polling)
   */
  subscribeToStatus(
    submissionId: string,
    onUpdate: (status: StatusResponse) => void,
    onError?: (error: Error) => void
  ): () => void {
    const wsUrl = this.baseUrl.replace(/^http/, 'ws') + `/ws/status/${submissionId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for submission:', submissionId);
    };

    ws.onmessage = (event) => {
      try {
        const status: StatusResponse = JSON.parse(event.data);
        onUpdate(status);

        // Auto-close on final states
        if (status.status === 'completed' || status.status === 'failed') {
          ws.close();
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        onError?.(new Error('Invalid message format'));
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(new Error('WebSocket connection failed'));
    };

    ws.onclose = () => {
      console.log('WebSocket closed for submission:', submissionId);
    };

    // Return cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }
}
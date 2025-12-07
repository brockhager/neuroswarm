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

  constructor(baseUrl: string = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
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
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/v1/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: artifact.content,
        metadata: artifact.metadata,
        contentType: artifact.contentType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Submission failed: ${response.statusText}`);
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

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/v1/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Query the status of a submission
   */
  async getStatus(submissionId: string): Promise<StatusResponse> {
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/v1/status/${submissionId}`, {
      method: 'GET',
      headers,
    });

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
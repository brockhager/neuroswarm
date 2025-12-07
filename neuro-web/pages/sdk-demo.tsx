// neuro-web/pages/sdk-demo.tsx
// Client SDK React Demo Application
// Demonstrates artifact submission and real-time status monitoring

import { useState, useEffect } from 'react';
import { NeuroswarmClient, Artifact, StatusResponse, BatchSubmissionResponse } from '../../neuro-shared/src/neuroswarm-client';

const client = new NeuroswarmClient('http://localhost:8080'); // Adjust URL as needed

export default function SDKDemo() {
  const [mode, setMode] = useState<'single' | 'batch' | 'file'>('single');
  const [content, setContent] = useState('');
  const [metadata, setMetadata] = useState('');
  const [batchArtifacts, setBatchArtifacts] = useState<Artifact[]>([{ content: '', metadata: {} }]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileMetadata, setFileMetadata] = useState('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [batchResponse, setBatchResponse] = useState<BatchSubmissionResponse | null>(null);
  const [statuses, setStatuses] = useState<Record<string, StatusResponse>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState(client.getTokenStatus());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check authentication
    if (!client.isAuthenticated()) {
      setError('Authentication required. Please login first.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'single') {
        const artifact: Artifact = {
          content,
          metadata: metadata ? JSON.parse(metadata) : undefined,
        };

        const response = await client.submitArtifact(artifact);
        setSubmissionId(response.submissionId);
        setStatuses({ [response.submissionId]: response });
      } else if (mode === 'batch') {
        // Filter out empty artifacts
        const validArtifacts = batchArtifacts.filter(art => art.content && art.content.trim());
        if (validArtifacts.length === 0) {
          throw new Error('Please add at least one artifact with content');
        }

        const response = await client.submitBatch(validArtifacts);
        setBatchResponse(response);
        const newStatuses: Record<string, StatusResponse> = {};
        response.submissions.forEach(sub => {
          newStatuses[sub.submissionId] = sub;
        });
        setStatuses(newStatuses);
      } else if (mode === 'file') {
        if (!selectedFile) {
          throw new Error('Please select a file to upload');
        }

        const metadataObj = fileMetadata ? JSON.parse(fileMetadata) : undefined;
        const response = await client.uploadArtifactFile(selectedFile, metadataObj);
        setSubmissionId(response.submissionId);
        setStatuses({ [response.submissionId]: response });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    Object.keys(statuses).forEach(submissionId => {
      const unsubscribe = client.subscribeToStatus(
        submissionId,
        (newStatus) => {
          setStatuses(prev => ({ ...prev, [submissionId]: newStatus }));
        },
        (error) => {
          setError(`WebSocket error for ${submissionId}: ${error.message}`);
        }
      );
      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [Object.keys(statuses).length]); // Re-run when statuses change

  // Update token status every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTokenStatus(client.getTokenStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      await client.login({ username, password });
      setTokenStatus(client.getTokenStatus());
      setUsername('');
      setPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    client.logout();
    setTokenStatus(client.getTokenStatus());
    setStatuses({});
    setSubmissionId(null);
    setBatchResponse(null);
  };

  const addArtifact = () => {
    setBatchArtifacts([...batchArtifacts, { content: '', metadata: {} }]);
  };

  const updateArtifact = (index: number, field: keyof Artifact, value: any) => {
    const newArtifacts = [...batchArtifacts];
    if (field === 'metadata' && typeof value === 'string') {
      try {
        newArtifacts[index][field] = JSON.parse(value);
      } catch {
        newArtifacts[index][field] = {};
      }
    } else {
      (newArtifacts[index] as any)[field] = value;
    }
    setBatchArtifacts(newArtifacts);
  };

  const removeArtifact = (index: number) => {
    setBatchArtifacts(batchArtifacts.filter((_, i) => i !== index));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Neuroswarm Client SDK Demo</h1>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
        <strong>🛡️ Network Resilience:</strong> This demo includes automatic retry logic with exponential backoff 
        for handling transient network issues (server load, temporary outages). Failed requests are automatically 
        retried up to 3 times with increasing delays.
      </p>

      {/* Authentication Panel */}
      <div style={{ 
        border: '2px solid #007bff', 
        borderRadius: '8px', 
        padding: '15px', 
        marginBottom: '20px',
        backgroundColor: tokenStatus.authenticated ? '#e8f5e8' : '#fff3cd'
      }}>
        <h2 style={{ marginTop: 0 }}>🔐 Authentication</h2>
        
        {tokenStatus.authenticated ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ color: 'green', fontWeight: 'bold' }}>✅ Authenticated</span>
              <span style={{ fontSize: '14px', color: '#666' }}>
                Expires in: {tokenStatus.timeUntilExpiry ? 
                  `${Math.floor(tokenStatus.timeUntilExpiry / 1000 / 60)}m ${Math.floor((tokenStatus.timeUntilExpiry / 1000) % 60)}s` : 
                  'Unknown'}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="demo-user"
                required
                style={{ padding: '5px', width: '120px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo-pass"
                required
                style={{ padding: '5px', width: '120px' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={authLoading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: authLoading ? 'not-allowed' : 'pointer',
                alignSelf: 'flex-end'
              }}
            >
              {authLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}
        
        {authError && (
          <div style={{ color: 'red', marginTop: '10px', fontSize: '14px' }}>
            Auth Error: {authError}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setMode('single')}
          style={{ padding: '10px', marginRight: '10px', background: mode === 'single' ? '#007bff' : '#f0f0f0' }}
        >
          Single Submission
        </button>
        <button
          onClick={() => setMode('batch')}
          style={{ padding: '10px', marginRight: '10px', background: mode === 'batch' ? '#007bff' : '#f0f0f0' }}
        >
          Batch Submission
        </button>
        <button
          onClick={() => setMode('file')}
          style={{ padding: '10px', background: mode === 'file' ? '#007bff' : '#f0f0f0' }}
        >
          File Upload
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        {mode === 'single' ? (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label>
                Artifact Content:
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter artifact content..."
                  rows={4}
                  cols={50}
                  required
                  style={{ display: 'block', marginTop: '5px' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>
                Metadata (JSON):
                <textarea
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={2}
                  cols={50}
                  style={{ display: 'block', marginTop: '5px' }}
                />
              </label>
            </div>
          </>
        ) : mode === 'batch' ? (
          <>
            <h3>Batch Artifacts</h3>
            {batchArtifacts.map((artifact, index) => (
              <div key={index} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
                <div style={{ marginBottom: '5px' }}>
                  <label>
                    Content:
                    <textarea
                      value={artifact.content || ''}
                      onChange={(e) => updateArtifact(index, 'content', e.target.value)}
                      placeholder="Enter artifact content..."
                      rows={3}
                      cols={40}
                      style={{ display: 'block', marginTop: '5px' }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '5px' }}>
                  <label>
                    Metadata (JSON):
                    <input
                      type="text"
                      value={JSON.stringify(artifact.metadata)}
                      onChange={(e) => updateArtifact(index, 'metadata', e.target.value)}
                      placeholder='{"key": "value"}'
                      style={{ width: '300px', marginTop: '5px' }}
                    />
                  </label>
                </div>
                <button type="button" onClick={() => removeArtifact(index)} style={{ color: 'red' }}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addArtifact} style={{ padding: '5px 10px', marginRight: '10px' }}>
              Add Artifact
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label>
                Select File:
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  style={{ display: 'block', marginTop: '5px' }}
                  required
                />
              </label>
              {selectedFile && (
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>
                Metadata (JSON):
                <textarea
                  value={fileMetadata}
                  onChange={(e) => setFileMetadata(e.target.value)}
                  placeholder='{"description": "Build log", "version": "1.0"}'
                  rows={2}
                  cols={50}
                  style={{ display: 'block', marginTop: '5px' }}
                />
              </label>
            </div>
          </>
        )}

        <button type="submit" disabled={loading || !tokenStatus.authenticated} style={{ padding: '10px 20px' }}>
          {loading ? 'Submitting...' : !tokenStatus.authenticated ? 'Login Required' : mode === 'single' ? 'Submit Artifact' : mode === 'batch' ? 'Submit Batch' : 'Upload File'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}

      {batchResponse && (
        <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
          <h2>Batch Submission</h2>
          <p><strong>Batch ID:</strong> {batchResponse.batchId}</p>
          <p><strong>Timestamp:</strong> {new Date(batchResponse.timestamp).toLocaleString()}</p>
          <p><strong>Submissions:</strong> {batchResponse.submissions.length}</p>
        </div>
      )}

      {Object.keys(statuses).length > 0 && (
        <div>
          <h2>Submission Statuses</h2>
          {Object.entries(statuses).map(([id, status]) => (
            <div key={id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
              <p><strong>ID:</strong> {status.submissionId}</p>
              <p><strong>Status:</strong> {status.status}</p>
              <p><strong>Timestamp:</strong> {new Date(status.timestamp).toLocaleString()}</p>
              {status.result && (
                <p><strong>Result:</strong> {JSON.stringify(status.result)}</p>
              )}
              {status.error && (
                <p style={{ color: 'red' }}><strong>Error:</strong> {status.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>This demo shows how external clients can use the NeuroswarmClient SDK to:</p>
        <ul>
          <li>Submit single artifacts or batches for processing</li>
          <li>Monitor submission status in real-time via WebSocket</li>
          <li>Handle errors gracefully</li>
        </ul>
        <p>Note: Ensure the Neuroswarm gateway supports WebSocket connections on ws://localhost:8080/ws/status/{submissionId} and batch submission on /v1/submit/batch for this demo to work.</p>
      </div>
    </div>
  );
}
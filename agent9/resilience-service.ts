// agent9/resilience-service.ts
// AG4-03: Agent 9 offline/resiliency handling and monitoring.
// Manages local state persistence (using Firestore mock) and network monitoring 
// to enhance client-side reliability and user experience during outages.

import crypto from 'crypto';

// --- SIMPLE MOCK FIRESTORE IMPLEMENTATION ---
// This avoids requiring the real Firebase SDK for simulation/running locally.

type DocData = Record<string, any>;

class MockDocumentSnapshot {
  constructor(private _exists: boolean, private _data: DocData | null) {}
  exists() { return this._exists; }
  data() { return this._data; }
}

class MockFirestore {
  store: Map<string, DocData> = new Map();
}

const mockFirestore = new MockFirestore();

function doc(db: MockFirestore, path: string) {
  return { db, path };
}

async function setDoc(docRef: { db: MockFirestore; path: string }, data: DocData) {
  docRef.db.store.set(docRef.path, data);
  return true;
}

async function getDoc(docRef: { db: MockFirestore; path: string }) {
  const data = docRef.db.store.get(docRef.path) || null;
  return new MockDocumentSnapshot(Boolean(data), data);
}

function onSnapshot(docRef: { db: MockFirestore; path: string }, cb: (snap: MockDocumentSnapshot) => void) {
  // Very simple: automatic call with current state; in a real app this would be event-driven
  const snap = new MockDocumentSnapshot(Boolean(docRef.db.store.get(docRef.path)), docRef.db.store.get(docRef.path) || {});
  cb(snap);
  // Return an unsubscribe function (no-op for our lightweight mock)
  return () => {};
}

// --- GLOBAL MOCKS & SETUP ---
// NOTE: In a real app, these global variables are provided by the canvas environment.
const __app_id = 'neuroswarm-agent9-app';
const firebaseConfig = { apiKey: 'mock-api-key', authDomain: 'mock-auth-domain', projectId: 'neuroswarm-project' };
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Use our mock Firestore as "db" and a tiny mock auth implementation
const db = mockFirestore;
let mockUserId: string | null = null;

async function signInAnonymously() {
  // Simulate creating a user id
  mockUserId = crypto.randomUUID();
  return { user: { uid: mockUserId } };
}

// State for the Resilience Service
let userId: string | null = null;
let isOnline = true; // Initial assumed state

// --- 1. CORE FIRESTORE LOGIC ---

/**
 * Initializes Firebase Authentication and sets up the user session.
 */
export async function initializeAuth(): Promise<void> {
  try {
    // Sign in anonymously if no custom token is provided (standard resilience fallback)
    const userCredential = await signInAnonymously();
    userId = userCredential.user.uid;
    console.log(`[Auth] User signed in anonymously. User ID: ${userId.substring(0, 8)}...`);
  } catch (error) {
    console.error('[Auth Error] Failed to sign in:', error);
  }
}

/**
 * Gets the document reference for the user's private resilience state.
 * @param docId The ID of the document (e.g., 'jobs', 'config').
 * @returns Firestore Document Reference.
 */
export function getResilienceDocRef(docId: string) {
  if (!userId) {
    throw new Error('User ID not available. Authentication failed.');
  }
  // Private data path: /artifacts/{appId}/users/{userId}/agent9_resilience/{docId}
  const path = `artifacts/${appId}/users/${userId}/agent9_resilience/${docId}`;
  return doc(db, path);
}

// --- 2. OFFLINE JOB PERSISTENCE ---

export type QueuedJob = {
  id: string;
  prompt: string;
  timestamp: number;
  status: 'queued_local' | 'failed' | 'sent';
};

/**
 * Saves a job to the local persistence layer (Firestore mock) while offline.
 * @param job The job details to queue locally.
 */
export async function queueLocalJob(job: QueuedJob): Promise<void> {
  const docRef = getResilienceDocRef('jobs');
  try {
    // Fetch existing jobs or initialize
    const docSnap = await getDoc(docRef);
    let jobs: QueuedJob[] = [];
    if (docSnap.exists()) {
      // Stored 'jobs' field is an array of QueuedJob
      jobs = docSnap.data()?.jobs || [];
    }

    // Add the new job and save back
    jobs.push(job);
    await setDoc(docRef, { jobs, lastUpdated: Date.now() });
    console.log(`[Persistence] Job ${job.id} locally queued for offline submission.`);
  } catch (error) {
    console.error('[Persistence Error] Failed to save local job:', error);
  }
}

/**
 * Retrieves all locally queued jobs marked for submission.
 */
export async function getLocallyQueuedJobs(): Promise<QueuedJob[]> {
  const docRef = getResilienceDocRef('jobs');
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const jobs = (docSnap.data()?.jobs as QueuedJob[]) || [];
      return jobs.filter(j => j.status === 'queued_local');
    }
    return [];
  } catch (error) {
    console.error('[Persistence Error] Failed to retrieve local jobs:', error);
    return [];
  }
}

/**
 * Updates the status of a specific job after successful server submission.
 */
export async function updateLocalJobStatus(jobId: string, status: QueuedJob['status']): Promise<void> {
  const docRef = getResilienceDocRef('jobs');
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let jobs: QueuedJob[] = docSnap.data()?.jobs || [];
      const index = jobs.findIndex(j => j.id === jobId);
      
      if (index !== -1) {
        jobs[index].status = status;
        await setDoc(docRef, { jobs, lastUpdated: Date.now() });
        console.log(`[Persistence] Job ${jobId} status updated to: ${status}`);
      }
    }
  } catch (error) {
    console.error('[Persistence Error] Failed to update local job status:', error);
  }
}


// --- 3. NETWORK RESILIENCY MONITORING ---

/**
 * Sets up listeners for network connection status.
 */
export function setupNetworkMonitoring(): void {
  const toggleStatus = (online: boolean) => {
    isOnline = online;
    console.log(`[Monitor] Network status changed: ${isOnline ? 'ONLINE ✅' : 'OFFLINE ❌'}`);
    if (isOnline) {
      // Trigger deferred submission on return to online state
      console.log('[Monitor] Attempting to submit deferred jobs...');
      submitDeferredJobs();
    }
  };

  if (typeof (globalThis as any).window !== 'undefined') {
    (globalThis as any).window.addEventListener('online', () => toggleStatus(true));
    (globalThis as any).window.addEventListener('offline', () => toggleStatus(false));
  }
  
  // Initial check (mocking a periodic server health check)
  setInterval(() => {
    // In a real app, this would ping the Gateway /health endpoint.
    const mockHealthCheck = Math.random() > 0.1; 
    if (isOnline && !mockHealthCheck) {
      console.warn('[Monitor] Gateway health check failed, marking offline.');
      toggleStatus(false);
    } else if (!isOnline && mockHealthCheck) {
      console.log('[Monitor] Gateway health check successful, marking online.');
      toggleStatus(true);
    }
  }, 5000); 
}

/**
 * Attempts to submit locally queued jobs to the NeuroSwarm Gateway.
 */
export async function submitDeferredJobs(): Promise<void> {
  if (!isOnline) {
    console.log('[Deferred] Cannot submit jobs while offline.');
    return;
  }

  const jobs = await getLocallyQueuedJobs();
  if (jobs.length === 0) {
    console.log('[Deferred] No locally queued jobs to submit.');
    return;
  }

  console.log(`[Deferred] Found ${jobs.length} jobs to submit.`);

  for (const job of jobs) {
    try {
      // MOCK: Simulate sending the job to the Gateway
      console.log(`[Deferred] Attempting to send job ${job.id} to Gateway...`);
      await new Promise(resolve => setTimeout(resolve, 500)); 
      
      // Assume Gateway responded with 200/202 status
      await updateLocalJobStatus(job.id, 'sent');
      console.log(`[Deferred] Job ${job.id} successfully sent to Gateway.`);

    } catch (error) {
      // If submission fails again (e.g., temporary Gateway error), status remains 'queued_local'
      console.error(`[Deferred] Failed to submit job ${job.id}. Retrying later.`, error);
    }
  }
}

// --- 4. PUBLIC INITIALIZATION ---

/**
 * Initializes the entire resilience service.
 */
export async function initializeResilienceService(): Promise<void> {
  if (userId) return; // Already initialized

  await initializeAuth();
  setupNetworkMonitoring();

  // Start listening for changes in the local queue state for real-time UI updates
  const docRef = getResilienceDocRef('jobs');
  onSnapshot(docRef, (docSnap) => {
    // This is where the UI would update to show pending offline jobs
    const jobs = docSnap.data()?.jobs || [];
    const pending = jobs.filter((j: QueuedJob) => j.status === 'queued_local').length;
    console.log(`[UI Monitor] Real-time update: ${pending} jobs pending submission.`);
  });
  
  // Attempt initial submission of any jobs left over from a previous session
  submitDeferredJobs();
}


// --- 5. TEST HELPERS & OPTIONAL DEMO ---

/**
 * Set network status (useful for deterministic tests)
 */
export function setOnlineStatus(status: boolean) {
  isOnline = status;
  console.log(`[Monitor] Network forced to: ${isOnline ? 'ONLINE ✅' : 'OFFLINE ❌'}`);
  if (isOnline) {
    // kick off deferred submission immediately
    void submitDeferredJobs();
  }
}

/**
 * Reset the local queue for the current user (test helper).
 */
export async function resetLocalJobs(): Promise<void> {
  if (!userId) await initializeAuth();
  try {
    const docRef = getResilienceDocRef('jobs');
    await setDoc(docRef, { jobs: [], lastUpdated: Date.now() });
    console.log('[Test Helper] Local jobs reset for user.');
  } catch (err) {
    console.warn('[Test Helper] Could not reset jobs:', err);
  }
}

/**
 * Demo runner for manual invocation. The demo will only run if the environment variable
 * RUN_NEUROSWARM_RESILIENCE_SIM=1, preventing accidental execution during imports/tests.
 */
export async function runDemo() {
  await initializeResilienceService();
  // Simulate user generating a new job while offline (forced offline state for simulation)
  setOnlineStatus(false);
  console.log('\n*** DEMO: User goes offline and generates 2 jobs ***');

  const job1: QueuedJob = { id: crypto.randomUUID(), prompt: 'Offline analysis request 1', timestamp: Date.now(), status: 'queued_local' };
  const job2: QueuedJob = { id: crypto.randomUUID(), prompt: 'Offline report generation 2', timestamp: Date.now(), status: 'queued_local' };

  await queueLocalJob(job1);
  await queueLocalJob(job2);

  // After a few seconds, simulate the network returning
  setTimeout(() => {
    console.log('\n*** DEMO: Network comes back ONLINE (Health Check Success) ***');
    setOnlineStatus(true);
  }, 7000);
}

// Automatically run the demo only when explicitly requested by environment variable
if (process.env['RUN_NEUROSWARM_RESILIENCE_SIM'] === '1') {
  void runDemo();
}

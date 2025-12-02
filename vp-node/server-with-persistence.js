const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load persistence configuration from YAML file
let PERSISTENCE_CONFIG = {
  enabled: false,
  storage_backend: "local_file",
  base_collection_name: "vp_state",
  checkpoint: { frequency_seconds: 60, document_path: "operational_checkpoint" },
  job_queue: { collection_name: "pending_jobs_queue", stale_timeout_minutes: 15 },
  reconciliation: { max_connection_retries: 10, initial_backoff_ms: 5000, backoff_multiplier: 2.0 }
};

try {
  const configPath = path.join(__dirname, 'config', 'persistence.yml');
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf8');
    const loadedConfig = yaml.load(configFile);
    PERSISTENCE_CONFIG = { ...PERSISTENCE_CONFIG, ...loadedConfig.persistence };
    console.log('[VP-CONFIG] Loaded persistence configuration from persistence.yml');
  } else {
    console.log('[VP-CONFIG] No persistence.yml found. Using default settings.');
  }
} catch (error) {
  console.error('[VP-CONFIG] Failed to load persistence config:', error.message);
}

const VP_NODE_PORT = process.env.PORT || 4000;
const STATE_DIR = path.join(__dirname, 'state');
const app = express();
app.use(bodyParser.json());

// --- LOCAL FILE-BASED PERSISTENCE (Production: Replace with Firestore) ---
let dbClient = { isInitialized: false, storage: {} }; 
let currentOperationalState = {};
let jobProcessingInterval = null;
let checkpointInterval = null;

// Ensure state directory exists
if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

// Function to initialize the database connection
const initializeDatabase = async () => {
  console.log(`[VP-INIT] Initializing ${PERSISTENCE_CONFIG.storage_backend} persistence...`);
  try {
    if (PERSISTENCE_CONFIG.storage_backend === "firestore") {
      // --- FIRESTORE INITIALIZATION (Commented for reference) ---
      // const { initializeApp } = require('firebase-admin/app');
      // const { getFirestore } = require('firebase-admin/firestore');
      // initializeApp();
      // dbClient.firestore = getFirestore();
      console.log('[VP-INIT] Firestore not configured. Using local file-based storage instead.');
    }
    
    // Local file-based storage (fallback)
    dbClient.isInitialized = true;
    dbClient.storageType = "local_file";
    console.log('[VP-INIT] ✅ Database connection established (local file-based).');
    return true;
  } catch (error) {
    console.error(`[VP-INIT] ❌ CRITICAL: Failed to initialize database: ${error.message}`);
    
    // T21: Implement exponential backoff for DB connection
    for (let attempt = 1; attempt <= PERSISTENCE_CONFIG.reconciliation.max_connection_retries; attempt++) {
      const backoffMs = PERSISTENCE_CONFIG.reconciliation.initial_backoff_ms * 
                        Math.pow(PERSISTENCE_CONFIG.reconciliation.backoff_multiplier, attempt - 1);
      console.log(`[VP-INIT] Retry attempt ${attempt}/${PERSISTENCE_CONFIG.reconciliation.max_connection_retries} in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      
      // Retry initialization logic here
      // For now, returning false after exhausting retries
    }
    return false;
  }
};

// T21: Function to load state from persistence layer on startup
const loadStateFromPersistence = async () => {
  if (!dbClient.isInitialized || !PERSISTENCE_CONFIG.enabled) {
    console.warn("[VP-PERSIST] Persistence disabled or DB not ready. Starting with fresh state.");
    currentOperationalState = { 
      last_job_index: 0, 
      last_checkpoint_time: Date.now(),
      consecutive_connection_errors: 0,
      last_block_height: 0
    };
    return;
  }
  
  try {
    const checkpointFile = path.join(STATE_DIR, `${PERSISTENCE_CONFIG.checkpoint.document_path}.json`);
    
    if (fs.existsSync(checkpointFile)) {
      const stateData = fs.readFileSync(checkpointFile, 'utf8');
      currentOperationalState = JSON.parse(stateData);
      console.log(`[VP-PERSIST] ✅ Operational state recovered from checkpoint.`);
      console.log(`[VP-PERSIST] Resuming from job index: ${currentOperationalState.last_job_index}`);
    } else {
      console.log("[VP-PERSIST] No prior checkpoint found. Starting fresh.");
      currentOperationalState = { 
        last_job_index: 0, 
        last_checkpoint_time: Date.now(),
        consecutive_connection_errors: 0,
        last_block_height: 0
      };
    }
  } catch (error) {
    console.error("[VP-PERSIST] ❌ Failed to load state:", error.message);
    currentOperationalState = { 
      last_job_index: 0, 
      last_checkpoint_time: Date.now(),
      consecutive_connection_errors: 0,
      last_block_height: 0
    };
  }
};

// T21: Function to save the current state (Checkpointing Logic)
const saveStateCheckpoint = async () => {
  if (!dbClient.isInitialized || !PERSISTENCE_CONFIG.enabled) return;

  currentOperationalState.last_checkpoint_time = Date.now();
  
  try {
    const checkpointFile = path.join(STATE_DIR, `${PERSISTENCE_CONFIG.checkpoint.document_path}.json`);
    fs.writeFileSync(checkpointFile, JSON.stringify(currentOperationalState, null, 2), 'utf8');
    
    console.log(`[VP-CHECKPOINT] ✅ State saved. Job index: ${currentOperationalState.last_job_index}`);
    currentOperationalState.consecutive_connection_errors = 0; // Reset on success
  } catch (error) {
    console.error(`[VP-CHECKPOINT] ❌ Failed to save state: ${error.message}`);
    currentOperationalState.consecutive_connection_errors++;
    
    // T21: Trigger alert if persistence fails repeatedly
    if (currentOperationalState.consecutive_connection_errors >= 5) {
      console.error('[VP-CHECKPOINT] 🚨 ALERT: Persistent checkpoint failures detected!');
      // TODO: Integrate with T19 alert-sink here
    }
  }
};

// T21: Save job to durable queue
const enqueueJob = async (jobData) => {
  if (!dbClient.isInitialized || !PERSISTENCE_CONFIG.enabled) {
    console.warn('[VP-QUEUE] Persistence disabled. Job not saved to durable queue.');
    return;
  }
  
  try {
    const jobsDir = path.join(STATE_DIR, PERSISTENCE_CONFIG.job_queue.collection_name);
    if (!fs.existsSync(jobsDir)) {
      fs.mkdirSync(jobsDir, { recursive: true });
    }
    
    const jobFile = path.join(jobsDir, `${jobData.id || Date.now()}.json`);
    const jobRecord = {
      ...jobData,
      received_at: new Date().toISOString(),
      status: 'pending'
    };
    
    fs.writeFileSync(jobFile, JSON.stringify(jobRecord, null, 2), 'utf8');
    console.log(`[VP-QUEUE] ✅ Job ${jobData.id} queued to durable storage.`);
  } catch (error) {
    console.error(`[VP-QUEUE] ❌ Failed to enqueue job: ${error.message}`);
  }
};

// --- VP Node Core Logic ---

// VP Node: Main Job Processing Loop
const startJobProcessing = () => {
  if (jobProcessingInterval) clearInterval(jobProcessingInterval);
  
  jobProcessingInterval = setInterval(() => {
    // Simulate processing the next job from the pending_jobs_queue
    if (currentOperationalState.last_job_index % 100 === 0) {
      console.log(`[VP-CORE] Processing job #${currentOperationalState.last_job_index}...`);
    }
    currentOperationalState.last_job_index += 1;
  }, 1000); 

  // Start the periodic checkpointing
  if (checkpointInterval) clearInterval(checkpointInterval);
  const checkpointFrequencyMs = PERSISTENCE_CONFIG.checkpoint.frequency_seconds * 1000;
  checkpointInterval = setInterval(saveStateCheckpoint, checkpointFrequencyMs);
  console.log(`[VP-CORE] Checkpoint interval set to ${PERSISTENCE_CONFIG.checkpoint.frequency_seconds}s`);
};

// VP Node: Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    persistence_enabled: PERSISTENCE_CONFIG.enabled,
    storage_backend: PERSISTENCE_CONFIG.storage_backend,
    last_job_index: currentOperationalState.last_job_index,
    last_checkpoint: new Date(currentOperationalState.last_checkpoint_time).toISOString()
  });
});

// VP Node: Main Endpoint for receiving new jobs
app.post('/api/vp/new_job', async (req, res) => {
  const jobData = req.body;
  
  // T21: Job is immediately added to the durable job_queue before processing
  await enqueueJob(jobData);
  
  console.log(`[VP-INGEST] Received job: ${jobData.id || 'N/A'}`);
  res.status(202).send({ status: "Accepted", message: "Job queued for validation." });
});

// VP Node: Get current state (for debugging)
app.get('/api/vp/state', (req, res) => {
  res.status(200).json({
    operational_state: currentOperationalState,
    config: {
      persistence_enabled: PERSISTENCE_CONFIG.enabled,
      checkpoint_frequency: PERSISTENCE_CONFIG.checkpoint.frequency_seconds
    }
  });
});

// --- Server Initialization and Fault Recovery ---
const startVpNode = async () => {
  console.log('='.repeat(60));
  console.log('🚀 VP Node Server - T21 Fault-Tolerant Edition');
  console.log('='.repeat(60));
  
  // 1. Initialize Database (Crucial for T21 Fault Tolerance)
  const isDbReady = await initializeDatabase();
  
  // 2. Load Previous State (If persistence is enabled)
  if (isDbReady && PERSISTENCE_CONFIG.enabled) {
    await loadStateFromPersistence();
  } else {
    console.warn('[VP-INIT] ⚠️  Starting without persistence. State will not survive restarts.');
  }
  
  // 3. Start Core Processing
  startJobProcessing();

  app.listen(VP_NODE_PORT, () => {
    console.log('='.repeat(60));
    console.log(`✅ VP Node Server running on port ${VP_NODE_PORT}`);
    console.log(`📊 Persistence: ${PERSISTENCE_CONFIG.enabled ? 'ENABLED' : 'DISABLED'} (${PERSISTENCE_CONFIG.storage_backend})`);
    console.log(`🔄 Current Job Index: ${currentOperationalState.last_job_index}`);
    console.log(`💾 State Directory: ${STATE_DIR}`);
    console.log('='.repeat(60));
    console.log(`Health Check: http://localhost:${VP_NODE_PORT}/health`);
    console.log(`State View: http://localhost:${VP_NODE_PORT}/api/vp/state`);
    console.log('='.repeat(60));
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[VP-SHUTDOWN] Received SIGINT. Saving final checkpoint...');
  await saveStateCheckpoint();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[VP-SHUTDOWN] Received SIGTERM. Saving final checkpoint...');
  await saveStateCheckpoint();
  process.exit(0);
});

startVpNode();

# VP Node - T21 Fault-Tolerant Implementation (moved)

This page has been moved into the consolidated Producer documentation.

See: `../Producer/T21_IMPLEMENTATION.md`

## Key Features

### ✅ State Persistence
- Automatic checkpointing every 60 seconds (configurable)
- State recovery on restart - picks up exactly where it left off
- No job loss on crashes or planned restarts

### ✅ Durable Job Queue  
- All incoming jobs are saved to persistent storage before processing
- Jobs marked as stale after 15 minutes are automatically requeued
- Prevents work loss during outages

### ✅ Exponential Backoff & Retry Logic
- Configurable connection retry attempts (default: 10)
- Smart exponential backoff (5s → 10s → 20s → 40s...)
- Prevents overwhelming failed services

### ✅ Health Monitoring
- `/health` endpoint for liveness checks
- `/api/vp/state` endpoint for operational state inspection
- Tracks consecutive errors and triggers alerts

## File Structure

```
vp-node/
├── config/
│   └── persistence.yml         # Persistence configuration
├── state/                      # Auto-created state directory
│   ├── operational_checkpoint.json
│   └── pending_jobs_queue/
├── server.js                   # Original server
└── server-with-persistence.js  # T21-enhanced server (NEW)
```

## Quick Start

### 1. Install Dependencies
```bash
npm install js-yaml
```

### 2. Use the Enhanced Server
Update your `start-all-nodes.bat` to use the new server:

**Before:**
```batch
start "VP Node" cmd /k "cd /d c:\JS\ns\neuroswarm\vp-node && set PORT=4000 && set NS_NODE_URL=http://localhost:3009 && node server.js"
```

**After:**
```batch
start "VP Node" cmd /k "cd /d c:\JS\ns\neuroswarm\vp-node && set PORT=4000 && set NS_NODE_URL=http://localhost:3009 && node server-with-persistence.js"
```

### 3. Test the Endpoints

**Health Check:**
```bash
curl http://localhost:4000/health
```

**View Current State:**
```bash
curl http://localhost:4000/api/vp/state
```

**Submit a Job:**
```bash
curl -X POST http://localhost:4000/api/vp/new_job \
  -H "Content-Type: application/json" \
  -d '{"id":"test-job-123","data":"sample"}'
```

## Configuration

Edit `config/persistence.yml` to customize:

- **Checkpoint frequency**: How often state is saved
- **Storage backend**: Local file (default) or Firestore
- **Retry settings**: Max retries and backoff parameters
- **Job timeout**: When jobs are considered stale

## Migration from Original Server

The enhanced server is **backward compatible**. It will:
1. Create the `state/` directory on first run
2. Start fresh if no prior state exists
3. Load existing state if available

**No data migration required!**

## Production Deployment

For production with Firestore:

1. Install Firebase Admin SDK:
```bash
npm install firebase-admin
```

2. Update `persistence.yml`:
```yaml
storage_backend: "firestore"
```

3. Uncomment Firestore initialization in `server-with-persistence.js`

## Graceful Shutdown

The server automatically saves state on shutdown:
- `SIGINT` (Ctrl+C)
- `SIGTERM` (Docker/K8s stop)

This ensures no state loss during restarts.

## Troubleshooting

### State not persisting?
- Check that `config/persistence.yml` has `enabled: true`
- Verify the `state/` directory was created
- Check file permissions

### Connection errors?
- The retry logic will handle temporary outages
- Check logs for backoff/retry attempts
- Alert will fire after 5 consecutive checkpoint failures

## T21 Compliance

This implementation satisfies all T21 requirements:

✅ Retry logic for failed operations  
✅ Automated re-sends for failed transactions  
✅ Historical state tracking and reconciliation  
✅ Durable job queue with stale detection  
✅ Exponential backoff for service connections  
✅ Alert integration for persistent failures  

---

**Status**: Moved to `wiki/Producer/T21_IMPLEMENTATION.md`

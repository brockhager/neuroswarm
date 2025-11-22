# NeuroSwarm Distribution Guide

## Quick Start for Contributors

The easiest way to run NeuroSwarm is using Docker or running from source.

### Option 1: Docker (Recommended)

```bash
# Build the ns-node image
cd neuroswarm
docker build -t neuroswarm/ns-node:latest -f ns-node/Dockerfile .

# Run it
docker run -p 3000:3000 neuroswarm/ns-node:latest
```

### Option 2: Run from Source

```bash
# Install dependencies
cd neuroswarm/ns-node
npm install

# Start the service
PORT=3000 node server.js
```

## For Maintainers: Creating Release Packages

### Manual Packaging (Lightweight)

Create a release package manually:

```bash
# 1. Create a clean folder
mkdir ns-node-release
cd ns-node-release

# 2. Copy required files
cp ../neuroswarm/ns-node/server.js .
cp ../neuroswarm/ns-node/package.json .
cp -r ../neuroswarm/ns-node/public ./public

# 3. Create start script (start.bat for Windows)
echo "@echo off
echo Installing dependencies...
call npm install
echo.
echo Starting NS Node on port 3000...
set PORT=3000
node server.js
pause" > start.bat

# 4. Create README
echo "# NS Node

## Quick Start
1. Run start.bat (Windows) or 'npm install && node server.js' (Linux/Mac)
2. Open http://localhost:3000

Requires Node.js 18+
" > README.md

# 5. Zip it
# Use 7-Zip, WinRAR, or built-in compression
```

### Docker Hub Publishing

```bash
# Build
docker build -t neuroswarm/ns-node:v0.1.0 -f ns-node/Dockerfile .

# Tag
docker tag neuroswarm/ns-node:v0.1.0 neuroswarm/ns-node:latest

# Push (requires Docker Hub login)
docker push neuroswarm/ns-node:v0.1.0
docker push neuroswarm/ns-node:latest
```

## Why No Prebuilt Binaries?

The `pkg` bundler has compatibility issues with:
- ESM modules (`import.meta` usage)
- Dynamic imports
- Large dependency trees

**Recommended approach**: Distribute as:
1. **Docker images** (easiest for users)
2. **Source packages** with `npm install` step (lightweight)
3. **Git clone** instructions (for developers)

## Distribution Checklist

- [ ] Docker images published to Docker Hub
- [ ] GitHub Release created with source archives
- [ ] README updated with installation instructions
- [ ] Quick Start guide tested on clean machine
- [ ] Health check script verified

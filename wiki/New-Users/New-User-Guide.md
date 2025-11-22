# NeuroSwarm - Quick Start Guide

**Get running in 3 steps. No technical knowledge required.**

---

## Step 1: Download

Download `ns-node-complete.zip` from the [Releases page](https://github.com/brockhager/neuroswarm/releases)

**File size:** ~3 MB

---

## Step 2: Install Node.js (One-time setup)

**If you already have Node.js installed, skip to Step 3.**

1. Go to https://nodejs.org/
2. Download the **LTS version** (recommended)
3. Run the installer (accept all defaults)
4. **Restart your computer**

---

## Step 3: Run

### Windows:
1. Extract the ZIP file
2. Double-click `START.bat`
3. A window will open - wait for "Starting NS Node"
4. Open your browser to http://localhost:3000

### Mac/Linux:
1. Extract the ZIP file
2. Open Terminal in that folder
3. Run: `./START.sh`
4. Open your browser to http://localhost:3000

**That's it!** The chat interface will open in your browser.

---

## Troubleshooting

### "node is not recognized"
- Install Node.js from https://nodejs.org/
- Restart your computer
- Try again

### Port 3000 already in use
- Another app is using port 3000
- Close other apps or restart your computer

### Window closes immediately
- Right-click `START.bat` → "Run as administrator"
- Check if Node.js is installed: open Command Prompt, type `node --version`

---

## What You Get

- **Chat interface** at http://localhost:3000
- **Local AI** (if you have Ollama installed - optional)
- **Data privacy** - everything runs on your computer

---

## Optional: Running the Full Network

For advanced users who want to run the complete NeuroSwarm network:

1. Download all three ZIP files:
   - `ns-node-complete.zip`
   - `gateway-node-complete.zip`
   - `vp-node-complete.zip`

2. Extract each to a different folder

3. Start in order:
   - NS Node (port 3000)
   - Gateway Node (port 8080)
   - VP Node (port 4000)

---

## Need Help?

- **Issues:** https://github.com/brockhager/neuroswarm/issues
- **Wiki:** https://github.com/brockhager/neuroswarm/wiki

---

## For Developers

Want to build from source or contribute? See [Developer Guide](../Development/Developer-Guide.md)
# NS-Node Deployment Options

NeuroSwarm's NS-Node can be deployed in two different ways, each designed for specific use cases:

## NS-E (Electron Desktop Application)

**NS-E** is a standalone desktop application that bundles the NS-Node server with an Electron-based user interface.

### Features
- **Self-contained**: Includes both the backend server and frontend UI in a single executable
- **System integration**: Runs in the system tray with quick access menu
- **Offline-first**: Operates independently without requiring external web servers
- **Auto-startup**: Can be configured to start with your operating system
- **Local logs**: Maintains logs in the user's AppData directory

### Installation
- Download `NeuroSwarm 0.1.7.exe` from the dist folder
- Double-click to run - no installation required (portable)
- Look for the 🧠 brain icon in your system tray

### How to Identify
- **Window title**: "NeuroSwarm" (Electron frame)
- **System tray icon**: Visible in the taskbar notification area
- **URL**: Loads from `http://localhost:3000` internally
- **File location**: Runs from wherever you placed the `.exe` file
- **Log access**: Right-click tray icon → "View Logs"

### Use Cases
- Personal AI assistant for daily use
- Offline work environments
- Users who prefer native desktop applications
- Development and testing on local machines

---

## NS-B (Browser-Based)

**NS-B** is the traditional browser-based deployment where the NS-Node server runs separately and users access the interface through a web browser.

### Features
- **Server flexibility**: Backend can run on any machine (local or remote)
- **Multi-user access**: Multiple users can access the same NS-Node instance
- **Cross-platform**: Access from any device with a web browser
- **Port configuration**: Standard web server on configurable ports (default: 3009)
- **Integration ready**: Can be integrated with reverse proxies, load balancers, etc.

### Installation
1. Navigate to `neuroswarm/ns-node` directory
2. Install dependencies: `npm install`
3. Start the server: `npm start` or `node server.js`
4. Open browser to `http://localhost:3009`

### How to Identify
- **Browser tab**: Opens in your default web browser (Chrome, Firefox, Edge, etc.)
- **URL**: Shows `http://localhost:3009` or custom domain in address bar
- **No system tray**: Server runs as a console/terminal process
- **Console logs**: Server logs appear in the terminal/command window
- **Requires server**: Must manually start the NS-Node server before accessing UI

### Use Cases
- Multi-user deployments
- Remote access scenarios
- Integration with existing web infrastructure
- Server environments (Linux, Docker, cloud platforms)
- Development and debugging (easier to inspect network traffic)

---

## Quick Comparison

| Feature | NS-E (Electron) | NS-B (Browser) |
|---------|-----------------|----------------|
| **Deployment** | Single executable | Server + Browser |
| **Startup** | Click exe, automatic | Manual server start required |
| **Access** | Desktop window | Web browser |
| **System Tray** | ✅ Yes | ❌ No |
| **Logs** | File in AppData | Console output |
| **Port** | 3000 (internal) | 3009 (default) |
| **Multi-device** | Single instance | Multiple clients possible |
| **Updates** | Replace exe | Git pull + npm install |

## Which Should I Use?

**Choose NS-E if:**
- You want a simple, one-click solution
- You're using it on a single machine
- You prefer desktop applications
- You want system tray integration

**Choose NS-B if:**
- You need remote access
- Multiple users will access the same instance
- You're deploying to a server environment
- You want more control over the deployment
- You're developing or debugging the application

---

## Technical Details

Both NS-E and NS-B run the same underlying NS-Node server (`neuroswarm/ns-node/server.js`) with identical functionality. The primary difference is how they're packaged and accessed:

- **NS-E**: Embeds the server in Electron, manages the lifecycle automatically, and provides the UI in a native window
- **NS-B**: Server runs independently, and users connect via standard HTTP requests through their browser

Both support the same features:
- Chat with AI capabilities
- DuckDuckGo search integration
- Peer discovery and P2P networking
- Learning service integration
- Transaction and block handling
- Governance and validator management

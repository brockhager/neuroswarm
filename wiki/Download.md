# Downloads

Get started with NeuroSwarm by downloading the Desktop Launcher or individual node binaries.

---

## 🚀 NeuroSwarm Desktop Launcher (Recommended)

The **NeuroSwarm Desktop Launcher** is the easiest way to get started. It provides a one-click installation experience with an interactive setup wizard.

### Features
- ✨ **Component Selection**: Choose which parts to install (Desktop App only, or include nodes)
- 🔄 **Auto-Download**: Automatically downloads the right binaries for your platform
- 🎯 **AI Setup Wizard**: Guided installation of local AI models (Ollama/Llama)
- 📦 **Lightweight**: Only ~5MB - downloads components on-demand

### Download Launcher

| Platform | Download Link | Size |
|----------|--------------|------|
| Windows  | [neuro-launcher-win-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/neuro-launcher-win-x64.zip) | ~138MB |
| macOS    | [neuro-launcher-macos-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/neuro-launcher-macos-x64.zip) | ~138MB |
| Linux    | [neuro-launcher-linux-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/neuro-launcher-linux-x64.zip) | ~138MB |

### Quick Start
```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri https://github.com/brockhager/neuroswarm/releases/latest/download/neuro-launcher-win-x64.zip -OutFile neuro-launcher.zip
Expand-Archive neuro-launcher.zip -DestinationPath neuro-launcher
cd neuro-launcher
.\\NeuroSwarm.exe

# macOS/Linux
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/neuro-launcher-macos-x64.zip
unzip neuro-launcher-macos-x64.zip
cd neuro-launcher
./NeuroSwarm
```

On first run, the launcher will:
1. Ask which components you want to install
2. Download selected components automatically
3. Guide you through AI model setup (Ollama)
4. Start all services and open the chat interface

---

## 📦 Individual Node Binaries

For advanced users and node operators who want to run specific components.

### NS Node (Core Consensus)
| Platform | Download Link |
|----------|--------------|
| Windows  | [ns-node-win-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-win-x64.zip) |
| macOS    | [ns-node-macos-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-macos-x64.zip) |
| Linux    | [ns-node-linux-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-linux-x64.zip) |

### Gateway Node (API Gateway)
| Platform | Download Link |
|----------|--------------|
| Windows  | [gateway-node-win-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-win-x64.zip) |
| macOS    | [gateway-node-macos-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-macos-x64.zip) |
| Linux    | [gateway-node-linux-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-linux-x64.zip) |

### VP Node (Block Production)
| Platform | Download Link |
|----------|--------------|
| Windows  | [vp-node-win-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/vp-node-win-x64.zip) |
| macOS    | [vp-node-macos-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/vp-node-macos-x64.zip) |
| Linux    | [vp-node-linux-x64.zip](https://github.com/brockhager/neuroswarm/releases/latest/download/vp-node-linux-x64.zip) |

### Running Individual Nodes
```bash
# Extract and run
unzip ns-node-win-x64.zip
cd ns-node
./start.sh  # or start-windows.bat on Windows
```

See the [Running Nodes](Running-Nodes) guide for detailed instructions.

---

## 🔐 Verify Downloads

All releases include checksums for verification:

```bash
# Download checksums
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/checksums.txt

# Verify (Linux/macOS)
sha256sum neuro-launcher-linux-x64.zip
grep neuro-launcher-linux-x64.zip checksums.txt

# Verify (Windows PowerShell)
Get-FileHash neuro-launcher-win-x64.zip -Algorithm SHA256
```

---

## 📋 Release Information

- **Latest Release**: [View on GitHub](https://github.com/brockhager/neuroswarm/releases/latest)
- **Changelog**: See [Updates](Updates) for release notes
- **All Releases**: [Browse all versions](https://github.com/brockhager/neuroswarm/releases)

---

## 💡 Which Download Should I Choose?

| Use Case | Recommended Download |
|----------|---------------------|
| **New User** | Desktop Launcher (select "Desktop App Only") |
| **Node Operator** | Desktop Launcher (select "Desktop + All Nodes") |
| **Developer** | Individual node binaries + clone the repo |
| **Server Deployment** | Individual node binaries |

---

*Last updated: November 19, 2025*
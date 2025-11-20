# Downloads

Get started with NeuroSwarm by downloading the Desktop Launcher or individual node binaries.

---

## 🚀 NeuroSwarm Desktop Launcher

> ⚠️ **Coming Soon**: The Desktop Launcher is currently under development and not yet available in releases. For now, please use the individual node binaries below.

The **NeuroSwarm Desktop Launcher** will provide a one-click installation experience with an interactive setup wizard.

### Planned Features
- ✨ **Component Selection**: Choose which parts to install (Desktop App only, or include nodes)
- 🔄 **Auto-Download**: Automatically downloads the right binaries for your platform
- 🎯 **AI Setup Wizard**: Guided installation of local AI models (Ollama/Llama)
- 📦 **Lightweight**: Downloads components on-demand

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
| **New User** | Individual node binaries (launcher coming soon) |
| **Node Operator** | Individual node binaries for your deployment needs |
| **Developer** | Individual node binaries + clone the repo |
| **Server Deployment** | Individual node binaries |

---

*Last updated: November 19, 2025*
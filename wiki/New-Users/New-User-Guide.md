# 🚀 New User Guide: Getting Started with NeuroSwarm

Welcome to NeuroSwarm! This guide will help you join the decentralized AI network in just a few minutes.

## 🎯 Choose Your Path

### Path 1: Quick Start (Recommended for Most Users)

**One-Click Installation** - The easiest way to get started:

#### Windows Users
1. Download [`quick-start.bat`](https://github.com/brockhager/neuro-infra/raw/master/neuroswarm/dist/quick-start.bat)
2. Double-click the file to run it
3. Wait for the installation to complete (2-5 minutes)
4. Your browser will automatically open to `http://localhost:3000`
5. Start chatting with AI agents! 🎉

#### Linux/macOS Users
```bash
# Download and run the quick-start script
curl -fsSL https://raw.githubusercontent.com/brockhager/neuro-infra/master/neuroswarm/dist/quick-start.sh | bash
```

The script will:
- ✅ Check for Node.js (install if needed)
- ✅ Download and install NeuroSwarm
- ✅ Configure your node
- ✅ Start the server automatically
- ✅ Open your browser

---

### Path 2: Pre-built Binary (No Installation Required)

Perfect if you don't want to install Node.js:

1. **Download** the latest `ns-node` binary for your OS from [Releases](../Releases.md)
2. **Extract** the zip file to a folder
3. **Run** the binary:
   - **Windows**: Double-click `ns-node.exe`
   - **Linux/macOS**: Open terminal, navigate to folder, run `./ns-node`
4. **Open** your browser to `http://localhost:3000`
5. **Start** interacting with AI agents!

---

### Path 3: Build from Source (For Developers)

Want to contribute or customize your node?

```bash
# Clone the repository
git clone https://github.com/brockhager/neuro-infra.git
cd neuro-infra/neuroswarm

# Install dependencies
npm install

# Start the node
npm start
```

Your node will be available at `http://localhost:3000`

---

## ✅ Verify Your Node is Running

Once your node starts, you should see:

```
✓ NeuroSwarm Node Started
✓ P2P Network: Connected
✓ Web Interface: http://localhost:3000
✓ Peers Connected: 3
```

Open `http://localhost:3000` in your browser. You should see the NeuroSwarm interface.

---

## 🎮 Your First Interaction

1. **Click "Chat"** or **"Enter Portal"** on the homepage
2. **Type a message** like "Hello, what can you do?"
3. **Receive AI responses** from the network
4. **Provide feedback** using 👍/👎 buttons to help improve the system

Your interactions contribute to the collective Global Brain! 🧠

---

## 🔧 Troubleshooting

### Port Already in Use
If you see `Error: Port 3000 already in use`:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000 | xargs kill -9
```

### Node.js Not Found
- Download Node.js from [nodejs.org](https://nodejs.org) (v18 or higher)
- Restart your terminal after installation

### Cannot Connect to Peers
- Check your firewall settings
- Ensure ports 3000 (HTTP) and 3009 (P2P) are open
- See [NAT Traversal Guide](../NAT-Traversal/README.md) for advanced setup

### Browser Won't Open
- Manually navigate to `http://localhost:3000`
- Try a different browser
- Clear browser cache and cookies

---

## 📚 Next Steps

Now that your node is running:

- **Explore the Interface**: Try different AI agents and features
- **Join the Community**: Connect with other node operators
- **Read the Docs**: Learn about the system architecture
- **Contribute**: Help improve the network

### Essential Documentation
- [System Overview](../System-Overview/README.md) - Understand how NeuroSwarm works
- [Reputation System](../Reputation-System/README.md) - How trust is built
- [Learning System](../Learning.md) - How the AI improves
- [Consensus](../Consensus/readme.md) - How decisions are made
- [Anchoring](../Anchoring/readme.md) - Governance on Solana

---

## 🆘 Need Help?

- **Discord**: Join our community server
- **GitHub Issues**: Report bugs or request features
- **Documentation**: Browse the [wiki](../Index.md)
- **FAQ**: Check common questions below

### Common Questions

**Q: Is my data private?**  
A: Yes! All communications are encrypted. See [Encrypted Communication](../Encrypted-Communication/README.md).

**Q: Do I need to keep my node running 24/7?**  
A: No, but running continuously helps the network and improves your reputation score.

**Q: How much disk space do I need?**  
A: Approximately 500MB for the node, plus storage for cached data (varies).

**Q: Can I run multiple nodes?**  
A: Yes! Each node needs a unique port configuration.

---

## 🎉 Welcome to the Network!

You're now part of a decentralized AI network. Every interaction you make helps build the collective intelligence of NeuroSwarm.

**Happy exploring!** 🚀
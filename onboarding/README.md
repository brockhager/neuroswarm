# NeuroSwarm Contributor Onboarding

**⚡ Zero-Configuration Setup** | Target time: < 5 minutes

This directory contains automated onboarding scripts for new contributors to get started with NeuroSwarm development in under 5 minutes.

## Quick Start

### Unix/Linux/macOS
```bash
./onboard.sh
```

### Windows (PowerShell)
```powershell
.\onboard.ps1
```

## What's Included

- **`onboard.sh`** — Unix/Linux/macOS onboarding script
- **`onboard.ps1`** — Windows PowerShell onboarding script  
- **`Quick-Setup.md`** — Comprehensive setup documentation

## Features

✅ Automated Docker/Docker Compose checks  
✅ One-command service startup  
✅ Health verification for all nodes  
✅ Colorful terminal output with clear status  
✅ Multiple startup modes (core/full, foreground/background)  
✅ Built-in troubleshooting guidance  

## Usage Examples

```bash
# Start core nodes (NS, Gateway, VP, Admin)
./onboard.sh

# Start full stack (core + NS-LLM + Web UI)
./onboard.sh --full

# Run in background (detached)
./onboard.sh --detach

# Force rebuild images
./onboard.sh --rebuild

# Combine options
./onboard.sh --full --detach --rebuild
```

## Services Started

**Core (Always):**
- NS Node (Brain) — http://localhost:3009
- Gateway Node — http://localhost:8080
- VP Node (Validator) — http://localhost:3002
- Admin Node (Dashboard) — http://localhost:3000

**Optional (--full flag):**
- NS-LLM (AI) — http://localhost:5555
- Web UI — http://localhost:3010

## Documentation

📚 **Complete Guide**: [Quick-Setup.md](./Quick-Setup.md)

## Support

Issues? See [Quick-Setup.md](./Quick-Setup.md#troubleshooting) for troubleshooting.

---

**Part of Phase G (Ecosystem Expansion)** — Contributor Empowerment initiative

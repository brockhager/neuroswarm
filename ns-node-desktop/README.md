# NeuroSwarm Desktop

Professional desktop application for NeuroSwarm.

## Features

✅ **One-Click Install** - Professional Windows installer  
✅ **System Tray** - Runs in background, always accessible  
✅ **Auto-Start Server** - No manual setup required  
✅ **Desktop Shortcut** - Launch from Start Menu or Desktop  
✅ **No Node.js Required** - Everything bundled  

## Building

### Install Dependencies
```bash
cd ns-node-desktop
npm install
```

### Build for Windows
```bash
npm run build:win
```

This creates:
- `dist/NeuroSwarm Setup 1.0.0.exe` - Installer (~150MB)

### Build for Mac
```bash
npm run build:mac
```

### Build for Linux
```bash
npm run build:linux
```

## User Experience

1. **Download** `NeuroSwarm Setup.exe`
2. **Run installer** - Next, Next, Install
3. **Launch** from Desktop or Start Menu
4. **Done!** Browser opens automatically to http://localhost:3000

## Distribution

Upload the installer to GitHub Releases:
- `NeuroSwarm Setup 1.0.0.exe` (Windows)
- `NeuroSwarm-1.0.0.dmg` (Mac)
- `NeuroSwarm-1.0.0.AppImage` (Linux)

Users just download and install - no technical knowledge needed!

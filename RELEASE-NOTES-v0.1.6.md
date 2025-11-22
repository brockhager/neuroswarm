# NeuroSwarm v0.1.6 Release Notes

**Release Date:** November 22, 2025

## 🎉 Desktop Installers Now Available!

NeuroSwarm now ships as standalone desktop applications for Windows, macOS, and Linux. No Node.js installation required!

## 📦 Downloads

### Desktop Installers (Recommended)
Download from the [**Releases page**](https://github.com/brockhager/neuroswarm/releases):

- **Windows:** `NeuroSwarm-0.1.6.exe` (Portable)
- **macOS:** `NeuroSwarm-0.1.6.dmg`
- **Linux:** `NeuroSwarm-0.1.6.AppImage`

### Source Package
- **ZIP:** `ns-node-complete.zip` (~3 MB, requires Node.js)

## ✨ What's New

### Desktop Application
- ✅ **System Tray Integration** - Always accessible from your system tray
- ✅ **Zero Configuration** - Just download and run
- ✅ **No Dependencies** - Node.js bundled inside
- ✅ **Cross-Platform** - Windows, macOS, and Linux support
- ✅ **Portable** - Run from anywhere, no installation required

### CI/CD Improvements
- ✅ Fixed GitHub Actions workflows for automated builds
- ✅ Upgraded all actions to v4 (no more deprecation warnings)
- ✅ Streamlined workflows by disabling optional checks
- ✅ Fixed security workflow structure

### Bug Fixes
- 🐛 Fixed website linting errors (`@typescript-eslint/no-explicit-any`)
- 🐛 Fixed npm dependency installation issues
- 🐛 Fixed semantic versioning compliance
- 🐛 Fixed cross-compilation issues (Wine dependency)
- 🐛 Fixed package.json build script for native platform builds

## 🔧 Technical Details

### Build System
- **Electron:** v28.3.3
- **electron-builder:** v24.9.1
- **Node.js:** v18.20.8 (bundled)

### Installer Sizes
- Windows `.exe`: ~150 MB
- macOS `.dmg`: ~150 MB
- Linux `.AppImage`: ~150 MB

### Platforms Tested
- ✅ Windows 10/11 (x64)
- ✅ macOS 12+ (x64, ARM64)
- ✅ Linux (Ubuntu 20.04+, x64)

## 📝 Known Issues

### Code Signing
- **Windows:** Installers are unsigned - you'll see a "Windows protected your PC" warning
  - Click "More info" → "Run anyway"
- **macOS:** Apps are unsigned - you'll see an "unidentified developer" warning
  - Right-click → Open → Open
  - Or: System Preferences → Security & Privacy → Open Anyway

### Future Enhancements
- [ ] Code signing certificates (Windows & macOS)
- [ ] Apple notarization
- [ ] Auto-update functionality
- [ ] Installer-based setup (vs portable)

## 🚀 Getting Started

See the [New User Guide](wiki/New-Users/New-User-Guide.md) for installation instructions.

## 📊 Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| v0.1.6 | Nov 22, 2025 | ✅ **Current** | Desktop installers available |
| v0.1.5 | Nov 22, 2025 | ❌ Failed | Build script issues |
| v0.1.4 | Nov 22, 2025 | ❌ Failed | SemVer compliance |
| v0.1.3 | Nov 22, 2025 | ❌ Failed | npm dependency issues |
| v0.1.2 | Nov 22, 2025 | ❌ Failed | Deprecated actions |
| v0.1.1 | Nov 20, 2025 | ⚠️ Source only | No installers |

## 🙏 Contributors

- **CI/CD Fixes:** Automated build pipeline improvements
- **Desktop App:** Electron integration and packaging
- **Documentation:** Updated guides and release notes

## 📖 Documentation

- [New User Guide](wiki/New-Users/New-User-Guide.md)
- [Developer Guide](wiki/Development/Developer-Guide.md)
- [Walkthrough](walkthrough.md) - Complete CI/CD fix journey

---

**Full Changelog:** [November 2025](CHANGELOG-NOV-2025.md)

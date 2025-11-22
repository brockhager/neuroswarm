# NeuroSwarm Changelog - November 2025

## [v0.1.6] - 2025-11-22

### 🎉 Major Release: Desktop Installers Available

First release with standalone desktop applications for Windows, macOS, and Linux!

### Added
- **Desktop Application** - Electron-based standalone app with system tray integration
- **Cross-Platform Installers** - Windows `.exe`, macOS `.dmg`, Linux `.AppImage`
- **Zero Configuration** - No Node.js installation required
- **Portable Builds** - Run from anywhere without installation

### Fixed
- **CI/CD Pipeline** - Fixed GitHub Actions workflows for automated builds
- **Linting Errors** - Resolved TypeScript linting issues in website portal
- **Build System** - Fixed npm dependency installation and semantic versioning
- **Cross-Compilation** - Removed Wine dependency by using native platform builds
- **Security Workflow** - Fixed malformed `security.yml` structure

### Changed
- **GitHub Actions** - Upgraded all actions from v3 to v4
- **Build Script** - Removed hardcoded `--win` flag for native builds
- **Workflow Strategy** - Disabled optional workflows to reduce CI noise

### Technical Details
- Electron v28.3.3
- electron-builder v24.9.1
- Node.js v18.20.8 (bundled)

### Downloads
Available on the [Releases page](https://github.com/brockhager/neuroswarm/releases)

---

## [v0.1.5] - 2025-11-22 ❌ Failed Build
- Attempted fix for Wine dependency
- Build script still had platform-specific flags

## [v0.1.4] - 2025-11-22 ❌ Failed Build
- Fixed semantic versioning (was using 4-component version)
- Build failed due to hardcoded Windows build flag

## [v0.1.3] - 2025-11-22 ❌ Failed Build
- Fixed npm cache configuration
- npm dependency installation still failing

## [v0.1.2] - 2025-11-22 ❌ Failed Build
- Attempted to fix deprecated GitHub Actions
- npm ci lockfile errors

## [v0.1.1] - 2025-11-20
### Added
- Initial Electron project structure
- System tray integration
- electron-builder configuration

### Known Issues
- No automated builds (manual builds only)
- Unsigned installers (security warnings expected)

---

## Version History Summary

| Version | Date | Status | Key Changes |
|---------|------|--------|-------------|
| v0.1.6 | Nov 22 | ✅ **Success** | Desktop installers, CI/CD fixes |
| v0.1.5 | Nov 22 | ❌ Failed | Wine dependency issues |
| v0.1.4 | Nov 22 | ❌ Failed | SemVer compliance |
| v0.1.3 | Nov 22 | ❌ Failed | npm issues |
| v0.1.2 | Nov 22 | ❌ Failed | Deprecated actions |
| v0.1.1 | Nov 20 | ⚠️ Manual | Initial Electron setup |

---

**Full Release Notes:** [v0.1.6 Release Notes](RELEASE-NOTES-v0.1.6.md)

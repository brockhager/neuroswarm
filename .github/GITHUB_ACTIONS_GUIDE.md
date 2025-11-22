# GitHub Actions Setup Guide

## Overview

This guide explains how to set up automated Electron builds using GitHub Actions.

## Quick Start

### 1. Workflow File
✅ Already created: `.github/workflows/build-electron.yml`

### 2. Trigger a Build

**Option A: Push a version tag**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Option B: Manual trigger**
- Go to Actions tab in GitHub
- Select "Build Electron App"
- Click "Run workflow"

### 3. Download Artifacts

After the build completes:
1. Go to the Actions tab
2. Click on the workflow run
3. Scroll to "Artifacts" section
4. Download the installers for each platform

---

## Code Signing (Optional)

### Why Sign?

**Windows:**
- Prevents "Windows protected your PC" warning
- Builds trust with users
- Required for Windows Store

**macOS:**
- Required for distribution outside App Store
- Prevents "unidentified developer" warning
- Enables Gatekeeper approval

**Linux:**
- Not required (AppImage doesn't need signing)

### Setup Code Signing

#### Windows Code Signing

1. **Obtain a code signing certificate**
   - Purchase from DigiCert, Sectigo, or similar
   - Cost: ~$100-300/year
   - Requires business verification

2. **Add certificate to GitHub Secrets**
   - Go to Settings → Secrets and variables → Actions
   - Add secrets:
     - `WINDOWS_CERT_FILE`: Base64-encoded .pfx file
     - `WINDOWS_CERT_PASSWORD`: Certificate password

3. **Encode certificate**
   ```bash
   # PowerShell
   $bytes = [System.IO.File]::ReadAllBytes("certificate.pfx")
   $base64 = [System.Convert]::ToBase64String($bytes)
   $base64 | Out-File cert-base64.txt
   ```

4. **Update workflow**
   In `.github/workflows/build-electron.yml`, uncomment:
   ```yaml
   WINDOWS_CERT_FILE: ${{ secrets.WINDOWS_CERT_FILE }}
   WINDOWS_CERT_PASSWORD: ${{ secrets.WINDOWS_CERT_PASSWORD }}
   ```

#### macOS Code Signing & Notarization

1. **Enroll in Apple Developer Program**
   - Cost: $99/year
   - https://developer.apple.com/programs/

2. **Create certificates**
   - Developer ID Application certificate
   - Developer ID Installer certificate

3. **Add to GitHub Secrets**
   - `APPLE_ID`: Your Apple ID email
   - `APPLE_ID_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Your team ID

4. **Update workflow**
   Uncomment the Apple-related environment variables

---

## Current Configuration

### Unsigned Builds (Current)
```yaml
env:
  CSC_IDENTITY_AUTO_DISCOVERY: false
```

**Result:**
- ✅ Builds work immediately
- ⚠️ Users see security warnings
- ✅ Good for testing/development

### Signed Builds (Future)
```yaml
env:
  WINDOWS_CERT_FILE: ${{ secrets.WINDOWS_CERT_FILE }}
  WINDOWS_CERT_PASSWORD: ${{ secrets.WINDOWS_CERT_PASSWORD }}
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
```

**Result:**
- ✅ No security warnings
- ✅ Professional distribution
- ✅ Required for production

---

## Testing the Workflow

### 1. Create a Test Tag
```bash
git tag v0.1.0-test
git push origin v0.1.0-test
```

### 2. Monitor the Build
- Go to Actions tab
- Watch the build progress
- Check for errors

### 3. Download and Test
- Download artifacts from the workflow run
- Test on each platform
- Verify the app starts correctly

### 4. Clean Up Test Release
```bash
# Delete the tag locally
git tag -d v0.1.0-test

# Delete the tag remotely
git push origin :refs/tags/v0.1.0-test

# Delete the GitHub release (via web UI)
```

---

## Troubleshooting

### Build Fails on Windows
**Issue:** Code signing tool download fails

**Solution:** Already handled - `CSC_IDENTITY_AUTO_DISCOVERY: false` disables signing

### Build Fails on macOS
**Issue:** Notarization fails

**Solution:** 
1. Ensure Apple Developer account is active
2. Verify app-specific password is correct
3. Check team ID matches

### Artifacts Not Uploaded
**Issue:** No files in dist/ folder

**Solution:**
1. Check build logs for errors
2. Verify `npm run build` works locally
3. Ensure `extraResources` paths are correct

### Release Not Created
**Issue:** Tag pushed but no release

**Solution:**
1. Verify tag starts with 'v' (e.g., v1.0.0)
2. Check GITHUB_TOKEN permissions
3. Ensure workflow completed successfully

---

## Production Checklist

Before releasing to users:

- [ ] Test workflow with test tag
- [ ] Verify all three platforms build successfully
- [ ] Download and test each installer
- [ ] (Optional) Set up code signing
- [ ] Update New-User-Guide.md with release link
- [ ] Create proper version tag (e.g., v1.0.0)
- [ ] Monitor first production build
- [ ] Test installers on clean machines
- [ ] Announce release to contributors

---

## Cost Breakdown

### Free Option (Current)
- ✅ GitHub Actions: Free for public repos
- ✅ GitHub Releases: Free
- ⚠️ Unsigned installers (security warnings)

**Total: $0/year**

### Signed Option (Production)
- ✅ GitHub Actions: Free for public repos
- ✅ GitHub Releases: Free
- 💰 Windows Code Signing: ~$100-300/year
- 💰 Apple Developer Program: $99/year

**Total: ~$200-400/year**

---

## Next Steps

1. **Test the workflow** with a test tag
2. **Verify builds work** on all platforms
3. **Decide on code signing** (optional for now)
4. **Create v1.0.0 release** when ready
5. **Update documentation** with release link

The workflow is ready to use! Just push a tag to trigger a build.

# Release Checklist for v0.1.1

## Pre-Release Verification

### ✅ Version Bump
- [x] `ns-node-desktop/package.json` → version: "0.1.1"
- [x] `wiki/New-Users/New-User-Guide.md` → references v0.1.1
- [x] All documentation updated

### ✅ Code Quality
- [x] All `import.meta` blockers fixed
- [x] Dockerfile updated with dependencies
- [x] GitHub Actions workflow configured
- [x] Security hardening complete (nodeIntegration disabled, contextIsolation enabled)

### ✅ Documentation
- [x] New-User-Guide.md updated
- [x] PACKAGING_SUMMARY.md complete
- [x] IMPLEMENTATION_STATUS.md current
- [x] GITHUB_ACTIONS_GUIDE.md comprehensive

### ✅ Build Configuration
- [x] Electron Builder configured
- [x] extraResources paths correct
- [x] Code signing disabled for unsigned builds
- [x] Artifact upload configured

---

## Release Steps

### Step 1: Commit All Changes
```bash
git add .
git commit -m "Release v0.1.1 - Electron desktop app with GitHub Actions"
git push origin main
```

### Step 2: Create and Push Tag
```bash
git tag v0.1.1
git push origin v0.1.1
```

### Step 3: Monitor GitHub Actions
1. Go to https://github.com/brockhager/neuroswarm/actions
2. Watch "Build Electron App" workflow
3. Verify all three platforms build successfully
4. Check for any errors

### Step 4: Download and Test Artifacts
Once the workflow completes:

**Windows:**
1. Download `neuroswarm-windows` artifact
2. Extract and run `NeuroSwarm-Portable-0.1.1.exe`
3. Verify app starts and server launches
4. Test chat interface

**macOS:**
1. Download `neuroswarm-macos` artifact
2. Open `NeuroSwarm-0.1.1.dmg`
3. Drag to Applications
4. Test launch and functionality

**Linux:**
1. Download `neuroswarm-linux` artifact
2. Make executable: `chmod +x NeuroSwarm-0.1.1.AppImage`
3. Run and verify

### Step 5: Verify GitHub Release
1. Go to https://github.com/brockhager/neuroswarm/releases
2. Verify v0.1.1 release was created
3. Confirm all artifacts are attached:
   - NeuroSwarm-Portable-0.1.1.exe
   - NeuroSwarm-0.1.1.dmg
   - NeuroSwarm-0.1.1.AppImage

### Step 6: Update Documentation (Post-Release)
Once artifacts are published, update `wiki/New-Users/New-User-Guide.md`:

Change:
```markdown
### Option B: Installer (Coming Soon - No Node.js Required)
```

To:
```markdown
### Option B: Installer (No Node.js Required)
```

Add direct download links:
```markdown
- **Windows:** [Download NeuroSwarm-Portable-0.1.1.exe](https://github.com/brockhager/neuroswarm/releases/download/v0.1.1/NeuroSwarm-Portable-0.1.1.exe)
- **Mac:** [Download NeuroSwarm-0.1.1.dmg](https://github.com/brockhager/neuroswarm/releases/download/v0.1.1/NeuroSwarm-0.1.1.dmg)
- **Linux:** [Download NeuroSwarm-0.1.1.AppImage](https://github.com/brockhager/neuroswarm/releases/download/v0.1.1/NeuroSwarm-0.1.1.AppImage)
```

### Step 7: Announce Release
- [ ] Update README.md with release announcement
- [ ] Post to Discord (if applicable)
- [ ] Notify contributors
- [ ] Update project status

---

## Expected Artifacts

### Windows
- **File:** `NeuroSwarm-Portable-0.1.1.exe`
- **Size:** ~150 MB
- **Type:** Portable executable (no installer)
- **User Experience:** Double-click to run

### macOS
- **File:** `NeuroSwarm-0.1.1.dmg`
- **Size:** ~150 MB
- **Type:** Disk image
- **User Experience:** Drag to Applications

### Linux
- **File:** `NeuroSwarm-0.1.1.AppImage`
- **Size:** ~150 MB
- **Type:** AppImage
- **User Experience:** Make executable and run

---

## Fallback Option

### ZIP Package (Still Available)
- **Location:** `dist-simple/ns-node-complete.zip`
- **Size:** ~3 MB
- **Requires:** Node.js 18+
- **Use Case:** Users who prefer lightweight package or already have Node.js

---

## Troubleshooting

### Workflow Fails
**Check:**
1. Workflow file syntax
2. Node.js version compatibility
3. Build logs for specific errors
4. extraResources paths

**Common Issues:**
- Missing dependencies → Check package.json
- Path errors → Verify extraResources in package.json
- Code signing errors → Should be disabled with CSC_IDENTITY_AUTO_DISCOVERY=false

### Artifacts Not Created
**Check:**
1. Build completed successfully
2. dist/ folder was created
3. File paths in upload-artifact step

### Release Not Created
**Check:**
1. Tag starts with 'v' (e.g., v0.1.1)
2. GITHUB_TOKEN has correct permissions
3. softprops/action-gh-release step completed

---

## Post-Release Tasks

### Immediate
- [ ] Test installers on clean machines
- [ ] Verify download links work
- [ ] Check for user feedback
- [ ] Monitor issue tracker

### Short-term
- [ ] Gather user feedback
- [ ] Plan next release features
- [ ] Consider code signing for v0.2.0
- [ ] Implement auto-updates

### Long-term
- [ ] Set up code signing certificates
- [ ] Configure auto-update server
- [ ] Add telemetry (optional)
- [ ] Create installer screenshots

---

## Success Criteria

✅ All three platform builds complete successfully  
✅ Artifacts are downloadable from GitHub Releases  
✅ Installers run without errors on clean machines  
✅ Server starts and chat interface loads  
✅ Documentation is updated with download links  
✅ Contributors can run NS-node in under 5 minutes  

---

## Rollback Plan

If critical issues are found:

1. **Delete the release:**
   - Go to Releases page
   - Click on v0.1.1
   - Delete release

2. **Delete the tag:**
   ```bash
   git tag -d v0.1.1
   git push origin :refs/tags/v0.1.1
   ```

3. **Fix issues and create v0.1.2**

---

## Notes

- **Unsigned builds:** Users will see security warnings (expected)
- **First release:** May take longer to build (~10-15 minutes)
- **Artifacts retention:** 30 days in GitHub Actions
- **Release is permanent:** Once published, cannot be edited (only deleted)

---

## Ready to Release?

**Pre-flight check:**
- [x] Version bumped to 0.1.1
- [x] All code committed
- [x] Documentation updated
- [x] Workflow tested (or ready to test)
- [x] Fallback ZIP package available

**Execute release:**
```bash
git tag v0.1.1
git push origin v0.1.1
```

Then monitor the Actions tab and wait for builds to complete!

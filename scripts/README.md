# Firestore emulator test helper

This script and helpers make it possible to run integration tests against the Firestore emulator locally (or in CI).

Prerequisites
- `node` >= 20
- `npx` (for spawning firebase-tools)
- `firebase-tools` available via `npx` (the orchestrator will try to pull it automatically)
- `firebase-admin` installed in the workspace if you want to run emulator-based tests (used by the cleanup helper)

Quick run (developer machine - starts firestore emulator, runs tests, shuts down emulator):

```powershell
# from repo root
node scripts/test-with-firestore-emulator.mjs vp-node
```

Alternative: Start the Firebase emulator by hand, then run the tests with env var set:

```powershell
# start the emulator in another terminal (requires firebase-tools)
npx firebase emulators:start --only firestore --project neuroswarm-test --host 127.0.0.1 --port 8080

# then in this terminal
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'; $env:FIREBASE_PROJECT_ID = 'neuroswarm-test'; npm --prefix neuroswarm/vp-node run test:integration
```

Notes
- The test helper `shared/tests/firestore-emulator-utils.mjs` provides `clearIdempotencyCollections()` which is used by tests to ensure a clean emulator state.
- CI integration: set FIRESTORE_EMULATOR_HOST and FIREBASE_PROJECT_ID and add a step that starts the emulator prior to running tests.

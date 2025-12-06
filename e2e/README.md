# E2E Harness — neuroswarm/e2e

This folder contains end-to-end (E2E) test specs that exercise multi-service flows across Router → Gateway → VP → NS.

How to run (local/dev environment)

- Ensure the services are running locally (or a disposable test environment is available) and that ports are reachable:
  - NS Node: default http://localhost:3009
  - VP Node: default http://localhost:3002
  - Gateway: default http://localhost:8080
  - Router/API: default http://localhost:3007

- Tests are Playwright-compatible TypeScript files. You can run them with Playwright if present in the repository or using an existing test runner that picks up `e2e/tests/*.ts`.

Example command (serial-run recommended):

```powershell
# run a single spec (happy-path)
npx playwright test e2e/tests/happy-path.e2e.test.ts --project=chromium -g "Happy path" -c e2e/playwright.config.ts --workers=1

# Or run the whole e2e test directory
npx playwright test e2e/tests --project=chromium -c e2e/playwright.config.ts --workers=1
```

Configuration
- The tests respect environment variables to point at different dev environments. Example:

```powershell
$env:ROUTER_URL='http://localhost:3007';
$env:GATEWAY_URL='http://localhost:8080';
$env:VP_URL='http://localhost:3002';
$env:NS_URL='http://localhost:3009';
npx playwright test e2e/tests --project=chromium -c e2e/playwright.config.ts --workers=1
```

Notes
- These tests are the core harness for validating CN-08-C hardening. They are intentionally conservative and retry/poll so they can run reliably against real service startup jitter in CI/dev.

Wait helper
- A small Node helper is included to poll service /health endpoints before running tests. This is useful for local runs when starting compose or bringing up dependent services.

Example (PowerShell):

```powershell
# Wait for core services (Router/Gateway/VP/NS)
node e2e/wait-for-services.js --urls=http://localhost:3009/health,http://localhost:8080/health,http://localhost:3002/health,http://localhost:3007/health --timeout=300000 --interval=5000

# Then run Playwright (serial to stay deterministic)
npx playwright test e2e/tests --project=chromium -c e2e/playwright.config.ts --workers=1
```
# E2E Harness — neuroswarm/e2e

This folder contains end-to-end (E2E) test specs that exercise multi-service flows across Router → Gateway → VP → NS.

How to run (local/dev environment)

- Ensure the services are running locally (or a disposable test environment is available) and that ports are reachable:
  - NS Node: default http://localhost:3009
  - VP Node: default http://localhost:3002
  - Gateway: default http://localhost:8080
  - Router/API: default http://localhost:3007

- Tests are Playwright-compatible TypeScript files. You can run them with Playwright if present in the repository or using an existing test runner that picks up `e2e/tests/*.ts`.

Example command (serial-run recommended):

```powershell
# run a single spec (happy-path)
npx playwright test e2e/tests/happy-path.e2e.test.ts --project=chromium -g "Happy path" -c e2e/playwright.config.ts --workers=1

# Or run the whole e2e test directory
npx playwright test e2e/tests --project=chromium -c e2e/playwright.config.ts --workers=1
```

Configuration
- The tests respect environment variables to point at different dev environments. Example:

```powershell
$env:ROUTER_URL='http://localhost:3007';
$env:GATEWAY_URL='http://localhost:8080';
$env:VP_URL='http://localhost:3002';
$env:NS_URL='http://localhost:3009';
npx playwright test e2e/tests --project=chromium -c e2e/playwright.config.ts --workers=1
```

Notes
- These tests are the core harness for validating CN-08-C hardening. They are intentionally conservative and retry/poll so they can run reliably against real service startup jitter in CI.

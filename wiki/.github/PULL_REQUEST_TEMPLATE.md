## What I changed
- Summary of the changes

## Why this is important

## How to test
- Steps to run unit tests, integration, and e2e:

```bash
cd admin-node
pnpm -C admin-node install --frozen-lockfile
npx playwright install --with-deps
NODE_ENV=test pnpm -C admin-node test
npx playwright test -c e2e/playwright.config.ts --project=chromium
```

## Change Checklist
- [ ] Tests added/updated
- [ ] Docs updated
- [ ] Changelog updated
- [ ] Ready for review
 - [ ] Wiki updated (`neuroswarm/wiki/*`) if endpoints, workflows, or procedures changed

## Additional Notes

## What I changed
- Summary of the changes

## Why this is important

## How to test
- Steps to run unit tests, integration, and e2e:

```bash
cd admin-node
npm ci
npx playwright install --with-deps
NODE_ENV=test npm test
npx playwright test -c e2e/playwright.config.ts --project=chromium
```

## Change Checklist
- [ ] Tests added/updated
- [ ] Docs updated
- [ ] Changelog updated
- [ ] Ready for review
 - [ ] Wiki updated (`docs/wiki/*`) if endpoints, workflows, or procedures changed

## Additional Notes

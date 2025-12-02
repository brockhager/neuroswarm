Repository JavaScript module policy

This repository is using "type": "module" (ESM) at top-level. To keep runtime behaviour predictable:

- All *.js files should use ESM (import/export) ONLY. Use import.meta.url / fileURLToPath for __dirname-like needs.
- Use .cjs files for any CommonJS-only helpers when necessary (e.g., scripts/repoScopedFs.cjs). ESM code should dynamically import .cjs where required.
- Desktop/Electron apps and packages intentionally remain CommonJS for now — these are located under `ns-node-desktop/` and `neuro-launcher/`. They are explicitly excluded from the `no-require-in-js` PR guard.
- Compiled test artifacts and some generated files may still be CommonJS. If you see require() in a changed .js file, please update it to ESM or move logic into a .cjs helper depending on compatibility.

CI policy

A GitHub Action enforces this rule on pull requests. The action will fail the PR if any changed .js file (in the PR diff) contains the string `require(`. If your code must use CommonJS, convert the file to .cjs and update callers accordingly, or open a discussion if desktop/Electron compatibility requires a different approach.

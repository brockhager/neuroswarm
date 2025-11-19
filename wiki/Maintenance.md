# Maintenance & Monitoring
[← Home](Home.md)

This page summarizes ongoing maintenance tasks and how to recover or restore the wiki (and pages) if deleted.

## Monitoring
- The wiki derives from `neuroswarm/docs/wiki/*` files and is updated when the CI sync workflow runs. Monitor PRs and the `docs-wiki-sync` job logs.
- Keep `docs/changelog/` updated when adding new features or breaking changes.

## Restoring the Home page if missing
1. The `Home.md` file is authoritative. If it disappears from the wiki, push `neuroswarm/docs/wiki/Home.md` and the `docs-wiki-sync` CI job will re-publish.
2. If the sync job fails, check the `docs-wiki-sync` workflow logs and open issues for the failure reason.
3. If content was changed unintentionally, revert to earlier commits and open a PR to add the missing content.

## Maintenance tasks
- Regularly check integration test logs in CI and fix `validate-start-scripts.yml` issues when discovered.
- Keep `sources/sources.json` and `adapters` updated and audited for security & rate-limits.
- Perform routine checks on IPFS availability in CI jobs (IPFS container or a hosted IPFS endpoint).

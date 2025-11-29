# Maintenance & Monitoring
[← Home](../Getting-Started/Home.md)

This page summarizes ongoing maintenance tasks and how to recover or restore the wiki (and pages) if deleted.

## Restoring the Home page
1. Ensure `neuroswarm/docs/wiki/Home.md` is the authoritative version.
2. Copy `neuroswarm/docs/wiki/Home.md` into `neuroswarm/wiki/Home.md` to ensure `docs-wiki-sync.yml` has a local placeholder to push.
3. If sync fails, review the `docs-wiki-sync` job logs.

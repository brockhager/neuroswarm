# KB -> GitHub Wiki Migration

This helper migrates the Knowledge Base markdown files from the NeuroSwarm website into a GitHub Wiki repository. It attempts to convert local KB links so they point at the new wiki page names.

Usage:
1. Export content (default):

```powershell
node scripts/migrate-kb-to-wiki.js --src=website/kb --out=tmp/wiki-export
```

This will place exported files in `tmp/neuroswarm-wiki-export`.

2. Clone and optionally push to the wiki repo (requires git access):

```powershell
# clones the wiki and copies files into it (no push by default)
node scripts/migrate-kb-to-wiki.js --src=website/kb --out=tmp/wiki-export --wiki-repo=https://github.com/<owner>/<repo>.wiki.git

# clone and push (requires git user credentials and push access)
node scripts/migrate-kb-to-wiki.js --src=website/kb --out=tmp/wiki-export --wiki-repo=https://github.com/<owner>/<repo>.wiki.git --push
```

Notes:
- The script converts `index.md` to `Home.md`.
- Links like `(getting-started.md)` or `(./getting-started.md)` or `( /kb/getting-started )` will be converted to `(Getting-Started)` in the exported page.
- Links to `/docs/`, or `https://` absolute links are unchanged.
- Image and asset links that reference repository paths will still point to repository paths and may need manual adjustment.
- The script will not handle advanced link rewrite cases such as complex slugs, nested anchor parsing, or non-markdown content types—verify those manually.

Security:
- If you run with `--push`, the script will clone and push changes using the current git credentials configured. Confirm you have permission to push to the wiki repo.

Post-migration:
- After pushing, verify the pages in the GitHub wiki are rendered correctly.
- Update the site or README to point to the wiki if you want to deprecate the website KB.

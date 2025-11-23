#!/usr/bin/env node
/*
 * Migrate KB markdown files from `neuroswarm/website/kb` to a GitHub Wiki export folder.
 * Usage:
 *  node scripts/migrate-kb-to-wiki.js --src=website/kb --out=tmp/wiki-export [--wiki-repo=https://github.com/owner/repo.wiki.git] [--push]
 *
 * If --wiki-repo and --push are provided, the script will clone the wiki repo, copy files, commit, and push.
 */

const fs = require('fs');
const path = require('path');
const { ensureDirInRepoSync, safeJoinRepo, safeRmInRepoSync, getTmpDir } = require('./repoScopedFs.cjs');
const { execSync, spawnSync } = require('child_process');
let blockedHomeAttempt = false;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  args.forEach(a => {
    if (a.startsWith('--')) {
      const [k, v] = a.replace('--', '').split('=');
      opts[k] = v === undefined ? true : v;
    }
  });
  return opts;
}

function toWikiTitle(filename) {
  if (!filename) return filename;
  // strip leading kb/ or /kb/
  filename = filename.replace(/^\/?kb\//, '');
  filename = filename.replace(/^\.?\//, '');
  if (filename === 'index' || filename === '') return 'Home';
  const parts = filename.split('/');
  const titleParts = parts.map(seg => seg.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('-'));
  return titleParts.join('/');
}

function convertLinks(content) {
  // Convert local KB .md links and absolute /kb/... links into wiki-friendly page names.
  const mdLinkRegex = /\((?:\.?\/?(?:kb\/)?([\.\w\-\/]+?)\.md)(#.*?)?\)/g;
  const absoluteKbRegex = /\((?:\/?kb\/(.+?))(#.*?)?\)/g;

  content = content.replace(mdLinkRegex, (match, p1, hash) => {
    const title = toWikiTitle(p1);
    return `(${title}${hash || ''})`;
  });

  content = content.replace(absoluteKbRegex, (match, p1, hash) => {
    const title = toWikiTitle(p1);
    return `(${title}${hash || ''})`;
  });

  content = content.replace(/\(\/?kb\)/g, '(Home)');
  return content;
}

function ensureCleanDir(dir) {
  if (!ensureDirInRepoSync(dir)) {
    console.error('ERROR: ensureCleanDir: Directory is outside repo and will not be created:', dir);
    process.exit(1);
  }
  if (fs.existsSync(dir)) safeRmInRepoSync(dir);
}

function copyAndConvert(sourceDir, outDir, opts = {}) {
  ensureCleanDir(outDir);
  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));
  files.forEach(f => {
    const src = path.join(sourceDir, f);
    const raw = fs.readFileSync(src, 'utf8');
    const converted = convertLinks(raw);
    const base = f.replace(/\.md$/, '');
      let outDest;
      if (base === 'index') {
        if (process.env.ALLOW_WIKI_HOME_OVERWRITE === '1' || opts['allow-home-overwrite'] === true) {
          outDest = path.join(outDir, 'Home.md');
        } else {
          console.warn('Skipping conversion of index.md to Home.md in migrate-kb-to-wiki; Home.md modifications require explicit permission -- allow via ALLOW_WIKI_HOME_OVERWRITE=1');
          blockedHomeAttempt = true;
          return; // Skip this iteration
        }
      } else {
        outDest = path.join(outDir, `${toWikiTitle(base)}.md`);
      }
      fs.writeFileSync(outDest, converted);
      console.log(`Exported ${src} -> ${path.basename(outDest)}`);
  });
}

function gitCloneAndPush(wikiRepo, exportDir, commitMessage = 'Migrate KB to wiki', push = false) {
  if (!wikiRepo) {
    console.error('No wiki repo provided for clone/push');
    process.exit(1);
  }
  const tmpDir = getTmpDir('wiki-clone');
  if (fs.existsSync(tmpDir)) {
    safeRmInRepoSync(tmpDir);
  }
  console.log(`Cloning wiki repo ${wikiRepo} into ${tmpDir}`);
  const cloneCmd = `git clone ${wikiRepo} ${tmpDir}`;
  execSync(cloneCmd, { stdio: 'inherit' });
  // Copy files
  const files = fs.readdirSync(exportDir).filter(f => f.endsWith('.md'));
  files.forEach(f => {
    const src = path.join(exportDir, f);
    const dest = path.join(tmpDir, f);
    fs.copyFileSync(src, dest);
  });
  // Commit & push
  execSync('git add -A', { cwd: tmpDir, stdio: 'inherit' });
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: tmpDir, stdio: 'pipe' });
  if (status.stdout && status.stdout.toString().trim() !== '') {
    execSync(`git commit -m "${commitMessage}"`, { cwd: tmpDir, stdio: 'inherit' });
    if (push) {
      execSync('git push', { cwd: tmpDir, stdio: 'inherit' });
      console.log('Pushed changes to wiki repo');
    } else {
      console.log('Local clone updated. No push performed because --push not specified.');
    }
  } else {
    console.log('No changes to commit');
  }
}

function main() {
  const opts = parseArgs();
  const source = opts.src || path.join('website', 'kb');
  let out = opts.out || path.join('tmp', 'neuroswarm-wiki-export');
  if (out) {
    // If out is absolute and within repo, accept; otherwise, normalize to be inside neuroswarm
    if (path.isAbsolute(out)) {
      if (!ensureDirInRepoSync(out)) {
        console.warn('Warning: requested out path is outside of neuroswarm; falling back to neuroswarm/tmp/neuroswarm-wiki-export');
        out = path.join('tmp', 'neuroswarm-wiki-export');
      }
    } else {
      // Non-absolute: ensure inside repo using safeJoinRepo
      const parts = out.split(path.sep).filter(Boolean);
      out = path.join(...parts);
      try {
        out = safeJoinRepo(...parts);
      } catch (e) {
        // fallback
        out = getTmpDir('neuroswarm-wiki-export');
      }
    }
  }
  const wikiRepo = opts['wiki-repo'];
  const push = !!opts.push;

  if (!fs.existsSync(source)) {
    console.error('KB source directory does not exist:', source);
    process.exit(1);
  }
  copyAndConvert(source, out, opts);
  if (wikiRepo) {
    gitCloneAndPush(wikiRepo, out, 'Migrate KB pages to wiki', push);
  } else {
    console.log('Export complete. Files are in', path.resolve(out));
  }
  // If a Home.md overwrite was blocked and we're on CI, fail to prevent automation from skipping this change silently
  if (typeof blockedHomeAttempt !== 'undefined' && blockedHomeAttempt && (process.env.CI === 'true' || process.env.GITHUB_ACTIONS)) {
    console.error('CI detected unauthorized Home.md migration attempt; failing the job to prevent automation from modifying the wiki home page.');
    process.exit(2);
  }
}

main();

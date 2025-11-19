#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import child_process from 'child_process';
import { ensureDirInRepoSync } from './repoScopedFs.mjs';

function usageAndExit() {
  console.error('Usage: node publishUpdate.mjs --title "Title" --body "Body text" [--author "Author"] [--push] [--pr] [--open-pr] [--labels "label1,label2"] [--reviewers "user1,user2"] [--template plain|full|path-to-file] [--template-file path]');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title') opts.title = args[++i];
    else if (args[i] === '--body') opts.body = args[++i];
    else if (args[i] === '--author') opts.author = args[++i];
    else if (args[i] === '--push') opts.push = true;
    else if (args[i] === '--pr') opts.pr = true;
    else if (args[i] === '--open-pr') opts.openPr = true;
    else if (args[i] === '--no-push') opts.noPush = true;
    else if (args[i] === '--base') opts.base = args[++i];
    else if (args[i] === '--webhook') opts.webhook = args[++i];
    else if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--labels') opts.labels = args[++i];
    else if (args[i] === '--reviewers') opts.reviewers = args[++i];
    else if (args[i] === '--template') opts.template = args[++i];
    else if (args[i] === '--template-file') opts.templateFile = args[++i];
    else usageAndExit();
  }
  if (!opts.title || !opts.body) usageAndExit();
  opts.base = opts.base || 'main';
  if (opts.labels && typeof opts.labels === 'string') {
    opts.labels = opts.labels.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (opts.reviewers && typeof opts.reviewers === 'string') {
    opts.reviewers = opts.reviewers.split(',').map(s => s.trim()).filter(Boolean);
  }
  return opts;
}

function readTemplateFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.warn('Unable to read template file:', filePath, e && e.message);
    return null;
  }
}

function renderTemplate(opts, now) {
  // Default templates: 'plain' (existing behavior), 'full' (structured template), or set via templateFile
  let templateType = (opts.template || 'plain').toLowerCase();
  let customTpl = null;
  if (opts.templateFile) customTpl = readTemplateFile(opts.templateFile);
  // If templateFile provided, use it as the PR body and wiki content (with substitutions)
  const author = opts.author || process.env.USER || process.env.GITHUB_ACTOR || 'unknown';
  const labelsMeta = opts.labels && opts.labels.length ? opts.labels : [];
  const reviewersMeta = opts.reviewers && opts.reviewers.length ? opts.reviewers : [];
  const safeBody = opts.body || '';
  const placeholders = {
    '{{title}}': opts.title,
    '{{body}}': safeBody,
    '{{author}}': author,
    '{{date}}': now,
    '{{labels}}': labelsMeta.join(', '),
    '{{reviewers}}': reviewersMeta.join(', ')
  };

  function subst(text) {
    if (!text) return '';
    let out = text;
    for (const [k, v] of Object.entries(placeholders)) out = out.replace(new RegExp(k, 'g'), v);
    return out;
  }

  if (customTpl) {
    const prBody = subst(customTpl);
    // wiki entry: insert YAML frontmatter and the content
    const entry = `---\ntitle: ${opts.title}\nauthor: ${author}\ndate: ${now}\nlabels: [${labelsMeta.join(', ')}]\nreviewers: [${reviewersMeta.join(', ')}]\n---\n\n${prBody}\n\n---\n`;
    return { prBody, entry };
  }

  if (templateType === 'full') {
    function hasSection(name) {
      const re = new RegExp('(#{1,6}\s*' + name + ')|(' + name + ':)', 'i');
      return re.test(safeBody);
    }
    const includeImpact = !hasSection('Impact');
    const includeNextSteps = !hasSection('Next Steps');
    let prBody = `### Summary\n${safeBody}\n\n`;
    if (includeImpact) prBody += `### Impact\nExplain the impact (breaking changes, data migrations, etc.)\n\n`;
    if (includeNextSteps) prBody += `### Next Steps\n- Add followup items or links to issues`;
    let entry = `---\ntitle: ${opts.title}\nauthor: ${author}\ndate: ${now}\nlabels: [${labelsMeta.join(', ')}]\nreviewers: [${reviewersMeta.join(', ')}]\n---\n\n## ${opts.title} - ${now} - by ${author}\n\n${safeBody}\n\n`;
    if (includeImpact) entry += `**Impact:** Add a short impact summary\n\n`;
    if (includeNextSteps) entry += `**Next Steps:**\n- Add followups here\n\n`;
    entry += `---\n`;
    return { prBody, entry };
  }

  // plain/default
  const defaultEntry = `\n## ${opts.title} - ${now} - by ${author}\n\n${safeBody}\n\n---\n`;
  return { prBody: safeBody, entry: defaultEntry };
}

async function postDiscord(webhook, payload) {
  if (!webhook) return null;
  try {
    const res = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  const opts = parseArgs();
  const author = opts.author || process.env.USER || process.env.GITHUB_ACTOR || 'unknown';
  const now = new Date().toISOString();

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const updatesFile = path.join(__dirname, '..', 'wiki', 'Updates.md');
  // ensure directory exists
  try { if (!fs.existsSync(path.dirname(updatesFile))) ensureDirInRepoSync(path.dirname(updatesFile)); } catch (e) {}
  const templated = renderTemplate(opts, now);
  const entry = templated.entry;
  const prBody = templated.prBody;
  try {
    fs.appendFileSync(updatesFile, entry, 'utf8');
    console.log('Appended update to', updatesFile);
  } catch (e) {
    console.error('Failed to append update to', updatesFile, e && e.message);
  }
  console.log('Appended update to', updatesFile);
  if (opts.dryRun) {
    console.log('[DRY RUN] - not pushing or posting to Discord (file append still occurs unless you pass --no-commit option)');
    console.log('\n[DRY RUN] Generated entry:\n', entry);
  }

  if (opts.pr) {
    // create branch name sanitized: update-YYYYMMDD-title
    const titleSlug = opts.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
    const branch = `update-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${titleSlug}`;
    let originBranch = null;
    const repoDir = path.join(__dirname, '..');
    try {
      originBranch = child_process.execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoDir }).toString().trim();
      // ensure working tree clean
      const status = child_process.execSync('git status --porcelain', { cwd: repoDir }).toString().trim();
      if (status) {
        console.warn('Warning: working directory not clean; continuing but local changes may be included in branch.');
      }
      child_process.execSync(`git checkout -b ${branch}`, { stdio: 'inherit', cwd: repoDir });
      const relPath = path.relative(repoDir, updatesFile);
      child_process.execSync('git add ' + relPath, { stdio: 'inherit', cwd: repoDir });
      const msg = `Update: ${opts.title}`;
      child_process.execSync('git commit -m ' + JSON.stringify(msg), { stdio: 'inherit', cwd: repoDir });
      if (!opts.noPush && !opts.dryRun) {
        child_process.execSync(`git push -u origin ${branch}`, { stdio: 'inherit', cwd: repoDir });
        console.log(`Created and pushed branch ${branch}`);
      } else {
        console.log(`Created branch ${branch} (not pushed due to --no-push or --dry-run)`);
      }
      // optionally open PR (requires branch to be pushed)
      if (opts.openPr) {
        if (opts.noPush || opts.dryRun) {
          console.warn('--open-pr requires the branch to be pushed (do not use --no-push or --dry-run)');
        } else {
        // try gh CLI first
        let prCreated = false;
        try {
          child_process.execSync('gh --version', { stdio: 'ignore' });
          if (opts.labels && opts.labels.length) console.log('PR labels:', opts.labels.join(','));
          if (opts.reviewers && opts.reviewers.length) console.log('PR reviewers:', opts.reviewers.join(','));
          let ghCmd = `gh pr create --title ${JSON.stringify(opts.title)} --body ${JSON.stringify(prBody)} --base ${opts.base} --head ${branch}`;
          if (opts.labels && opts.labels.length) {
            for (const l of opts.labels) ghCmd += ` --label ${JSON.stringify(l)}`;
          }
          if (opts.reviewers && opts.reviewers.length) {
            for (const r of opts.reviewers) ghCmd += ` --reviewer ${JSON.stringify(r)}`;
          }
          console.log('Creating PR via gh CLI...');
          child_process.execSync(ghCmd, { stdio: 'inherit' });
          prCreated = true;
        } catch (e) {
          // gh not available; fallback to REST API
        }
        if (!prCreated) {
          const token = process.env.GITHUB_TOKEN;
          const repo = process.env.GITHUB_REPOSITORY;
          if (!token || !repo) {
            console.warn('Cannot create PR via REST: missing GITHUB_TOKEN or GITHUB_REPOSITORY');
          } else {
            try {
              const [owner, repoName] = repo.split('/');
              const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls`, { method: 'POST', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' }, body: JSON.stringify({ title: opts.title, body: prBody, head: branch, base: opts.base }) });
              const prj = await res.json();
              if (res.ok) console.log('PR created:', prj.html_url);
              else console.warn('PR creation failed:', prj);
              // If labels were provided, add them to the underlying issue for the PR
              if (res.ok && opts.labels && opts.labels.length) {
                try {
                  const labRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues/${prj.number}/labels`, { method: 'POST', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' }, body: JSON.stringify(opts.labels) });
                  const labBody = await labRes.json();
                  if (labRes.ok) console.log('Labels applied to PR:', labBody);
                  else console.warn('Failed to apply labels:', labBody);
                } catch (eee) {
                  console.warn('Failed to apply labels (REST):', eee && eee.message);
                }
              }
              // If reviewers were provided, request reviewers on the PR
              if (res.ok && opts.reviewers && opts.reviewers.length) {
                try {
                  const rvRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls/${prj.number}/requested_reviewers`, { method: 'POST', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' }, body: JSON.stringify({ reviewers: opts.reviewers }) });
                  const rvBody = await rvRes.json();
                  if (rvRes.ok) console.log('Requested reviewers:', rvBody);
                  else console.warn('Failed to request reviewers:', rvBody);
                } catch (eee) {
                  console.warn('Failed to request reviewers (REST):', eee && eee.message);
                }
              }
            } catch (e) {
              console.error('PR creation REST failed:', e.message);
            }
          }
        }
      }
      }
    } catch (e) {
      console.error('Failed to create PR branch:', e && e.message);
    } finally {
      // return to original branch (if set and different)
      try { if (originBranch) child_process.execSync(`git checkout ${originBranch}`, { stdio: 'inherit', cwd: repoDir }); } catch (e) { /* ignore */ }
    }
  } else if (opts.push) {
    try {
      child_process.execSync('git add ' + updatesFile, { stdio: 'inherit' });
      const msg = `Update: ${opts.title}`;
      child_process.execSync('git commit -m ' + JSON.stringify(msg), { stdio: 'inherit' });
      child_process.execSync('git push', { stdio: 'inherit' });
      console.log('Pushed update commit to remote.');
    } catch (e) {
      console.error('Failed to push update commit:', e.message);
    }
  }

  const webhook = opts.webhook || process.env.DISCORD_WEBHOOK;
  if (webhook) {
    // Discord message limit is 2000 chars; truncate body if too long
    let bodyText = opts.body || '';
    const MAX_DISCORD = 1900; // leave room for metadata
    if (bodyText.length > MAX_DISCORD) {
      bodyText = bodyText.slice(0, MAX_DISCORD - 3) + '...';
    }
    const payload = { content: `**${opts.title}**\n${bodyText}\n_by ${author} at ${now}_` };
    if (!opts.dryRun) {
      const resp = await postDiscord(webhook, payload);
      const safeHost = (new URL(webhook)).host;
      console.log(`Discord webhook host: ${safeHost} - post result:`, resp);
    } else {
      console.log('[DRY RUN] Discord payload:', payload);
    }
  } else {
    console.log('No DISCORD_WEBHOOK set; skipped posting to Discord.');
  }
}

main().catch(e => { console.error('publishUpdate failed:', e); process.exit(1); });

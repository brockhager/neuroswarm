#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const repo = process.env.GITHUB_REPOSITORY || 'brockhager/neuro-infra';
const token = process.env.GITHUB_TOKEN || process.env.GH_PAT;
if (!token) { console.error('GITHUB_TOKEN or GH_PAT required'); process.exit(1); }
const [owner, name] = repo.split('/');

async function getLatestRelease() {
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/releases/latest`, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' } });
  if (res.status === 200) return res.json();
  if (res.status === 404) return null;
  throw new Error(`Failed to fetch latest release: ${res.status} ${await res.text()}`);
}

async function createRelease(tag) {
  const payload = { tag_name: tag, name: tag, body: 'Automated release with packaged node artifacts', draft: false, prerelease: false };
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/releases`, { method: 'POST', headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Failed to create release: ' + await res.text());
  return res.json();
}

async function uploadAsset(releaseId, filePath, fileName) {
  // determine mime
  const stat = fs.statSync(filePath);
  const url = `https://uploads.github.com/repos/${owner}/${name}/releases/${releaseId}/assets?name=${encodeURIComponent(fileName)}`;
  const body = fs.readFileSync(filePath);
  const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/zip', 'Content-Length': String(stat.size) }, body });
  if (!res.ok) throw new Error(`Failed to upload ${fileName}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const dist = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(dist)) { console.error('No dist directory found. Run package script first.'); process.exit(1); }
  const zips = [];
  function gather(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) gather(full);
      else if (name.endsWith('.zip')) zips.push(full);
    }
  }
  gather(dist);
  if (zips.length === 0) { console.error('No zip files found in dist/'); process.exit(1); }

  let rel = await getLatestRelease();
  if (!rel) {
    console.log('No release found - creating a new release using package.json version');
    const neuroswarmPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const tag = `v${neuroswarmPkg.version || '0.0.0'}`;
    rel = await createRelease(tag);
    console.log('Created release', rel.tag_name);
  }
  const releaseId = rel.id;
  const tagName = rel.tag_name;
  console.log('Uploading assets to release', tagName);
  for (const z of zips) {
    const fileName = path.basename(z);
    console.log('Uploading', fileName);
    // If asset already exists, try to delete it before upload
    try {
      const assetsRes = await fetch(`https://api.github.com/repos/${owner}/${name}/releases/${releaseId}/assets`, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' } });
      const assets = await assetsRes.json();
      const existing = assets.find(a => a.name === fileName);
      if (existing) {
        console.log('Deleting existing asset', fileName);
        await fetch(`https://api.github.com/repos/${owner}/${name}/releases/assets/${existing.id}`, { method: 'DELETE', headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json' } });
      }
    } catch (e) {
      console.warn('Failed to query/delete existing assets (continuing upload):', e.message);
    }
    const uploaded = await uploadAsset(releaseId, z, fileName);
    console.log('Uploaded', fileName, '->', uploaded.browser_download_url);
  }
  console.log('All assets uploaded. Release:', tagName);
  console.log('Download links:');
  for (const z of zips) console.log(`https://github.com/${owner}/${name}/releases/download/${tagName}/${path.basename(z)}`);
}

main().catch(e => { console.error('Upload process failed:', e.message); process.exit(1); });

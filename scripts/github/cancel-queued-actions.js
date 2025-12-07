#!/usr/bin/env node
/**
 * Cancel queued GitHub Actions runs for a repo using the REST API.
 * Requires a GITHUB_TOKEN with repo:status / repo workflow permissions set in the environment.
 * Usage:
 *   node cancel-queued-actions.js --owner=brockhager --repo=neuroswarm --dry-run
 */

import fetch from 'node-fetch'
import minimist from 'minimist'

const argv = minimist(process.argv.slice(2))
const owner = argv.owner || 'brockhager'
const repo = argv.repo || 'neuroswarm'
const dryRun = argv['dry-run'] || argv.dryrun || false

const token = process.env.GITHUB_TOKEN
if (!token) {
  console.error('GITHUB_TOKEN environment variable is required')
  process.exit(2)
}

async function listQueuedRuns() {
  // filter by status=queued
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?status=queued&per_page=100`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'cancel-queued-actions-script' } })
  if (!res.ok) throw new Error(`list runs failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.workflow_runs || []
}

async function cancelRun(id) {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${id}/cancel`
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'cancel-queued-actions-script' } })
  if (res.status === 202) return true
  throw new Error(`cancel failed: ${res.status} ${await res.text()}`)
}

async function main() {
  console.log(`Listing queued runs for ${owner}/${repo}...`)
  const runs = await listQueuedRuns()
  if (!runs.length) { console.log('No queued runs found'); return }
  console.log(`Found ${runs.length} queued run(s):`)
  runs.forEach(r => console.log(` - ${r.id} ${r.name} ${r.html_url} created_at=${r.created_at}`))

  if (dryRun) { console.log('Dry run - no cancellations performed'); return }

  const confirmed = argv.yes || argv.y
  if (!confirmed) {
    // Ask for manual confirmation
    process.stdout.write('Cancel all queued runs? Type YES and press enter: ')
    const input = await new Promise(resolve => {
      process.stdin.setEncoding('utf8')
      process.stdin.once('data', d => resolve(d.trim()))
    })
    if (input !== 'YES') { console.log('Aborted by user.'); process.exit(0) }
  }

  for (const r of runs) {
    try {
      process.stdout.write(`Cancelling ${r.id}... `)
      await cancelRun(r.id)
      console.log('done')
    } catch (err) {
      console.error(`failed: ${err.message}`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })

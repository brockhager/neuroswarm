// Simple NS synchronization verifier
// Performs lightweight checks with the NS node to determine if VP should
// consider itself "in-sync" with the canonical chain.

export async function verifyNsSynced({ nsUrl = 'http://localhost:3009', maxAllowedLag = 2 } = {}) {
  try {
    const headRes = await fetch(nsUrl + '/headers/tip');
    if (!headRes.ok) return { synced: false, reason: 'no-tip' };
    const head = await headRes.json().catch(() => null);

    const heightRes = await fetch(nsUrl + '/chain/height');
    if (!heightRes.ok) return { synced: false, reason: 'no-height' };
    const heightJson = await heightRes.json().catch(() => null);
    const height = (heightJson && Number.isFinite(Number(heightJson.height))) ? Number(heightJson.height) : null;

    if (!head || height === null) return { synced: false, reason: 'missing-data' };

    // Lightweight heuristic: if the tip exists and height >= 0 we consider NS healthy.
    // More advanced checks (finality, confirmations) can be added later.
    return { synced: true, head, height };
  } catch (err) {
    return { synced: false, reason: String(err && err.message ? err.message : err) };
  }
}

export default verifyNsSynced;

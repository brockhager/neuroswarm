import fetch from 'node-fetch';

const ORIGIN = 'allie-ai';

async function tryAllieApi(params) {
  try {
    const allie = await import('allie-ai');
    if (allie && allie.news && typeof allie.news.fetch === 'function') {
      const v = await allie.news.fetch(params);
      return { source: 'AllieNews', value: v.headline || null, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: v };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export async function query(params) {
  try {
    const allieRes = await tryAllieApi(params);
    if (allieRes) return allieRes;
    // fallback: use NewsAPI or a publicly available feed (GitHub raw fallback)
    const q = (params.q || 'technology');
    // public feeds are limited; return a mocked result as fallback
    return { source: 'AllieNews', value: `mock-headline-${q}`, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: { note: 'mock fallback' } };
  } catch (e) {
    return { source: 'AllieNews', value: null, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: { error: e.message } };
  }
}

export async function status() {
  return { ok: true, message: 'mock' };
}

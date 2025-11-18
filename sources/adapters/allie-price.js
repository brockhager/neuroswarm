import fetch from 'node-fetch';

// Adapter that attempts to use an 'allie-ai' npm package if available, else a public fallback
const ORIGIN = 'allie-ai';

async function tryAllieApi(params) {
  try {
    const allie = await import('allie-ai');
    if (allie && allie.price && typeof allie.price.get === 'function') {
      const v = await allie.price.get(params);
      return { source: 'AlliePrice', value: v.price || null, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: v };
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
    // fallback: call CoinGecko for a public price if Allie is not installed
    const coin = (params && params.coin) || 'bitcoin';
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=usd`);
    if (!res.ok) throw new Error(`coingecko-http-${res.status}`);
    const j = await res.json();
    const price = j[coin] && j[coin].usd ? j[coin].usd : null;
    return { source: 'CoinGecko', value: price, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: j };
  } catch (e) {
    return { source: 'AlliePrice', value: null, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: { error: e.message } };
  }
}

export async function status() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/ping');
    if (!res.ok) return { ok: false, message: `coingecko_http_${res.status}` };
    return { ok: true, message: 'reachable' };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

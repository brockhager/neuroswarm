import fetch from 'node-fetch';

const ORIGIN = 'allie-ai';

async function tryAllieApi(params) {
  try {
    const allie = await import('allie-ai');
    if (allie && allie.price && typeof allie.price.get === 'function') {
      const v = await allie.price.get({ coin: 'ethereum', ...params });
      return { source: 'AllieETH', value: v.price || null, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: v };
    }
  } catch (e) { /* ignore */ }
  return null;
}

export async function query(params) {
  try {
    const allieRes = await tryAllieApi(params);
    if (allieRes) return allieRes;
    // fallback: use CoinGecko
    const coin = (params && params.coin) || 'ethereum';
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=usd`);
    if (!res.ok) throw new Error(`coingecko-http-${res.status}`);
    const j = await res.json();
    const price = j[coin] && j[coin].usd ? j[coin].usd : null;
    return { source: 'CoinGeckoETH', value: price, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: j };
  } catch (e) {
    return { source: 'AllieETH', value: null, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: { error: e.message } };
  }
}

export async function status() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/ping');
    if (!res.ok) return { ok: false, message: `coingecko_http_${res.status}` };
    return { ok: true, message: 'reachable' };
  } catch (e) { return { ok: false, message: e.message }; }
}

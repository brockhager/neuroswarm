import fetch from 'node-fetch';

// Very small CoinGecko adapter: fetch current price for a given coin id (e.g., 'bitcoin').
export async function query(params) {
  const coin = (params && params.coin) || 'bitcoin';
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=usd`);
    if (!res.ok) throw new Error(`coingecko-http-${res.status}`);
    const j = await res.json();
    const price = j[coin] && j[coin].usd ? j[coin].usd : null;
    const verifiedAt = new Date().toISOString();
    return { source: 'CoinGecko', value: price, verifiedAt, raw: j };
  } catch (e) {
    return { source: 'CoinGecko', value: null, verifiedAt: new Date().toISOString(), raw: { error: e.message } };
  }
}

export async function status() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/ping');
    if (!res.ok) return { ok: false, message: `http ${res.status}` };
    return { ok: true, message: 'CoinGecko reachable' };
  } catch (e) { return { ok: false, message: e.message }; }
}

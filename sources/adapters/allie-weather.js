import fetch from 'node-fetch';

const ORIGIN = 'allie-ai';

async function tryAllieApi(params) {
  try {
    const allie = await import('allie-ai');
    if (allie && allie.weather && typeof allie.weather.get === 'function') {
      const v = await allie.weather.get(params);
      return { source: 'AllieWeather', value: v.temp || null, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: v };
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
    // fallback: use Open-Meteo public API for a location
    const lat = params.lat || 37.7749; // default SF
    const lon = params.lon || -122.4194;
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    if (!res.ok) throw new Error(`open-meteo-http-${res.status}`);
    const j = await res.json();
    const temp = j && j.current_weather && j.current_weather.temperature ? j.current_weather.temperature : null;
    return { source: 'OpenMeteo', value: temp, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: j };
  } catch (e) {
    return { source: 'AllieWeather', value: null, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: { error: e.message } };
  }
}

export async function status() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0');
    return { ok: res.ok, message: res.ok ? 'ok' : `http ${res.status}` };
  } catch (e) { return { ok: false, message: e.message }; }
}

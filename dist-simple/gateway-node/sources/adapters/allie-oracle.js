import fetch from 'node-fetch';

const ORIGIN = 'allie-ai';

export async function query(params) {
  try {
    // If an allie-ai package exists, prefer it
    try {
      const allie = await import('allie-ai');
      if (allie && allie.oracle && typeof allie.oracle.query === 'function') {
        const v = await allie.oracle.query(params);
        return { source: 'AllieOracle', value: v.value || null, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: v };
      }
    } catch (e) { /* ignore */ }
    // A generic public fallback that returns a mocked oracle response
    return { source: 'AllieOracle', value: 'ok', verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: { note: 'mocked oracle' } };
  } catch (e) {
    return { source: 'AllieOracle', value: null, verifiedAt: new Date().toISOString(), origin: ORIGIN, raw: { error: e.message } };
  }
}

export async function status() { return { ok: true, message: 'mock' }; }

import { v4 as uuidv4 } from 'uuid';

// Mock adapter: returns a deterministic value for testing.
export async function query(params) {
  // Accepts params: { value: number, label: string }
  const value = params && params.value !== undefined ? params.value : 1;
  const label = params && params.label ? params.label : 'mock';
  const verifiedAt = new Date().toISOString();
  return { source: 'MockAdapter', value, verifiedAt, raw: { label, value } };
}

export async function status() {
  return { ok: true, message: 'Mock adapter ready' };
}

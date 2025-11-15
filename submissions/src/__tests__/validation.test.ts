import { validateSubmissionPayload } from '../services/validation';

describe('Submission payload validation', () => {
  it('returns error when payload is empty', () => {
    const r = validateSubmissionPayload(null as any);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('accepts valid payload with sha256', () => {
    const r = validateSubmissionPayload({ contributorId: 'user-123', sha256: 'a'.repeat(64) });
    expect(r.valid).toBe(true);
  });

  it('accepts payload with data and computes hash externally', () => {
    const r = validateSubmissionPayload({ contributorId: 'user-123', data: { foo: 'bar' } });
    expect(r.valid).toBe(true);
  });

  it('rejects invalid sha256', () => {
    const r = validateSubmissionPayload({ contributorId: 'user-123', sha256: 'deadbeef' });
    expect(r.valid).toBe(false);
  });
});

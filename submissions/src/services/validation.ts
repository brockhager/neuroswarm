export function validateSubmissionPayload(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload) {
    errors.push('Payload required');
    return { valid: false, errors };
  }

  if (!payload.contributorId || typeof payload.contributorId !== 'string') {
    errors.push('contributorId is required and must be a string');
  }

  if (!payload.sha256 && !payload.data) {
    errors.push('sha256 or data field required');
  }

  if (payload.sha256 && !/^[a-f0-9]{64}$/.test(payload.sha256)) {
    errors.push('sha256 must be a 64-character hex string');
  }

  if (payload.tags && (!Array.isArray(payload.tags) || payload.tags.some((t: any) => typeof t !== 'string'))) {
    errors.push('tags must be an array of strings');
  }

  return { valid: errors.length === 0, errors };
}

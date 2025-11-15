import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { validateSubmissionPayload } from '../services/validation';

export function createSubmissionRouter(deps: any): Router {
  const { safetyService, timelineService, anchorService, governanceLogger, logger } = deps;
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      // Safety mode guard
      if (safetyService && safetyService.isSafe && safetyService.isSafe()) {
        return res.status(503).json({ error: 'Service in maintenance/safe mode', timestamp: new Date().toISOString() });
      }

      const payload = req.body;

      // Validate payload schema
      const validation = validateSubmissionPayload(payload);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Invalid payload', details: validation.errors });
      }

      // Validate required fields
      const contributorId = payload.contributorId;
      const tags = payload.tags || [];
      const description = payload.description || '';
      let sha256 = payload.sha256 || '';
      const submissionType = payload.submissionType || 'json';
      const metadata = payload.metadata || {};

      // Basic validation
      if (!contributorId || typeof contributorId !== 'string') {
        return res.status(400).json({ error: 'contributorId is required and must be a string' });
      }

      if (!sha256) {
        // If payload contains data, compute sha256
        if (payload.data) {
          const buffer = Buffer.isBuffer(payload.data) ? payload.data : Buffer.from(JSON.stringify(payload.data));
          sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        } else {
          return res.status(400).json({ error: 'sha256 required or data field must be provided' });
        }
      }

      if (!/^[a-f0-9]{64}$/.test(sha256)) {
        return res.status(400).json({ error: 'sha256 must be a valid 64-character hex string' });
      }

      // Optional tag validation
      if (!Array.isArray(tags) || tags.some((t: any) => typeof t !== 'string')) {
        return res.status(400).json({ error: 'tags must be an array of strings' });
      }

      // Log the submission in timeline
      const timelineId = timelineService.addSubmissionEntry({
        timestamp: new Date().toISOString(),
        action: 'submission',
        actor: contributorId,
        fingerprints: { submission_sha256: sha256 },
        verificationStatus: 'pending',
        details: { submissionType, tags, description, metadata },
        contributorId: contributorId,
        submissionType: submissionType,
        sha256: sha256,
        anchored: false,
      });

      // Prepare submission anchor (this will create an anchor timeline entry handled by founder)
      const anchorResult = anchorService.prepareSubmissionAnchor(sha256, contributorId, submissionType, metadata, timelineId);

      // Return response
      res.json({
        success: true,
        timelineId,
        anchorResult,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger?.error('Submission API error:', error);
      governanceLogger?.log('error', { endpoint: '/v1/brain/submit', error: (error as Error).message });
      res.status(500).json({ error: 'Failed to process submission', timestamp: new Date().toISOString() });
    }
  });

  return router;
}

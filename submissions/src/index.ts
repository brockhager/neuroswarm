import express from 'express';
import { Router } from 'express';
import { createSubmissionRouter } from './routes/submit';

export function createSubmissionsRouter(deps: any): Router {
  const router = Router();
  router.use('/submit', createSubmissionRouter(deps));
  return router;
}

export default { createSubmissionsRouter };

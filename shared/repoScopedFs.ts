import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { ensureDirInRepoSync, safeJoinRepo, isInsideRepo } = require('../scripts/repoScopedFs.cjs');

export { ensureDirInRepoSync, safeJoinRepo, isInsideRepo };

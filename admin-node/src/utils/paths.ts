import path from 'path';

export const getWorkspaceRoot = (): string => {
  // workspace root: project root, so go up one directory from admin-node
  return path.resolve(process.cwd(), '..');
};

export const getGovernanceTimelinePath = (): string => {
  const env = process.env.GOVERNANCE_TIMELINE_PATH;
  if (env && env.length > 0) return path.resolve(env);
  const governanceDir = process.env.GOVERNANCE_DIR || process.env.NEURO_GOVERNANCE_DIR || 'governance';
  return path.join(getWorkspaceRoot(), governanceDir, 'timeline', 'governance-timeline.jsonl');
};

export const getGovernanceAlertsPath = (): string => {
  const env = process.env.GOVERNANCE_ALERTS_PATH;
  if (env && env.length > 0) return path.resolve(env);
  const governanceDir = process.env.GOVERNANCE_DIR || process.env.NEURO_GOVERNANCE_DIR || 'governance';
  return path.join(getWorkspaceRoot(), governanceDir, 'timeline', 'governance-alerts.jsonl');
};

export const getWpPublishLogPath = (): string => {
  const env = process.env.WP_PUBLISH_LOG_PATH;
  if (env && env.length > 0) return path.resolve(env);
  const governanceDir = process.env.GOVERNANCE_DIR || process.env.NEURO_GOVERNANCE_DIR || 'governance';
  return path.join(getWorkspaceRoot(), governanceDir, 'logs', 'wp_publish_log.jsonl');
};

export const getGovernanceDir = (): string => {
  const env = process.env.GOVERNANCE_DIR || process.env.NEURO_GOVERNANCE_DIR;
  if (env && env.length > 0) return path.resolve(env);
  return path.join(getWorkspaceRoot(), 'governance');
};

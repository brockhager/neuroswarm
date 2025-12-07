// agent9/audit-logger.ts
// AG4-04: Fine-grained audit logging for Agent 9 (JSONL append-only logger)

import fs from 'fs';
import path from 'path';

export type AuditSeverity = 'info' | 'warn' | 'error' | 'debug';

export interface AuditEvent {
  timestamp: string; // ISO
  userId?: string;
  correlationId?: string;
  action: string; // e.g., 'submit_artifact', 'auth.login', 'sandbox.execute'
  details?: Record<string, any>;
  severity?: AuditSeverity;
  source?: string; // component/service name
}

export interface AuditLoggerOptions {
  directory?: string; // where to store files
  filename?: string; // base filename
  maxFileSizeBytes?: number; // rotate when this exceeded
  maxBackups?: number; // keep N backups
}

let options: AuditLoggerOptions = {
  directory: path.join(process.cwd(), 'agent9', 'logs'),
  filename: 'audit.log.jsonl',
  maxFileSizeBytes: 1024 * 100, // 100kb default for tests
  maxBackups: 5,
};

export function initAuditLogger(opts: Partial<AuditLoggerOptions> = {}) {
  options = { ...options, ...opts };
  if (!fs.existsSync(options.directory!)) {
    fs.mkdirSync(options.directory!, { recursive: true });
  }
}

function getLogFilePath() {
  return path.join(options.directory!, options.filename!);
}

export async function logEvent(event: AuditEvent): Promise<void> {
  const filePath = getLogFilePath();
  const line = JSON.stringify(event) + '\n';
  try {
    // rotate if needed
    await maybeRotate(filePath);
    await fs.promises.appendFile(filePath, line, { encoding: 'utf8' });
  } catch (err) {
    console.error('[AuditLogger] Failed to append event', err);
  }
}

export async function maybeRotate(filePath: string): Promise<void> {
  try {
    if (!fs.existsSync(filePath)) return;
    const stat = await fs.promises.stat(filePath);
    if (stat.size >= (options.maxFileSizeBytes || Number.MAX_SAFE_INTEGER)) {
      // rotate
      const backupName = `${options.filename}.${Date.now()}.bak`;
      const backupPath = path.join(options.directory!, backupName);
      await fs.promises.rename(filePath, backupPath);

      // cleanup old backups
      const files = await fs.promises.readdir(options.directory!);
      const backups = files.filter(f => f.startsWith(options.filename + '.') && f.endsWith('.bak'))
        .map(f => ({ name: f, full: path.join(options.directory!, f) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      while (backups.length > (options.maxBackups || 5)) {
        const toDelete = backups.shift();
        if (toDelete) await fs.promises.unlink(toDelete.full);
      }
    }
  } catch (err) {
    console.warn('[AuditLogger] Rotation check failed', err);
  }
}

export async function queryRecent(limit = 50): Promise<AuditEvent[]> {
  const filePath = getLogFilePath();
  if (!fs.existsSync(filePath)) return [];
  const raw = await fs.promises.readFile(filePath, 'utf8');
  const lines = raw.trim().split('\n').filter(Boolean);
  const slice = lines.slice(-limit);
  return slice.map(l => {
    try { return JSON.parse(l) as AuditEvent; } catch(e) { return null as any; }
  }).filter(Boolean);
}

export async function exportAll(): Promise<AuditEvent[]> {
  const filePath = getLogFilePath();
  if (!fs.existsSync(filePath)) return [];
  const raw = await fs.promises.readFile(filePath, 'utf8');
  const lines = raw.trim().split('\n').filter(Boolean);
  return lines.map(l => JSON.parse(l) as AuditEvent);
}

export function getDefaultOptions() { return options; }

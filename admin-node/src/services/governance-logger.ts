import fs from 'fs';
import path from 'path';
// Helper to ensure a directory exists (replaces missing repoScopedFs)
function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
import { getWpPublishLogPath } from '../utils/paths';
import crypto from 'crypto';

export interface GovernanceLogEntry {
  timestamp: string;
  action: string;
  actor?: string;
  details: Record<string, any>;
  signature?: string;
}

export class GovernanceLogger {
  private logPath: string;
  private privateKey?: string;
  private logger: any;

  constructor(logger?: any) {
    // Use provided logger or fallback to a prefixed console logger
    this.logger = logger || {
      info: (...args: any[]) => console.log(`[ADMIN][${new Date().toISOString()}]`, ...args),
      warn: (...args: any[]) => console.warn(`[ADMIN][${new Date().toISOString()}]`, ...args),
      error: (...args: any[]) => console.error(`[ADMIN][${new Date().toISOString()}]`, ...args),
    };

    this.logPath = process.env.WP_PUBLISH_LOG_PATH ? path.resolve(process.env.WP_PUBLISH_LOG_PATH) : getWpPublishLogPath();

    // Load private key for signing (if available)
    const keyPath = process.env.GOVERNANCE_PRIVATE_KEY_PATH;
    if (keyPath) {
      this.logger.info(`Loading governance key from: ${keyPath}`);
      if (fs.existsSync(keyPath)) {
        try {
          this.privateKey = fs.readFileSync(keyPath, 'utf8');
          this.logger.info('Governance logger initialized with signing key');
        } catch (error) {
          this.logger.error(`Failed to load governance signing key from ${keyPath}:`, error);
        }
      } else {
        this.logger.warn(`Governance signing key file not found at: ${keyPath}`);
      }
    } else {
      this.logger.warn('No GOVERNANCE_PRIVATE_KEY_PATH environment variable set - logs will be unsigned');
    }
  }

  /**
   * Log a governance action with optional signing
   */
  log(action: string, details: Record<string, any>, actor?: string): void {
    const entry: GovernanceLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      actor: actor || 'admin-node',
      details,
    };

    // Create signature if private key is available
    if (this.privateKey) {
      const dataToSign = JSON.stringify({
        timestamp: entry.timestamp,
        action: entry.action,
        actor: entry.actor,
        details: entry.details,
      });

      try {
        const sign = crypto.createSign('SHA256');
        sign.update(dataToSign);
        entry.signature = sign.sign(this.privateKey, 'hex');
      } catch (error) {
        this.logger.error('Failed to sign governance log entry:', error);
      }
    }

    // Write to log file
    try {
      const dir = path.dirname(this.logPath);
      if (!fs.existsSync(dir)) ensureDirSync(dir);
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logPath, logLine);
      this.logger.info(`Governance action logged: ${action}`, { actor: entry.actor });
    } catch (error) {
      this.logger.error('Failed to write governance log:', error);
      // Fallback: log to configured logger
      if (this.logger && this.logger.error) {
        this.logger.error('GOVERNANCE LOG ERROR:', entry);
      } else {
        console.error('[ADMIN][ERROR]', 'GOVERNANCE LOG ERROR:', entry);
      }
    }
  }

  /**
   * Log admin authentication events
   */
  logAuthSuccess(userId: string, role: string, path: string, ip: string): void {
    this.log('admin_auth_success', {
      userId,
      role,
      endpoint: path,
      ip,
      userAgent: 'admin-node',
    }, userId);
  }

  /**
   * Log admin authentication failures
   */
  logAuthFailure(reason: string, ip: string, path: string, details?: Record<string, any>): void {
    this.log('admin_auth_failure', {
      reason,
      endpoint: path,
      ip,
      userAgent: 'admin-node',
      ...details,
    });
  }

  /**
   * Log admin permission denials
   */
  logPermissionDenied(userId: string, role: string, requiredRole: string, path: string): void {
    this.log('admin_permission_denied', {
      userId,
      role,
      requiredRole,
      endpoint: path,
      userAgent: 'admin-node',
    }, userId);
  }

  /**
   * Log admin actions (observability queries, dashboard access, etc.)
   */
  logAdminAction(action: string, userId: string, details: Record<string, any>): void {
    this.log(`admin_${action}`, {
      userId,
      userAgent: 'admin-node',
      ...details,
    }, userId);
  }

  /**
   * Log emergency actions (freeze/restore operations)
   */
  logEmergencyAction(action: string, userId: string, reason: string, details: Record<string, any>): void {
    this.log(`emergency_${action}`, {
      userId,
      reason,
      userAgent: 'admin-node',
      ...details,
    }, userId);
  }

  /**
   * Log node status updates (join/deny events)
   */
  logNodeStatusUpdate(nodeId: string, ip: string, status: string, details?: Record<string, any>): void {
    this.log('node-status-update', {
      nodeId,
      ip,
      status,
      userAgent: 'admin-node',
      ...details,
    });
  }

  /**
   * Log system events (startup, shutdown, errors)
   */
  logSystemEvent(event: string, details: Record<string, any>): void {
    this.log(`system_${event}`, {
      userAgent: 'admin-node',
      ...details,
    });
  }

  /**
   * Verify a log entry's signature
   */
  verifyEntry(entry: GovernanceLogEntry, publicKey: string): boolean {
    if (!entry.signature) {
      return false; // Unsigned entries are not verifiable
    }

    try {
      const dataToVerify = JSON.stringify({
        timestamp: entry.timestamp,
        action: entry.action,
        actor: entry.actor,
        details: entry.details,
      });

      const verify = crypto.createVerify('SHA256');
      verify.update(dataToVerify);
      return verify.verify(publicKey, entry.signature, 'hex');
    } catch (error) {
      this.logger.error('Failed to verify governance log entry:', error);
      return false;
    }
  }
}

// Export function to create logger instance with proper logger
let governanceLoggerInstance: GovernanceLogger;

export function createGovernanceLogger(logger?: any): GovernanceLogger {
  if (!governanceLoggerInstance) {
    governanceLoggerInstance = new GovernanceLogger(logger);
  }
  return governanceLoggerInstance;
}

// Export singleton instance for backward compatibility (will be initialized later)
export const governanceLogger = createGovernanceLogger();
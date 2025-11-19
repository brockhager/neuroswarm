import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../index';
import { governanceLogger } from './governance-logger';
import { getGovernanceTimelinePath, getGovernanceAlertsPath } from '../utils/paths';
import { discordService } from '../../../discord/src/discord-service';
import { ensureDirInRepoSync } from '../../shared/repoScopedFs';

export interface AnchorTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  txSignature?: string;
  memoContent?: string;
  fingerprints: Record<string, string>;
  verificationStatus: 'verified' | 'failed' | 'pending' | 'error';
  explorerUrl?: string;
  details: Record<string, any>;
  signature?: string;
}

export interface SubmissionTimelineEntry extends AnchorTimelineEntry {
  contributorId?: string;
  submissionType?: 'file' | 'json' | 'telemetry' | string;
  sha256?: string;
  anchored?: boolean;
}

export interface AlertEntry {
  id: string;
  timestamp: string;
  type: 'verification_failure' | 'config_error' | 'security_alert' | 'system_warning';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actor?: string;
  relatedAnchorId?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolution?: string;
  signature?: string;
}

export class TimelineService {
  private timelinePath: string;
  private alertsPath: string;
  private privateKey?: string;
  private logger: any;

  constructor(logger?: any, timelinePath?: string, alertsPath?: string) {
    this.logger = logger || console;
    this.timelinePath = timelinePath || getGovernanceTimelinePath();
    this.alertsPath = alertsPath || getGovernanceAlertsPath();

    // Load private key for signing
    const keyPath = process.env.GOVERNANCE_PRIVATE_KEY_PATH;
    if (keyPath && fs.existsSync(keyPath)) {
      try {
        this.privateKey = fs.readFileSync(keyPath, 'utf8');
      } catch (error) {
        this.logger.error('Failed to load governance signing key for timeline:', error);
      }
    }
  }

  /**
   * Add a new anchor entry to the timeline
   */
  addAnchorEntry(entry: Omit<AnchorTimelineEntry, 'id' | 'signature'>): string {
    const id = crypto.randomUUID();
    const timelineEntry: AnchorTimelineEntry = {
      ...entry,
      id,
    };

    // Create signature if private key is available
    if (this.privateKey) {
      const dataToSign = JSON.stringify({
        id: timelineEntry.id,
        timestamp: timelineEntry.timestamp,
        action: timelineEntry.action,
        actor: timelineEntry.actor,
        txSignature: timelineEntry.txSignature,
        memoContent: timelineEntry.memoContent,
        fingerprints: timelineEntry.fingerprints,
        verificationStatus: timelineEntry.verificationStatus,
        details: timelineEntry.details,
      });

      try {
        const sign = crypto.createSign('SHA256');
        sign.update(dataToSign);
        timelineEntry.signature = sign.sign(this.privateKey, 'hex');
      } catch (error) {
        this.logger.error('Failed to sign timeline entry:', error);
      }
    }

    // Write to timeline file (append-only)
    try {
      const dir = path.dirname(this.timelinePath);
      if (!fs.existsSync(dir)) ensureDirInRepoSync(dir);
      const line = JSON.stringify(timelineEntry) + '\n';
      fs.appendFileSync(this.timelinePath, line);

      this.logger.info(`Timeline entry added: ${entry.action} by ${entry.actor}`);

      // Log to governance logger
      governanceLogger.log('timeline_entry_added', {
        entryId: id,
        action: entry.action,
        actor: entry.actor,
        txSignature: entry.txSignature,
      }, entry.actor);

      // Send Discord notification
      if (process.env.NODE_ENV !== 'test') {
        discordService.sendAnchorEvent(timelineEntry).catch(error => {
          this.logger.error('Failed to send Discord notification for timeline entry:', error);
        });
      }

      return id;
    } catch (error) {
      this.logger.error('Failed to write timeline entry:', error);
      throw error;
    }
  }

  /**
   * Add a new submission entry to the timeline
   */
  addSubmissionEntry(entry: Omit<SubmissionTimelineEntry, 'id' | 'signature'>): string {
    const id = crypto.randomUUID();
    const timelineEntry: SubmissionTimelineEntry = {
      ...entry,
      id,
    } as SubmissionTimelineEntry;

    // Create signature if private key is available
    if (this.privateKey) {
      const dataToSign = JSON.stringify({
        id: timelineEntry.id,
        timestamp: timelineEntry.timestamp,
        action: timelineEntry.action,
        actor: timelineEntry.actor,
        contributorId: timelineEntry.contributorId,
        submissionType: timelineEntry.submissionType,
        sha256: timelineEntry.sha256,
        anchored: timelineEntry.anchored,
        details: timelineEntry.details,
      });

      try {
        const sign = crypto.createSign('SHA256');
        sign.update(dataToSign);
        timelineEntry.signature = sign.sign(this.privateKey, 'hex');
      } catch (error) {
        this.logger.error('Failed to sign submission timeline entry:', error);
      }
    }

    try {
      const dir = path.dirname(this.timelinePath);
      if (!fs.existsSync(dir)) ensureDirInRepoSync(dir);
      const line = JSON.stringify(timelineEntry) + '\n';
      fs.appendFileSync(this.timelinePath, line);

      this.logger.info(`Submission timeline entry added: ${entry.action} by ${entry.actor}`);

      governanceLogger.log('timeline_submission_added', {
        entryId: id,
        action: entry.action,
        actor: entry.actor,
        contributorId: entry.contributorId,
        sha256: entry.sha256
      }, entry.actor);

      return id;
    } catch (error) {
      this.logger.error('Failed to write submission timeline entry:', error);
      throw error;
    }
  }

  /**
   * Get timeline entries with optional filtering
   */
  getTimelineEntries(options: {
    limit?: number;
    offset?: number;
    action?: string;
    actor?: string;
    verificationStatus?: string;
    startDate?: string;
    endDate?: string;
  } = {}): AnchorTimelineEntry[] {
    try {
      if (!fs.existsSync(this.timelinePath)) {
        return [];
      }

      const lines = fs.readFileSync(this.timelinePath, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as AnchorTimelineEntry);

      // Apply filters
      let filtered = lines;

      if (options.action) {
        filtered = filtered.filter(entry => entry.action === options.action);
      }

      if (options.actor) {
        filtered = filtered.filter(entry => entry.actor === options.actor);
      }

      if (options.verificationStatus) {
        filtered = filtered.filter(entry => entry.verificationStatus === options.verificationStatus);
      }

      if (options.startDate) {
        const startTime = new Date(options.startDate).getTime();
        filtered = filtered.filter(entry => new Date(entry.timestamp).getTime() >= startTime);
      }

      if (options.endDate) {
        const endTime = new Date(options.endDate).getTime();
        filtered = filtered.filter(entry => new Date(entry.timestamp).getTime() <= endTime);
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 100;
      return filtered.slice(offset, offset + limit);

    } catch (error) {
      this.logger.error('Failed to read timeline entries:', error);
      return [];
    }
  }

  /**
   * Get a specific timeline entry by ID
   */
  getTimelineEntry(id: string): AnchorTimelineEntry | null {
    const entries = this.getTimelineEntries({ limit: 1000 });
    return entries.find(entry => entry.id === id) || null;
  }

  /**
   * Update verification status of an anchor entry
   */
  updateAnchorVerification(id: string, status: 'verified' | 'failed' | 'pending' | 'error', details?: Record<string, any>): boolean {
    try {
      const entries = this.getTimelineEntries({ limit: 1000 });
      const entryIndex = entries.findIndex(entry => entry.id === id);

      if (entryIndex === -1) {
        return false;
      }

      const entry = entries[entryIndex];
      entry.verificationStatus = status;

      if (details) {
        entry.details = { ...entry.details, ...details };
      }

      // Re-sign the updated entry
      if (this.privateKey) {
        const dataToSign = JSON.stringify({
          id: entry.id,
          timestamp: entry.timestamp,
          action: entry.action,
          actor: entry.actor,
          txSignature: entry.txSignature,
          memoContent: entry.memoContent,
          fingerprints: entry.fingerprints,
          verificationStatus: entry.verificationStatus,
          details: entry.details,
        });

        const sign = crypto.createSign('SHA256');
        sign.update(dataToSign);
        entry.signature = sign.sign(this.privateKey, 'hex');
      }

      // Rewrite the entire timeline file (since we can't edit JSONL easily)
      this.rewriteTimelineFile(entries);

      this.logger.info(`Timeline entry ${id} verification updated to ${status}`);

      // Log to governance logger
      governanceLogger.log('timeline_verification_updated', {
        entryId: id,
        action: entry.action,
        newStatus: status,
        details,
      });

      // Send Discord notification for verification results
      if (status === 'verified' || status === 'failed') {
        if (process.env.NODE_ENV !== 'test') {
          discordService.sendVerificationResult({
            txSignature: entry.txSignature || '',
            action: entry.action,
            result: status,
            details: details ? Object.values(details).map(d => String(d)) : [],
            verifiedBy: 'system', // TODO: Pass actual verifier
          }).catch(error => {
            this.logger.error('Failed to send Discord notification for verification:', error);
          });
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to update timeline verification:', error);
      return false;
    }
  }

  /**
   * Set transaction signature for a timeline entry by id or genesis hash
   */
  setEntryTxSignature(txSignature: string, opts: { id?: string; genesisSha256?: string; verifyIfMatching?: boolean } = {}): boolean {
    try {
      const entries = this.getTimelineEntries({ limit: 1000 });
      let entryIndex = -1;

      if (opts.id) {
        entryIndex = entries.findIndex(e => e.id === opts.id);
      }

      if (entryIndex === -1 && opts.genesisSha256) {
        entryIndex = entries.findIndex(e => (e.fingerprints && (e.fingerprints.genesis_sha256 || e.fingerprints.genesis_sha256)) === opts.genesisSha256);
      }

      // If still not found, find latest genesis entry
      if (entryIndex === -1) {
        entryIndex = entries.findIndex(e => e.action === 'genesis' || e.action === 'genesis-anchor');
        if (entryIndex === -1) return false;
      }

      const entry = entries[entryIndex];

      // Update fields
      entry.txSignature = txSignature;
      entry.details = entry.details || {};
      entry.details.tx_signature = txSignature;

      // Optionally verify if provided genesisSha256 matches fingerprint
      if (opts.verifyIfMatching && opts.genesisSha256) {
        const entryHash = entry.fingerprints?.genesis_sha256 || entry.details?.hash || (entry.details && (entry.details.hash || entry.details.genesis_sha256));
        if (entryHash && entryHash === opts.genesisSha256) {
          entry.verificationStatus = 'verified';
          entry.details.verifiedAt = new Date().toISOString();
        } else {
          entry.verificationStatus = 'failed';
        }
      }

      // Re-sign if we have a private key
      if (this.privateKey) {
        const dataToSign = JSON.stringify({
          id: entry.id,
          timestamp: entry.timestamp,
          action: entry.action,
          actor: entry.actor,
          txSignature: entry.txSignature,
          memoContent: entry.memoContent,
          fingerprints: entry.fingerprints,
          verificationStatus: entry.verificationStatus,
          details: entry.details,
        });

        try {
          const sign = crypto.createSign('SHA256');
          sign.update(dataToSign);
          entry.signature = sign.sign(this.privateKey, 'hex');
        } catch (error) {
          this.logger.error('Failed to sign updated timeline entry:', error);
        }
      }

      // Rewrite timeline file
      this.rewriteTimelineFile(entries);

      this.logger.info(`Updated timeline entry ${entry.id} with txSignature ${txSignature}`);
      governanceLogger.log('timeline_tx_set', {
        entryId: entry.id,
        txSignature,
        verificationStatus: entry.verificationStatus,
      });

      // If this entry is an anchor for a submission, mark the corresponding submission entry as anchored
      if (entry.action === 'submission-anchor' && entry.details && entry.details.submissionTimelineId) {
        const subId = entry.details.submissionTimelineId;
        const subIndex = entries.findIndex(e => e.id === subId);
        if (subIndex !== -1) {
          const subEntry: any = entries[subIndex];
          subEntry.anchored = true;
          subEntry.details = subEntry.details || {};
          subEntry.details.anchor_tx_signature = txSignature;
          // Re-sign the submission entry if we have a private key
          if (this.privateKey) {
            const sign = crypto.createSign('SHA256');
            sign.update(JSON.stringify({
              id: subEntry.id,
              timestamp: subEntry.timestamp,
              action: subEntry.action,
              actor: subEntry.actor,
              txSignature: subEntry.txSignature,
              memoContent: subEntry.memoContent,
              fingerprints: subEntry.fingerprints,
              verificationStatus: subEntry.verificationStatus,
              details: subEntry.details,
            }));
            subEntry.signature = sign.sign(this.privateKey, 'hex');
          }
        }
        // rewrite timeline with updated submission entry
        this.rewriteTimelineFile(entries);
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to set tx signature on timeline entry:', error);
      return false;
    }
  }

  /**
   * Add a new alert
   */
  addAlert(alert: Omit<AlertEntry, 'id' | 'signature'>): string {
    const id = crypto.randomUUID();
    const alertEntry: AlertEntry = {
      ...alert,
      id,
      resolved: false,
    };

    // Create signature if private key is available
    if (this.privateKey) {
      const dataToSign = JSON.stringify({
        id: alertEntry.id,
        timestamp: alertEntry.timestamp,
        type: alertEntry.type,
        severity: alertEntry.severity,
        title: alertEntry.title,
        message: alertEntry.message,
        actor: alertEntry.actor,
        relatedAnchorId: alertEntry.relatedAnchorId,
        resolved: alertEntry.resolved,
      });

      try {
        const sign = crypto.createSign('SHA256');
        sign.update(dataToSign);
        alertEntry.signature = sign.sign(this.privateKey, 'hex');
      } catch (error) {
        this.logger.error('Failed to sign alert entry:', error);
      }
    }

    // Write to alerts file
    try {
      const dir = path.dirname(this.alertsPath);
      if (!fs.existsSync(dir)) ensureDirInRepoSync(dir);
      const line = JSON.stringify(alertEntry) + '\n';
      fs.appendFileSync(this.alertsPath, line);

      this.logger.info(`Alert added: ${alert.type} - ${alert.title}`);

      // Log to governance logger
      governanceLogger.log('alert_created', {
        alertId: id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        actor: alert.actor,
      }, alert.actor || 'system');

      // Send Discord notification for alerts
      if (process.env.NODE_ENV !== 'test') {
        discordService.sendAlert(alertEntry).catch(error => {
          this.logger.error('Failed to send Discord notification for alert:', error);
        });
      }

      return id;
    } catch (error) {
      this.logger.error('Failed to write alert entry:', error);
      throw error;
    }
  }

  /**
   * Get alerts with optional filtering
   */
  getAlerts(options: {
    limit?: number;
    offset?: number;
    type?: string;
    severity?: string;
    resolved?: boolean;
    startDate?: string;
    endDate?: string;
  } = {}): AlertEntry[] {
    try {
      if (!fs.existsSync(this.alertsPath)) {
        return [];
      }

      const lines = fs.readFileSync(this.alertsPath, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as AlertEntry);

      // Apply filters
      let filtered = lines;

      if (options.type) {
        filtered = filtered.filter(alert => alert.type === options.type);
      }

      if (options.severity) {
        filtered = filtered.filter(alert => alert.severity === options.severity);
      }

      if (options.resolved !== undefined) {
        filtered = filtered.filter(alert => alert.resolved === options.resolved);
      }

      if (options.startDate) {
        const startTime = new Date(options.startDate).getTime();
        filtered = filtered.filter(alert => new Date(alert.timestamp).getTime() >= startTime);
      }

      if (options.endDate) {
        const endTime = new Date(options.endDate).getTime();
        filtered = filtered.filter(alert => new Date(alert.timestamp).getTime() <= endTime);
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 100;
      return filtered.slice(offset, offset + limit);

    } catch (error) {
      this.logger.error('Failed to read alert entries:', error);
      return [];
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(id: string, resolution?: string): boolean {
    try {
      const alerts = this.getAlerts({ limit: 1000 });
      const alertIndex = alerts.findIndex(alert => alert.id === id);

      if (alertIndex === -1) {
        return false;
      }

      const alert = alerts[alertIndex];
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      alert.resolution = resolution;

      // Re-sign the updated alert
      if (this.privateKey) {
        const dataToSign = JSON.stringify({
          id: alert.id,
          timestamp: alert.timestamp,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          actor: alert.actor,
          relatedAnchorId: alert.relatedAnchorId,
          resolved: alert.resolved,
          resolvedAt: alert.resolvedAt,
          resolution: alert.resolution,
        });

        const sign = crypto.createSign('SHA256');
        sign.update(dataToSign);
        alert.signature = sign.sign(this.privateKey, 'hex');
      }

      // Rewrite the alerts file
      this.rewriteAlertsFile(alerts);

      this.logger.info(`Alert ${id} resolved: ${alert.title}`);

      // Log to governance logger
      governanceLogger.log('alert_resolved', {
        alertId: id,
        type: alert.type,
        title: alert.title,
        resolution,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to resolve alert:', error);
      return false;
    }
  }

  /**
   * Get active (unresolved) alerts summary
   */
  getActiveAlertsSummary(): { critical: number; warning: number; info: number; total: number } {
    const alerts = this.getAlerts({ resolved: false, limit: 1000 });

    return {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      total: alerts.length,
    };
  }

  /**
   * Check for automatic alerts based on timeline state
   */
  checkForAutomaticAlerts(): void {
    const timelineEntries = this.getTimelineEntries({ limit: 1000 });

    // Check for verification failures
    const failedVerifications = timelineEntries.filter(entry =>
      entry.verificationStatus === 'failed' &&
      !this.hasAlertForAnchor(entry.id, 'verification_failure')
    );

    for (const entry of failedVerifications) {
      this.addAlert({
        timestamp: new Date().toISOString(),
        type: 'verification_failure',
        severity: 'critical',
        title: `Verification Failed: ${entry.action}`,
        message: `Anchor verification failed for ${entry.action} by ${entry.actor}`,
        actor: 'system',
        relatedAnchorId: entry.id,
        resolved: false,
      });
    }

    // Check for missing genesis anchor
    const genesisAnchors = timelineEntries.filter(entry =>
      entry.action === 'genesis' || entry.action === 'genesis-anchor'
    );

    if (genesisAnchors.length === 0 && !this.hasAlertType('config_error', 'Missing Genesis Anchor')) {
      this.addAlert({
        timestamp: new Date().toISOString(),
        type: 'config_error',
        severity: 'critical',
        title: 'Missing Genesis Anchor',
        message: 'No genesis anchor found in timeline. Run genesis anchoring first.',
        actor: 'system',
        resolved: false,
      });
    }

    // Check for stale anchors (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const staleAnchors = timelineEntries.filter(entry =>
      new Date(entry.timestamp).getTime() < thirtyDaysAgo &&
      !this.hasAlertForAnchor(entry.id, 'system_warning')
    );

    for (const entry of staleAnchors) {
      this.addAlert({
        timestamp: new Date().toISOString(),
        type: 'system_warning',
        severity: 'warning',
        title: `Stale Anchor: ${entry.action}`,
        message: `Anchor is older than 30 days: ${entry.action} by ${entry.actor}`,
        actor: 'system',
        relatedAnchorId: entry.id,
        resolved: false,
      });
    }
  }

  /**
   * Helper: Check if an alert already exists for a specific anchor and type
   */
  private hasAlertForAnchor(anchorId: string, type: string): boolean {
    const alerts = this.getAlerts({ type, limit: 1000 });
    return alerts.some(alert => alert.relatedAnchorId === anchorId);
  }

  /**
   * Helper: Check if an alert already exists by type and title
   */
  private hasAlertType(type: string, title: string): boolean {
    const alerts = this.getAlerts({ type, limit: 1000 });
    return alerts.some(alert => alert.title === title);
  }

  /**
   * Helper: Rewrite the entire timeline file
   */
  private rewriteTimelineFile(entries: AnchorTimelineEntry[]): void {
    const content = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
    fs.writeFileSync(this.timelinePath, content);
  }

  /**
   * Helper: Rewrite the entire alerts file
   */
  private rewriteAlertsFile(alerts: AlertEntry[]): void {
    const content = alerts.map(alert => JSON.stringify(alert)).join('\n') + '\n';
    fs.writeFileSync(this.alertsPath, content);
  }

  /**
   * Verify timeline entry signature
   */
  verifyTimelineEntry(entry: AnchorTimelineEntry, publicKey: string): boolean {
    if (!entry.signature) {
      return false;
    }

    try {
      const dataToVerify = JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        actor: entry.actor,
        txSignature: entry.txSignature,
        memoContent: entry.memoContent,
        fingerprints: entry.fingerprints,
        verificationStatus: entry.verificationStatus,
        details: entry.details,
      });

      const verify = crypto.createVerify('SHA256');
      verify.update(dataToVerify);
      return verify.verify(publicKey, entry.signature, 'hex');
    } catch (error) {
      this.logger.error('Failed to verify timeline entry:', error);
      return false;
    }
  }

  /**
   * Verify alert entry signature
   */
  verifyAlertEntry(alert: AlertEntry, publicKey: string): boolean {
    if (!alert.signature) {
      return false;
    }

    try {
      const dataToVerify = JSON.stringify({
        id: alert.id,
        timestamp: alert.timestamp,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        actor: alert.actor,
        relatedAnchorId: alert.relatedAnchorId,
        resolved: alert.resolved,
        resolvedAt: alert.resolvedAt,
        resolution: alert.resolution,
      });

      const verify = crypto.createVerify('SHA256');
      verify.update(dataToVerify);
      return verify.verify(publicKey, alert.signature, 'hex');
    } catch (error) {
      this.logger.error('Failed to verify alert entry:', error);
      return false;
    }
  }
}

// Export singleton instance
export const timelineService = new TimelineService();
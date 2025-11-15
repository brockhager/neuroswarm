import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../index';
import { governanceLogger } from './governance-logger';
import { timelineService } from './timeline-service';
import { getGovernanceTimelinePath, getWorkspaceRoot } from '../utils/paths';

export interface AnchorStatus {
  timestamp: string;
  genesisFile: string;
  verificationStatus: 'verified' | 'failed' | 'pending' | 'error';
  lastVerification: string | null;
  blockchainAnchor: {
    network: string;
    transactionSignature: string | null;
    explorerUrl: string | null;
    memo: string | null;
  };
  localHash: string | null;
  blockchainHash: string | null;
  alerts: string[];
}

export class AnchorService {
  private genesisFile: string;
  private logFile: string;
  private scriptsDir: string;

  constructor() {
    // Allow overriding genesis path with environment variable (relative to repo root)
    const envGenesisPath = process.env.GENESIS_CONFIG_PATH || '';
    if (envGenesisPath && envGenesisPath.trim() !== '') {
      // Accept values like /docs/admin/admin-genesis.json or docs/admin/admin-genesis.json
      // Remove leading slash if present
      const normalized = envGenesisPath.replace(/^\//, '');
      this.genesisFile = path.join(process.cwd(), '..', normalized);
    } else {
      this.genesisFile = path.join(process.cwd(), '..', 'docs', 'admin-genesis.json');
    }
    this.logFile = getGovernanceTimelinePath();
    this.scriptsDir = path.join(process.cwd(), '..', 'scripts');
    if (logger && typeof (logger as any).info === 'function') {
      (logger as any).info(`AnchorService initialized - genesisFile: ${this.genesisFile}, logFile: ${this.logFile}`);
    }
  }

  /**
   * Get current anchor verification status
   */
  async getAnchorStatus(): Promise<AnchorStatus> {
    const status: AnchorStatus = {
      timestamp: new Date().toISOString(),
      genesisFile: this.genesisFile,
      verificationStatus: 'pending',
      lastVerification: null,
      blockchainAnchor: {
        network: 'solana',
        transactionSignature: null,
        explorerUrl: null,
        memo: null,
      },
      localHash: null,
      blockchainHash: null,
      alerts: [],
    };

    try {
      // Compute current local hash
      if (logger && typeof (logger as any).info === 'function') {
        (logger as any).info('Computing genesis local hash from file: ' + this.genesisFile);
      }
      status.localHash = this.computeGenesisHash();

      // Find latest anchor transaction from governance timeline logs
      // Prefer an anchor that matches the local computed genesis hash
      let latestAnchor = this.findAnchorByHash(status.localHash || '');
      if (!latestAnchor) {
        // If no matching anchor found, fallback to latest anchor
        latestAnchor = this.findLatestAnchor();
      }
      if (logger && typeof (logger as any).info === 'function') {
        (logger as any).info('Latest anchor discovered: ' + JSON.stringify(latestAnchor));
      }
      if (latestAnchor) {
        status.blockchainAnchor.transactionSignature = latestAnchor.txSignature;
        status.blockchainAnchor.explorerUrl = `https://explorer.solana.com/tx/${latestAnchor.txSignature}`;
        status.lastVerification = latestAnchor.timestamp;

        // Extract hash from memo (would need actual blockchain query)
        // For now, use logged hash
        status.blockchainHash = latestAnchor.hash;

        // Compare hashes
        if (status.localHash === status.blockchainHash) {
          status.verificationStatus = 'verified';
        } else {
          status.verificationStatus = 'failed';
          status.alerts.push('Genesis hash mismatch - potential tampering detected');
        }
      } else {
        status.verificationStatus = 'error';
        status.alerts.push('No blockchain anchor found in governance logs');
      }

    } catch (error) {
      logger.error('Anchor status check error:', error);
      status.verificationStatus = 'error';
      status.alerts.push(`Verification error: ${(error as Error).message}`);
    }

    return status;
  }

  /**
   * Prepare anchoring for a submission hash by writing a timeline anchor entry and producing a manual Solana memo instruction.
   * Returns a timelineId and a status indicating whether manual execution is required.
   */
  public prepareSubmissionAnchor(submissionHash: string, actor: string, submissionType: string, metadata?: Record<string, any>, submissionTimelineId?: string) {
    // Create a timeline entry for the submission anchor (no txSignature yet)
    const entryId = timelineService.addAnchorEntry({
      timestamp: new Date().toISOString(),
      action: 'submission-anchor',
      actor,
      txSignature: undefined,
      memoContent: `Submission anchor for ${submissionHash}`,
      fingerprints: { submission_sha256: submissionHash },
      verificationStatus: 'pending',
      explorerUrl: undefined,
      details: { submissionType, metadata, submissionTimelineId },
    });

    governanceLogger.log('submission_anchor_prepared', {
      entryId,
      submissionHash,
      actor,
      submissionType,
    });

    // Return a manual step indicator; actual Solana execution will be performed externally by founder
    return { timelineId: entryId, status: 'manual_execution_required' };
  }

  /**
   * Run automated anchor verification
   */
  async verifyAnchor(): Promise<boolean> {
    try {
      // Determine script extension based on platform
      const isWindows = process.platform === 'win32';
      const scriptName = isWindows ? 'verify-anchor.ps1' : 'verify-anchor.sh';
      const verifyScript = path.join(this.scriptsDir, scriptName);

      if (!fs.existsSync(verifyScript)) {
        throw new Error(`Verification script not found: ${scriptName}`);
      }

      // Run verification script with appropriate shell
      let command: string;
      let shell: string;

      if (isWindows) {
        command = `powershell.exe -ExecutionPolicy Bypass -File "${verifyScript}"`;
        shell = 'powershell.exe';
      } else {
        command = `bash "${verifyScript}"`;
        shell = 'bash';
      }

      logger.info(`Running anchor verification with ${shell}: ${scriptName}`);

      const output = execSync(command, {
        cwd: path.dirname(this.genesisFile),
        encoding: 'utf8',
        timeout: 30000, // 30 second timeout
        stdio: 'pipe', // Capture output
      });

      logger.info('Anchor verification completed:', output);

      // Check if verification passed (script exits 0 on success)
      return true;

    } catch (error) {
      logger.error('Anchor verification failed:', error);

      // Log verification failure
      governanceLogger.log('anchor_verification_failed', {
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
        platform: process.platform,
      });

      return false;
    }
  }

  /**
   * Compute SHA-256 hash of genesis file
   */
  private computeGenesisHash(): string {
    if (!fs.existsSync(this.genesisFile)) {
      throw new Error('Genesis file not found');
    }

    const fileContent = fs.readFileSync(this.genesisFile);
    return crypto.createHash('sha256').update(fileContent).digest('hex');
  }

  /**
   * Find latest genesis anchor from governance logs
   */
  private findLatestAnchor(): { txSignature: string; hash: string; timestamp: string } | null {
    try {
      if (!fs.existsSync(this.logFile)) {
        return null;
      }

      const logs = fs.readFileSync(this.logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        // Accept both 'genesis' and 'genesis-anchor' actions for backward compatibility
        .filter(entry => entry.action === 'genesis' || entry.action === 'genesis-anchor')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (logs.length === 0) return null;

      // Find the most recent entry with a transaction signature
      const latestWithTx = logs.find((entry: any) => (entry.txSignature || entry.tx_signature || entry.details?.txSignature || entry.details?.tx_signature));
      if (!latestWithTx) return null;
      const latest = latestWithTx;
      const txSignature = latest.txSignature || latest.tx_signature || latest.details?.txSignature || latest.details?.tx_signature || null;
      // hash can be under fingerprints.genesis_sha256 or top-level hash
      const hash = (latest.fingerprints && (latest.fingerprints.genesis_sha256 || latest.fingerprints.genesis_sha256)) || latest.hash || latest.details?.hash || null;

      return txSignature ? { txSignature, hash: hash || '', timestamp: latest.timestamp } : null;

    } catch (error) {
      logger.error('Error reading governance logs:', error);
      return null;
    }
  }

  /**
   * Expose latest anchor for external use
   */
  public getLatestAnchor(): { txSignature: string; hash: string; timestamp: string } | null {
    return this.findLatestAnchor();
  }

  /**
   * Return the latest anchor for a given action type (e.g. genesis, key-rotation)
   */
  public getLatestAnchorByType(actionType: string): { txSignature: string; hash: string; timestamp: string } | null {
    try {
      const anchors = this.findAnchorsByType(actionType);
      if (!anchors || anchors.length === 0) return null;

      const latest = anchors
        .filter(a => (a.txSignature || a.tx_signature || a.details?.txSignature || a.details?.tx_signature))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (!latest) return null;

      const txSignature = latest.txSignature || latest.tx_signature || latest.details?.txSignature || latest.details?.tx_signature || null;
      const hash = (latest.fingerprints && (latest.fingerprints.genesis_sha256 || latest.fingerprints.genesis_sha256)) || latest.hash || latest.details?.hash || latest.details?.genesis_sha256 || null;
      return txSignature ? { txSignature, hash: hash || '', timestamp: latest.timestamp } : null;
    } catch (error) {
      if (logger && typeof (logger as any).error === 'function') (logger as any).error('Error getting latest anchor by type:', error);
      return null;
    }
  }

  /**
   * Find an anchor entry by matching fingerprint hash
   */
  private findAnchorByHash(targetHash: string): { txSignature: string; hash: string; timestamp: string } | null {
    try {
      if (!fs.existsSync(this.logFile)) return null;

      const lines = fs.readFileSync(this.logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter(entry => entry.action === 'genesis' || entry.action === 'genesis-anchor')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      for (const entry of lines) {
        const entryHash = entry.fingerprints?.genesis_sha256 || entry.hash || entry.details?.hash;
        if (!entryHash) continue;
        if (entryHash === targetHash) {
          const txSignature = entry.txSignature || entry.tx_signature || entry.details?.txSignature || entry.details?.tx_signature || null;
          if (txSignature) {
            return { txSignature, hash: entryHash, timestamp: entry.timestamp };
          }
        }
      }

      return null;
    } catch (error) {
      if (logger && typeof (logger as any).error === 'function') (logger as any).error('Error finding anchor by hash:', error);
      return null;
    }
  }

  /**
   * Get governance anchoring status for all anchor types
   */
  async getGovernanceAnchoringStatus(): Promise<any> {
    const status = {
      timestamp: new Date().toISOString(),
      anchors: [] as any[],
      alerts: [] as string[],
    };

    try {
      // Get all anchor types from governance logs
      const anchorTypes = ['genesis', 'key-rotation', 'policy-update'];
      const allAnchors: any[] = [];

      for (const anchorType of anchorTypes) {
        const anchors = this.findAnchorsByType(anchorType);
        allAnchors.push(...anchors);
      }

      // Process each anchor
      for (const anchor of allAnchors) {
        // Read txSignature from multiple possible locations
        const txSig = anchor.txSignature || anchor.tx_signature || anchor.details?.tx_signature || anchor.details?.txSignature || null;
        
        const anchorStatus = {
          action: anchor.action,
          timestamp: anchor.timestamp,
          txSignature: txSig,
          verificationStatus: anchor.verificationStatus || (txSig ? 'verified' : 'pending') as 'verified' | 'failed' | 'pending',
          fingerprints: anchor.fingerprints || anchor.details?.fingerprints || {},
          explorerUrl: txSig ? `https://explorer.solana.com/tx/${txSig}` : null,
        };

        status.anchors.push(anchorStatus);
      }

      // Sort by timestamp (newest first)
      status.anchors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Check for alerts
      status.alerts = await this.getGovernanceAlerts(status.anchors);

    } catch (error) {
      logger.error('Governance anchoring status error:', error);
      status.alerts.push(`Failed to retrieve anchoring status: ${(error as Error).message}`);
    }

    return status;
  }

  /**
   * Find anchors by type from governance logs
   */
  private findAnchorsByType(actionType: string): any[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const logs = fs.readFileSync(this.logFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .filter(entry => entry.action === actionType || entry.action === `${actionType}-anchor`)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return logs;

    } catch (error) {
      logger.error(`Error reading governance logs for ${actionType}:`, error);
      return [];
    }
  }

  /**
   * Check for anchor alerts (legacy method for backward compatibility)
   */
  async getAlerts(): Promise<string[]> {
    const status = await this.getGovernanceAnchoringStatus();
    return status.alerts;
  }

  /**
   * Check for governance anchoring alerts
   */
  private async getGovernanceAlerts(anchors: any[]): Promise<string[]> {
    const alerts: string[] = [];

    // Check if genesis is anchored
    const genesisAnchors = anchors.filter(a => a.action === 'genesis' || a.action === 'genesis-anchor');
    if (genesisAnchors.length === 0) {
      alerts.push('WARNING: No genesis anchor found - run genesis anchoring first');
    }

    // Check for failed verifications
    const failedAnchors = anchors.filter(a => a.verificationStatus === 'failed');
    if (failedAnchors.length > 0) {
      alerts.push(`CRITICAL: ${failedAnchors.length} anchor(s) failed verification`);
    }

    // Check for stale anchors (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const staleAnchors = anchors.filter(a => new Date(a.timestamp).getTime() < thirtyDaysAgo);
    if (staleAnchors.length > 0) {
      alerts.push(`INFO: ${staleAnchors.length} anchor(s) are older than 30 days`);
    }

    return alerts;
  }
}

// Export singleton instance
export const anchorService = new AnchorService();
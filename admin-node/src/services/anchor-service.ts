import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../index';
import { governanceLogger } from './governance-logger';

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
    this.genesisFile = path.join(process.cwd(), '..', 'docs', 'admin-genesis.json');
    this.logFile = path.join(process.cwd(), '..', 'wp_publish_log.jsonl');
    this.scriptsDir = path.join(process.cwd(), '..', 'scripts');
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
      status.localHash = this.computeGenesisHash();

      // Find latest anchor transaction from logs
      const latestAnchor = this.findLatestAnchor();
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
        .filter(entry => entry.action === 'genesis-anchor')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return logs.length > 0 ? {
        txSignature: logs[0].txSignature,
        hash: logs[0].hash,
        timestamp: logs[0].timestamp,
      } : null;

    } catch (error) {
      logger.error('Error reading governance logs:', error);
      return null;
    }
  }

  /**
   * Check for anchor alerts
   */
  async getAlerts(): Promise<string[]> {
    const alerts: string[] = [];

    try {
      const status = await this.getAnchorStatus();

      if (status.verificationStatus === 'failed') {
        alerts.push('CRITICAL: Blockchain anchor verification failed - genesis integrity compromised');
      } else if (status.verificationStatus === 'error') {
        alerts.push('WARNING: Unable to verify blockchain anchor - check system configuration');
      }

      // Check if verification is stale (older than 24 hours)
      if (status.lastVerification) {
        const lastCheck = new Date(status.lastVerification);
        const hoursSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);

        if (hoursSinceCheck > 24) {
          alerts.push(`WARNING: Anchor verification stale (${Math.round(hoursSinceCheck)} hours old)`);
        }
      }

    } catch (error) {
      alerts.push(`ERROR: Anchor monitoring failed - ${(error as Error).message}`);
    }

    return alerts;
  }
}

// Export singleton instance
export const anchorService = new AnchorService();
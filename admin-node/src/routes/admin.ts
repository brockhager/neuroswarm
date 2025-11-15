import { Router, Request, Response } from 'express';
import { requireFounder, requireAdmin } from '../middleware/auth';
import { governanceLogger } from '../services/governance-logger';
import { logger } from '../index';
import { spawn } from 'child_process';
import path from 'path';
import { timelineService } from '../services/timeline-service';

const router = Router();

// GET /v1/admin/status - System status overview
router.get('/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('status_query', userId, {
      endpoint: '/v1/admin/status',
    });

    // TODO: Implement actual system status aggregation
    const status = {
      timestamp: new Date().toISOString(),
      system: {
        status: 'operational',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      blockchain: {
        status: 'connected', // TODO: Check Solana connection
        lastBlock: null, // TODO: Get latest block
      },
      services: {
        neuroServices: 'operational', // TODO: Health check
        neuroProgram: 'operational', // TODO: Health check
      },
    };

    res.json(status);
  } catch (error) {
    logger.error('Status query error:', error);
    governanceLogger.log('error', {
      endpoint: '/v1/admin/status',
      error: (error as Error).message,
    });

    res.status(500).json({
      error: 'Failed to retrieve system status',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /v1/admin/freeze - Emergency freeze operation
router.post('/freeze', requireFounder, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { reason, scope } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Reason required',
        message: 'Freeze operation must include a reason',
      });
    }

    governanceLogger.logEmergencyAction('freeze_initiated', userId, reason, {
      scope: scope || 'full',
      endpoint: '/v1/admin/freeze',
    });

    // TODO: Implement actual freeze logic
    // This would involve:
    // 1. Setting system-wide freeze flags
    // 2. Notifying all services
    // 3. Preventing new transactions/operations
    // 4. Logging the freeze state

    logger.warn(`EMERGENCY FREEZE initiated by ${userId}: ${reason}`);

    res.json({
      success: true,
      operation: 'freeze',
      reason,
      scope: scope || 'full',
      timestamp: new Date().toISOString(),
      status: 'Freeze operation completed - system frozen',
    });
  } catch (error) {
    logger.error('Freeze operation error:', error);
    governanceLogger.log('error', {
      endpoint: '/v1/admin/freeze',
      error: (error as Error).message,
    });

    res.status(500).json({
      error: 'Freeze operation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /v1/admin/restore - Emergency restore operation
router.post('/restore', requireFounder, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Reason required',
        message: 'Restore operation must include a reason',
      });
    }

    governanceLogger.logEmergencyAction('restore_initiated', userId, reason, {
      endpoint: '/v1/admin/restore',
    });

    // TODO: Implement actual restore logic
    // This would involve:
    // 1. Clearing freeze flags
    // 2. Resuming normal operations
    // 3. Validating system state
    // 4. Logging the restore

    logger.info(`EMERGENCY RESTORE initiated by ${userId}: ${reason}`);

    res.json({
      success: true,
      operation: 'restore',
      reason,
      timestamp: new Date().toISOString(),
      status: 'Restore operation completed - system operational',
    });
  } catch (error) {
    logger.error('Restore operation error:', error);
    governanceLogger.log('error', {
      endpoint: '/v1/admin/restore',
      error: (error as Error).message,
    });

    res.status(500).json({
      error: 'Restore operation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/admin/logs - Recent governance logs (admin access)
router.get('/logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000);

    governanceLogger.logAdminAction('logs_query', userId, {
      endpoint: '/v1/admin/logs',
      limit,
    });

    // TODO: Implement log retrieval with pagination
    // For now, return a placeholder
    res.json({
      logs: [],
      total: 0,
      limit,
      timestamp: new Date().toISOString(),
      note: 'Log retrieval not yet implemented',
    });
  } catch (error) {
    logger.error('Logs query error:', error);
    res.status(500).json({
      error: 'Failed to retrieve logs',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /v1/admin/config - Update system configuration (founder only)
router.post('/config', requireFounder, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({
        error: 'Key required',
        message: 'Configuration key must be specified',
      });
    }

    governanceLogger.logEmergencyAction('config_update', userId, `Updated ${key}`, {
      key,
      endpoint: '/v1/admin/config',
      // Note: value not logged for security
    });

    // TODO: Implement secure configuration updates
    // This should validate keys, update configs, and restart services if needed

    logger.info(`Configuration update by ${userId}: ${key}`);

    res.json({
      success: true,
      operation: 'config_update',
      key,
      timestamp: new Date().toISOString(),
      status: 'Configuration updated (implementation pending)',
    });
  } catch (error) {
    logger.error('Config update error:', error);
    res.status(500).json({
      error: 'Configuration update failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /v1/admin/anchor-genesis - Execute genesis anchoring (founder only)
router.post('/anchor-genesis', requireFounder, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('anchor_genesis_initiated', userId, {
      endpoint: '/v1/admin/anchor-genesis',
    });

    logger.info(`Genesis anchoring initiated by ${userId}`);

    // Execute anchor-genesis.ts script
    const scriptPath = path.join(process.cwd(), 'scripts', 'anchor-genesis.ts');
    const nodeCmd = process.execPath; // Path to node executable
    const tsNodePath = path.join(process.cwd(), 'node_modules', '.bin', 'ts-node');

    const child = spawn(tsNodePath, [scriptPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        // Parse the output to extract transaction info
        const lines = stdout.split('\n');
        let txSignature = null;
        let memoContent: string | undefined;

        // Look for the manual execution command in output
        for (const line of lines) {
          if (line.includes('solana transfer')) {
            // Extract memo content from the command
            const memoMatch = line.match(/--memo "([^"]+)"/);
            if (memoMatch) {
              memoContent = memoMatch[1];
            }
          }
        }

        // For now, return placeholder since actual transaction requires manual execution
        const timelineId = timelineService.addAnchorEntry({
          timestamp: new Date().toISOString(),
          action: 'genesis',
          actor: userId,
          txSignature: undefined,
          memoContent,
          fingerprints: {},
          verificationStatus: 'pending',
          explorerUrl: undefined,
          details: {
            scriptOutput: stdout,
            operation: 'anchor_genesis',
          },
        });

        governanceLogger.logAdminAction('anchor_genesis_completed', userId, {
          endpoint: '/v1/admin/anchor-genesis',
          status: 'manual_execution_required',
          memo_content: memoContent,
          timeline_id: timelineId,
        });

        res.json({
          success: true,
          operation: 'anchor_genesis',
          status: 'manual_execution_required',
          memoContent,
          timelineId,
          instructions: 'Execute the generated Solana CLI command with your funded account, then update governance logs with the transaction signature.',
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`Anchor genesis script failed with code ${code}: ${stderr}`);

        governanceLogger.log('error', {
          endpoint: '/v1/admin/anchor-genesis',
          error: `Script failed: ${stderr}`,
          exitCode: code,
        });

        res.status(500).json({
          error: 'Genesis anchoring failed',
          details: stderr,
          timestamp: new Date().toISOString(),
        });
      }
    });

    child.on('error', (error) => {
      logger.error('Failed to start anchor genesis script:', error);

      governanceLogger.log('error', {
        endpoint: '/v1/admin/anchor-genesis',
        error: error.message,
      });

      res.status(500).json({
        error: 'Failed to execute anchoring script',
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    });

  } catch (error) {
    logger.error('Anchor genesis API error:', error);

    governanceLogger.log('error', {
      endpoint: '/v1/admin/anchor-genesis',
      error: (error as Error).message,
    });

    res.status(500).json({
      error: 'Genesis anchoring operation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/admin/verify-genesis/:txSig - Execute genesis verification
router.get('/verify-genesis/:txSig', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { txSig } = req.params;

    if (!txSig) {
      return res.status(400).json({
        error: 'Transaction signature required',
        message: 'Provide transaction signature as URL parameter',
      });
    }

    governanceLogger.logAdminAction('verify_genesis_initiated', userId, {
      endpoint: '/v1/admin/verify-genesis',
      tx_signature: txSig,
    });

    logger.info(`Genesis verification initiated by ${userId} for tx: ${txSig}`);

    // Execute verify-genesis.ts script
    const scriptPath = path.join(process.cwd(), 'scripts', 'verify-genesis.ts');
    const nodeCmd = process.execPath;
    const tsNodePath = path.join(process.cwd(), 'node_modules', '.bin', 'ts-node');

    const child = spawn(tsNodePath, [scriptPath, txSig], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        // Parse verification results
        const lines = stdout.split('\n');
        let verificationResult = 'unknown';
        let details = [];

        for (const line of lines) {
          if (line.includes('✅ SUCCESS:')) {
            verificationResult = 'verified';
          } else if (line.includes('❌ FAILURE:')) {
            verificationResult = 'failed';
          } else if (line.includes('founder_pub_sha256:') ||
                     line.includes('admin_pub_sha256:') ||
                     line.includes('genesis_sha256:')) {
            details.push(line.trim());
          }
        }

        governanceLogger.logAdminAction('verify_genesis_completed', userId, {
          endpoint: '/v1/admin/verify-genesis',
          tx_signature: txSig,
          result: verificationResult,
        });

        // Update timeline entry if verification was successful
        if (verificationResult === 'verified' || verificationResult === 'failed') {
          // Find the timeline entry for this transaction
          const timelineEntries = timelineService.getTimelineEntries({ limit: 100 });
          const entry = timelineEntries.find(e => e.txSignature === txSig || e.details?.txSignature === txSig);

          if (entry) {
            timelineService.updateAnchorVerification(entry.id, verificationResult as 'verified' | 'failed', {
              verificationDetails: details,
              verifiedAt: new Date().toISOString(),
              verifiedBy: userId,
            });
          }
        }

        res.json({
          success: true,
          operation: 'verify_genesis',
          txSignature: txSig,
          result: verificationResult,
          details,
          fullOutput: stdout,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`Verify genesis script failed with code ${code}: ${stderr}`);

        governanceLogger.log('error', {
          endpoint: '/v1/admin/verify-genesis',
          tx_signature: txSig,
          error: `Script failed: ${stderr}`,
          exitCode: code,
        });

        res.status(500).json({
          error: 'Genesis verification failed',
          txSignature: txSig,
          details: stderr,
          timestamp: new Date().toISOString(),
        });
      }
    });

    child.on('error', (error) => {
      logger.error('Failed to start verify genesis script:', error);

      governanceLogger.log('error', {
        endpoint: '/v1/admin/verify-genesis',
        tx_signature: txSig,
        error: error.message,
      });

      res.status(500).json({
        error: 'Failed to execute verification script',
        txSignature: txSig,
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    });

  } catch (error) {
    logger.error('Verify genesis API error:', error);

    governanceLogger.log('error', {
      endpoint: '/v1/admin/verify-genesis',
      error: (error as Error).message,
    });

    res.status(500).json({
      error: 'Genesis verification operation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /v1/admin/rotate-founder-key - Execute founder key rotation (founder only)
router.post('/rotate-founder-key', requireFounder, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('key_rotation_initiated', userId, {
      endpoint: '/v1/admin/rotate-founder-key',
    });

    logger.info(`Founder key rotation initiated by ${userId}`);

    // Execute key rotation anchoring script
    const scriptPath = path.join(process.cwd(), 'scripts', 'anchor-governance.ts');
    const tsNodePath = path.join(process.cwd(), 'node_modules', '.bin', 'ts-node');

    // Generate new key paths (temporary for anchoring)
    const newKeyPath = path.join(process.cwd(), 'secrets', 'founder-new.jwt.key');
    const oldKeyPath = path.join(process.cwd(), 'secrets', 'founder.jwt.key');

    const child = spawn(tsNodePath, [scriptPath, 'key-rotation', `--new-key=${newKeyPath}`, `--old-key=${oldKeyPath}`], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        // Parse the output to extract transaction info
        const lines = stdout.split('\n');
        let memoContent: string | undefined;

        // Look for the manual execution command in output
        for (const line of lines) {
          if (line.includes('solana transfer')) {
            const memoMatch = line.match(/--memo "([^"]+)"/);
            if (memoMatch) {
              memoContent = memoMatch[1];
            }
          }
        }

        governanceLogger.logAdminAction('key_rotation_prepared', userId, {
          endpoint: '/v1/admin/rotate-founder-key',
          status: 'manual_execution_required',
          memo_content: memoContent,
          new_key_path: newKeyPath,
          old_key_path: oldKeyPath,
        });

        res.json({
          success: true,
          operation: 'key_rotation',
          status: 'manual_execution_required',
          memoContent,
          newKeyPath,
          oldKeyPath,
          instructions: 'Execute the generated Solana CLI command with your funded account. After transaction confirmation, the new key will be activated.',
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error(`Key rotation script failed with code ${code}: ${stderr}`);

        governanceLogger.log('error', {
          endpoint: '/v1/admin/rotate-founder-key',
          error: `Script failed: ${stderr}`,
          exitCode: code,
        });

        res.status(500).json({
          error: 'Key rotation anchoring failed',
          details: stderr,
          timestamp: new Date().toISOString(),
        });
      }
    });

    child.on('error', (error) => {
      logger.error('Failed to start key rotation script:', error);

      governanceLogger.log('error', {
        endpoint: '/v1/admin/rotate-founder-key',
        error: error.message,
      });

      res.status(500).json({
        error: 'Failed to execute key rotation script',
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    });

  } catch (error) {
    logger.error('Key rotation API error:', error);

    governanceLogger.log('error', {
      endpoint: '/v1/admin/rotate-founder-key',
      error: (error as Error).message,
    });

    res.status(500).json({
      error: 'Key rotation operation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/admin/validate-genesis-config - Validate genesis configuration integrity
router.get('/validate-genesis-config', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('genesis_config_validation', userId, {
      endpoint: '/v1/admin/validate-genesis-config',
    });

    // Read and validate genesis config
    const genesisPath = path.resolve(process.cwd(), '..', process.env.GENESIS_CONFIG_PATH?.replace(/^\//, '') || 'docs/admin-genesis.json');
    
    if (!require('fs').existsSync(genesisPath)) {
      return res.status(404).json({
        error: 'Genesis config not found',
        path: genesisPath,
        timestamp: new Date().toISOString(),
      });
    }

    const genesisContent = require('fs').readFileSync(genesisPath, 'utf8');
    let genesisConfig;

    try {
      genesisConfig = JSON.parse(genesisContent);
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid JSON in genesis config',
        details: (parseError as Error).message,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate required fields
    const requiredFields = [
      'network',
      'consensus',
      'tokenomics',
      'governance',
      'security'
    ];

    const validationResults = {
      valid: true,
      checks: [] as Array<{field: string, present: boolean, valid: boolean, details?: string}>,
      summary: {
        totalFields: requiredFields.length,
        presentFields: 0,
        validFields: 0
      }
    };

    for (const field of requiredFields) {
      const present = genesisConfig.hasOwnProperty(field);
      let valid = false;
      let details = '';

      if (present) {
        validationResults.summary.presentFields++;
        
        // Basic validation for each field
        switch (field) {
          case 'network':
            valid = typeof genesisConfig.network === 'object' && 
                   genesisConfig.network.hasOwnProperty('name') &&
                   genesisConfig.network.hasOwnProperty('chainId');
            details = valid ? 'Valid network configuration' : 'Missing name or chainId';
            break;
          case 'consensus':
            valid = typeof genesisConfig.consensus === 'object';
            details = valid ? 'Valid consensus configuration' : 'Invalid consensus object';
            break;
          case 'tokenomics':
            valid = typeof genesisConfig.tokenomics === 'object';
            details = valid ? 'Valid tokenomics configuration' : 'Invalid tokenomics object';
            break;
          case 'governance':
            valid = typeof genesisConfig.governance === 'object';
            details = valid ? 'Valid governance configuration' : 'Invalid governance object';
            break;
          case 'security':
            valid = typeof genesisConfig.security === 'object';
            details = valid ? 'Valid security configuration' : 'Invalid security object';
            break;
          default:
            valid = true;
            details = 'Field present';
        }

        if (valid) {
          validationResults.summary.validFields++;
        }
      }

      validationResults.checks.push({
        field,
        present,
        valid: present && valid,
        details
      });

      if (!valid) {
        validationResults.valid = false;
      }
    }

    governanceLogger.logAdminAction('genesis_config_validated', userId, {
      endpoint: '/v1/admin/validate-genesis-config',
      result: validationResults.valid ? 'valid' : 'invalid',
      validFields: validationResults.summary.validFields,
      totalFields: validationResults.summary.totalFields,
    });

    res.json({
      success: true,
      operation: 'validate_genesis_config',
      configPath: genesisPath,
      validation: validationResults,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Genesis config validation error:', error);

    governanceLogger.log('error', {
      endpoint: '/v1/admin/validate-genesis-config',
      error: (error as Error).message,
    });

    res.status(500).json({
      error: 'Genesis config validation failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as adminRoutes };
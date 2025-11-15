import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { governanceLogger } from '../services/governance-logger';
import { logger } from '../index';
import { anchorService } from '../services/anchor-service';
import { timelineService } from '../services/timeline-service';

const router = Router();

// GET /v1/observability/consensus - Consensus monitoring data
router.get('/consensus', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('observability_query', userId, {
      stream: 'consensus',
      endpoint: '/v1/observability/consensus',
    });

    // TODO: Implement consensus data aggregation
    // This should pull from neuro-services consensus streams
    const consensusData = {
      timestamp: new Date().toISOString(),
      currentBlock: null, // TODO: Get from Solana
      validatorCount: 0, // TODO: Get validator count
      activeValidators: 0, // TODO: Get active count
      proposals: {
        active: 0,
        passed: 0,
        failed: 0,
        total: 0,
      },
      recentBlocks: [], // TODO: Get recent blocks
      networkHealth: 'unknown', // TODO: Calculate health score
    };

    res.json(consensusData);
  } catch (error) {
    logger.error('Consensus observability error:', error);
    res.status(500).json({
      error: 'Failed to retrieve consensus data',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/observability/tokenomics - Tokenomics monitoring data
router.get('/tokenomics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('observability_query', userId, {
      stream: 'tokenomics',
      endpoint: '/v1/observability/tokenomics',
    });

    // TODO: Implement tokenomics data aggregation
    // This should pull from neuro-services tokenomics streams
    const tokenomicsData = {
      timestamp: new Date().toISOString(),
      totalSupply: 0, // TODO: Get from blockchain
      circulatingSupply: 0, // TODO: Calculate circulating
      staking: {
        totalStaked: 0,
        stakingRatio: 0,
        rewardsDistributed: 0,
      },
      rewards: {
        daily: 0,
        weekly: 0,
        monthly: 0,
      },
      transactions: {
        daily: 0,
        volume24h: 0,
      },
    };

    res.json(tokenomicsData);
  } catch (error) {
    logger.error('Tokenomics observability error:', error);
    res.status(500).json({
      error: 'Failed to retrieve tokenomics data',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/observability/communication - Agent communication monitoring
router.get('/communication', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('observability_query', userId, {
      stream: 'communication',
      endpoint: '/v1/observability/communication',
    });

    // TODO: Implement communication data aggregation
    // This should pull from neuro-services communication streams
    const communicationData = {
      timestamp: new Date().toISOString(),
      activeAgents: 0, // TODO: Get from agent registry
      totalInteractions: 0, // TODO: Get interaction count
      swarmActivity: {
        messagesPerMinute: 0,
        activeConversations: 0,
        averageResponseTime: 0,
      },
      agentHealth: [], // TODO: Get agent health status
      networkTopology: {
        nodes: 0,
        connections: 0,
        averageDegree: 0,
      },
    };

    res.json(communicationData);
  } catch (error) {
    logger.error('Communication observability error:', error);
    res.status(500).json({
      error: 'Failed to retrieve communication data',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/observability/metrics - General system metrics
router.get('/metrics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('observability_query', userId, {
      stream: 'metrics',
      endpoint: '/v1/observability/metrics',
    });

    // TODO: Implement comprehensive metrics aggregation
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      services: {
        adminNode: 'operational',
        neuroServices: 'unknown', // TODO: Health check
        neuroProgram: 'unknown', // TODO: Health check
        indexer: 'unknown', // TODO: Health check
      },
      performance: {
        responseTime: 0, // TODO: Calculate average
        throughput: 0, // TODO: Calculate RPS
        errorRate: 0, // TODO: Calculate error percentage
      },
      alerts: [], // TODO: Get active alerts
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Metrics observability error:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/observability/anchor-status - Blockchain anchor verification status
router.get('/anchor-status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('observability_query', userId, {
      stream: 'anchor-status',
      endpoint: '/v1/observability/anchor-status',
    });

    // Get anchor status from service
    const anchorStatus = await anchorService.getAnchorStatus();
    const alerts = await anchorService.getAlerts();

    // Enhance response with alerts
    const response = {
      ...anchorStatus,
      alerts,
    };

    res.json(response);
  } catch (error) {
    logger.error('Anchor status observability error:', error);
    res.status(500).json({
      error: 'Failed to retrieve anchor status',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/observability/nodes - Network nodes overview
router.get('/nodes', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('observability_query', userId, {
      stream: 'nodes',
      endpoint: '/v1/observability/nodes',
    });

    // TODO: Implement node discovery and status tracking
    // For now, return mock data based on admin-genesis.json
    const nodes = [
      {
        nodeId: 'admin-node-1',
        name: 'Admin Node 1',
        role: 'admin',
        ip: '203.0.113.42',
        status: 'active',
      },
      {
        nodeId: 'admin-node-2',
        name: 'Admin Node 2',
        role: 'admin',
        ip: '198.51.100.17',
        status: 'active',
      },
      {
        nodeId: 'admin-node-3',
        name: 'Admin Node 3',
        role: 'admin',
        ip: '192.0.2.1',
        status: 'pending',
      },
      {
        nodeId: 'validator-001',
        name: 'Validator Node 1',
        role: 'validator',
        ip: '10.0.0.100',
        status: 'active',
      },
      {
        nodeId: 'indexer-001',
        name: 'Indexer Node 1',
        role: 'indexer',
        ip: '10.0.0.101',
        status: 'active',
      },
      {
        nodeId: 'gateway-001',
        name: 'Gateway Node 1',
        role: 'gateway',
        ip: '10.0.0.102',
        status: 'denied',
      },
    ];

    // Log any denied nodes for governance
    nodes.forEach(node => {
      if (node.status === 'denied') {
        governanceLogger.logNodeStatusUpdate(node.nodeId, node.ip, node.status, {
          role: node.role,
          reason: 'IP not in admin whitelist',
        });
      }
    });

    res.json(nodes);
  } catch (error) {
    logger.error('Nodes observability error:', error);
    res.status(500).json({
      error: 'Failed to retrieve nodes data',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/observability/governance-anchoring - Governance anchoring status
router.get('/governance-anchoring', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('observability_query', userId, {
      stream: 'governance-anchoring',
      endpoint: '/v1/observability/governance-anchoring',
    });

    // Get governance anchoring data from service
    const anchoringData = await anchorService.getGovernanceAnchoringStatus();

    res.json(anchoringData);
  } catch (error) {
    logger.error('Governance anchoring observability error:', error);
    res.status(500).json({
      error: 'Failed to retrieve governance anchoring data',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/observability/governance-timeline - Governance anchoring timeline
router.get('/governance-timeline', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('observability_query', userId, {
      stream: 'governance-timeline',
      endpoint: '/v1/observability/governance-timeline',
    });

    // Parse query parameters
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      action: req.query.action as string,
      actor: req.query.actor as string,
      verificationStatus: req.query.verificationStatus as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    // Get timeline entries
    const timelineEntries = timelineService.getTimelineEntries(options);

    // Get summary statistics
    const allEntries = timelineService.getTimelineEntries({ limit: 1000 });
    const summary = {
      total: allEntries.length,
      verified: allEntries.filter(e => e.verificationStatus === 'verified').length,
      failed: allEntries.filter(e => e.verificationStatus === 'failed').length,
      pending: allEntries.filter(e => e.verificationStatus === 'pending').length,
      byAction: {} as Record<string, number>,
    };

    // Count by action type
    allEntries.forEach(entry => {
      summary.byAction[entry.action] = (summary.byAction[entry.action] || 0) + 1;
    });

    const response = {
      timestamp: new Date().toISOString(),
      summary,
      entries: timelineEntries,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        hasMore: timelineEntries.length === options.limit,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Governance timeline observability error:', error);
    res.status(500).json({
      error: 'Failed to retrieve governance timeline',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/observability/governance-alerts - Governance alerts
router.get('/governance-alerts', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('observability_query', userId, {
      stream: 'governance-alerts',
      endpoint: '/v1/observability/governance-alerts',
    });

    // Parse query parameters
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      type: req.query.type as string,
      severity: req.query.severity as string,
      resolved: req.query.resolved ? req.query.resolved === 'true' : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    // Get alerts
    const alerts = timelineService.getAlerts(options);

    // Get summary
    const summary = timelineService.getActiveAlertsSummary();

    const response = {
      timestamp: new Date().toISOString(),
      summary,
      alerts,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        hasMore: alerts.length === options.limit,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Governance alerts observability error:', error);
    res.status(500).json({
      error: 'Failed to retrieve governance alerts',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /v1/observability/governance-alerts/:alertId/resolve - Resolve an alert
router.post('/governance-alerts/:alertId/resolve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { alertId } = req.params;
    const { resolution } = req.body;

    governanceLogger.logAdminAction('alert_resolution', userId, {
      endpoint: '/v1/observability/governance-alerts/:alertId/resolve',
      alertId,
      resolution,
    });

    // Resolve the alert
    const success = timelineService.resolveAlert(alertId, resolution);

    if (!success) {
      return res.status(404).json({
        error: 'Alert not found',
        alertId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      operation: 'resolve_alert',
      alertId,
      resolution,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Alert resolution error:', error);
    res.status(500).json({
      error: 'Failed to resolve alert',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /v1/observability/check-alerts - Manually trigger alert checking
router.post('/check-alerts', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('alert_check_triggered', userId, {
      endpoint: '/v1/observability/check-alerts',
    });

    // Run automatic alert checking
    timelineService.checkForAutomaticAlerts();

    // Get updated alerts summary
    const summary = timelineService.getActiveAlertsSummary();

    res.json({
      success: true,
      operation: 'check_alerts',
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Alert checking error:', error);
    res.status(500).json({
      error: 'Failed to check alerts',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /v1/observability/send-onboarding - Send onboarding guide to Discord
router.post('/send-onboarding', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    governanceLogger.logAdminAction('discord_onboarding_sent', userId, {
      endpoint: '/v1/observability/send-onboarding',
    });

    // Import discord service dynamically to avoid circular imports
    const { discordService } = await import('../services/discord-service');

    await discordService.sendOnboardingGuide();

    res.json({
      success: true,
      operation: 'send_onboarding',
      message: 'Onboarding guide sent to Discord',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Discord onboarding send error:', error);
    res.status(500).json({
      error: 'Failed to send onboarding guide to Discord',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /v1/observability/discord-status - Check Discord bot status
router.get('/discord-status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Import discord service dynamically to avoid circular imports
    const { discordService } = await import('../services/discord-service');

    const isConnected = discordService.isConnected();

    governanceLogger.logAdminAction('discord_status_check', userId, {
      endpoint: '/v1/observability/discord-status',
      connected: isConnected,
    });

    res.json({
      connected: isConnected,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Discord status check error:', error);
    res.status(500).json({
      error: 'Failed to check Discord status',
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as observabilityRoutes };
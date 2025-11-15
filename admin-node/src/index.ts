import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment variables loaded. GOVERNANCE_PRIVATE_KEY_PATH:', process.env.GOVERNANCE_PRIVATE_KEY_PATH);

// Import routes and middleware
import { authMiddleware } from './middleware/auth';
import { adminRoutes } from './routes/admin';
import { createSubmissionsRouter } from '../../submissions/src/index';
import { requireContributor } from './middleware/auth';
import { observabilityRoutes } from './routes/observability';
import { chatRoutes } from './routes/chat';
import { anchorService } from './services/anchor-service';
import { createGovernanceLogger, governanceLogger } from './services/governance-logger';
import { discordService } from './services/discord-service';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'admin-node' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Initialize governance logger with winston logger
const governanceLoggerInstance = createGovernanceLogger(logger);

// Log key setup completion
governanceLoggerInstance.log('key-setup', {
  status: 'completed',
  keys: ['founder.jwt.key', 'founder.jwt.pub', 'admin-node.jwt.key', 'admin-node.jwt.pub'],
  environment: process.env.NODE_ENV
});

// Security middleware
// Allow relaxed Content Security Policy in non-production environments so e2e/dev harness which uses
// inline event handlers and inline scripts continues to function. In production environments we keep
// CSP enforcement enabled.
const helmetOptions = process.env.NODE_ENV === 'production' ? {} : { contentSecurityPolicy: false };
app.use(helmet(helmetOptions));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for dashboard
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin routes (protected)
app.use('/v1/admin', authMiddleware, adminRoutes);

// Submissions router under /v1/brain
import { reputationService } from './services/reputation-service';
app.use('/v1/brain', authMiddleware, requireContributor, createSubmissionsRouter({ safetyService, timelineService, anchorService, governanceLogger, logger, reputationService }));
// Chat endpoints
app.use('/v1/chat', authMiddleware, chatRoutes);

// Observability routes (protected)
// Public observability endpoints (registered before auth middleware)
// Latest anchor is safe to expose for dashboards, so keep a read-only public endpoint
app.get('/v1/observability/latest-anchor', async (req, res) => {
  try {
    const actionType = req.query.action as string | undefined;
    const anchor = actionType ? anchorService.getLatestAnchorByType(actionType) : anchorService.getLatestAnchor();

    if (!anchor) {
      return res.status(404).json({ error: 'No anchor found', timestamp: new Date().toISOString() });
    }

    res.json({ success: true, anchor, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Public latest anchor observability error:', error);
    res.status(500).json({ error: 'Failed to retrieve latest anchor', timestamp: new Date().toISOString() });
  }
});

// Protected observability routes (admin/founder only)
app.use('/v1/observability', authMiddleware, observabilityRoutes);

// WebSocket for real-time updates
wss.on('connection', (ws) => {
  logger.info('WebSocket client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      // Handle WebSocket messages for real-time updates
      governanceLoggerInstance.log('websocket_message', { type: data.type, client: 'admin-dashboard' });
    } catch (error) {
      logger.error('WebSocket message parse error:', error);
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  governanceLoggerInstance.log('error', { message: err.message, stack: err.stack });

  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  logger.info(`Admin Node server running on port ${PORT}`);
  governanceLoggerInstance.log('server_start', { port: PORT, environment: process.env.NODE_ENV });

  // Start Discord service
  discordService.start().catch(error => {
    logger.error('Failed to start Discord service:', error);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  governanceLoggerInstance.log('server_shutdown', { reason: 'SIGTERM' });

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  governanceLoggerInstance.log('server_shutdown', { reason: 'SIGINT' });

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, server, wss, logger };
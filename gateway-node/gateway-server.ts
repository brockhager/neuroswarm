import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { queueService } from './queue-service';

// Types for the gateway
interface RateLimitEntry {
  windowStart: number;
  count: number;
}

interface JWTPayload {
  userId: string;
  exp: number;
  iat: number;
}

// Configuration
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'mock-jwt-secret-for-development';
const RATE_LIMIT_REQUESTS = Number(process.env.RATE_LIMIT_REQUESTS || 100);
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60000); // 1 minute

// In-memory rate limiting store
const rateLimitStore = new Map<string, RateLimitEntry>();

// Artifact submission schema validation
const artifactSchema = z.object({
  type: z.enum(['ARTIFACT_SUBMIT', 'ARTIFACT_BATCH']),
  payload: z.object({
    content: z.string().min(1).max(10000),
    metadata: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      tags: z.array(z.string()).max(10).optional(),
      contentType: z.enum(['text', 'code', 'data', 'media']).default('text')
    }).optional(),
    sources: z.array(z.object({
      type: z.string(),
      url: z.string().url().optional(),
      content: z.string().optional()
    })).max(5).optional()
  }),
  fee: z.number().min(0).default(0)
});

// JWT Authentication Middleware
function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'authentication_required',
      message: 'JWT token required in Authorization header'
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Mock JWT validation - in production, use proper JWT library
    const payload = mockJWTVerify(token);

    // Check if token is expired
    if (payload.exp * 1000 < Date.now()) {
      res.status(401).json({
        error: 'token_expired',
        message: 'JWT token has expired'
      });
      return;
    }

    // Attach user info to request
    (req as any).user = payload;
    next();
  } catch (error) {
    console.error('JWT validation error:', error);
    res.status(401).json({
      error: 'invalid_token',
      message: 'Invalid JWT token'
    });
  }
}

// Mock JWT verification (replace with proper JWT library in production)
function mockJWTVerify(token: string): JWTPayload {
  // This is a mock implementation - in production use jsonwebtoken library
  // For now, accept any token that looks like a JWT
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  // Mock payload - in production, decode and verify the actual JWT
  return {
    userId: 'mock-user-id',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000)
  };
}

// Rate Limiting Middleware
function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(clientIP);
  if (!entry || (now - entry.windowStart) > RATE_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
  }

  // Check if limit exceeded
  if (entry.count >= RATE_LIMIT_REQUESTS) {
    const resetTime = new Date(entry.windowStart + RATE_WINDOW_MS);
    res.set('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString());
    res.set('X-RateLimit-Remaining', '0');
    res.set('X-RateLimit-Reset', resetTime.toISOString());
    res.set('Retry-After', Math.ceil((resetTime.getTime() - now) / 1000).toString());

    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: `Rate limit exceeded. Try again after ${resetTime.toISOString()}`,
      retryAfter: Math.ceil((resetTime.getTime() - now) / 1000)
    });
    return;
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(clientIP, entry);

  // Set rate limit headers
  const remaining = Math.max(0, RATE_LIMIT_REQUESTS - entry.count);
  const resetTime = new Date(entry.windowStart + RATE_WINDOW_MS);
  res.set('X-RateLimit-Limit', RATE_LIMIT_REQUESTS.toString());
  res.set('X-RateLimit-Remaining', remaining.toString());
  res.set('X-RateLimit-Reset', resetTime.toISOString());

  next();
}

// Request Logging Middleware
function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'unknown';
  const userId = (req as any).user?.userId || 'unauthenticated';

  console.log(`[${timestamp}] ${method} ${url} - User: ${userId} - UA: ${userAgent}`);

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    console.log(`[${new Date().toISOString()}] ${method} ${url} - Status: ${res.statusCode}`);
    return originalSend.call(this, data);
  };

  next();
}

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global middleware
app.use(loggingMiddleware);
app.use(rateLimitMiddleware);

// Health check endpoint (no auth required)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'neuroswarm-gateway'
  });
});

// Metrics endpoint (no auth required)
app.get('/metrics', (req: Request, res: Response) => {
  const metrics = {
    rate_limit_store_size: rateLimitStore.size,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  };
  res.json(metrics);
});

// Protected routes (require JWT authentication)
app.use('/api', jwtAuthMiddleware);

// Artifact submission endpoint
app.post('/api/submit', async (req: Request, res: Response) => {
  try {
    // Validate request schema
    const validatedData = artifactSchema.parse(req.body);

    // Extract user info from JWT
    const userId = (req as any).user.userId;
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    console.log(`Received artifact submission for user ${userId}. Queuing...`);

    // Prepare message for queue
    const queueMessage = {
      id: submissionId,
      type: 'ARTIFACT_SUBMISSION',
      payload: {
        ...validatedData.payload,
        fee: validatedData.fee,
        submissionType: validatedData.type
      },
      timestamp: timestamp,
      metadata: {
        userId: userId,
        source: 'api-gateway',
        clientIp: req.ip
      }
    };

    // Offload to queue
    const queued = await queueService.publish('artifact-submissions', queueMessage);

    if (!queued) {
      throw new Error('Failed to enqueue message');
    }

    // Return 202 Accepted immediately
    res.status(202).json({
      success: true,
      submissionId,
      status: 'queued',
      message: 'Artifact accepted for processing',
      timestamp,
      retryAfter: 0 // Optional, can be used if queue is full
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Schema validation error:', error.errors);
      res.status(400).json({
        error: 'validation_error',
        message: 'Request validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    } else {
      console.error('Submission processing error:', error);
      res.status(500).json({
        error: 'processing_error',
        message: 'Failed to process artifact submission'
      });
    }
  }
});

// Batch submission endpoint
app.post('/api/submit-batch', async (req: Request, res: Response) => {
  try {
    // Validate that body is an array of artifacts
    const batchSchema = z.array(artifactSchema);
    const validatedBatch = batchSchema.parse(req.body);

    if (validatedBatch.length === 0) {
      return res.status(400).json({
        error: 'empty_batch',
        message: 'Batch must contain at least one artifact'
      });
    }

    if (validatedBatch.length > 10) {
      return res.status(400).json({
        error: 'batch_too_large',
        message: 'Batch cannot contain more than 10 artifacts'
      });
    }

    const userId = (req as any).user.userId;
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Processing batch submission for user ${userId}: ${validatedBatch.length} artifacts`);

    // Process each artifact (mock processing)
    const results = validatedBatch.map((artifact, index) => ({
      index,
      submissionId: `sub_${batchId}_${index}`,
      status: 'accepted',
      type: artifact.type
    }));

    res.json({
      success: true,
      batchId,
      totalArtifacts: validatedBatch.length,
      results,
      status: 'batch_accepted',
      message: 'Batch submitted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Batch validation failed',
        details: error.errors
      });
    } else {
      console.error('Batch processing error:', error);
      res.status(500).json({
        error: 'processing_error',
        message: 'Failed to process batch submission'
      });
    }
  }
});

// Status check endpoint
app.get('/api/status/:submissionId', jwtAuthMiddleware, (req: Request, res: Response) => {
  const { submissionId } = req.params;
  const userId = (req as any).user.userId;

  // Mock status response - in production, check actual processing status
  const mockStatuses = ['processing', 'completed', 'failed'];
  const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

  res.json({
    submissionId,
    userId,
    status: randomStatus,
    timestamp: new Date().toISOString(),
    message: `Submission is ${randomStatus}`
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'internal_server_error',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 NeuroSwarm API Gateway started on port ${PORT}`);
  console.log(`📊 Rate limiting: ${RATE_LIMIT_REQUESTS} requests per ${RATE_WINDOW_MS}ms`);
  console.log(`🔐 JWT authentication: ${JWT_SECRET === 'mock-jwt-secret-for-development' ? 'MOCK MODE' : 'PRODUCTION MODE'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
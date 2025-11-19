import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { logger } from '../index';
import { governanceLogger } from '../services/governance-logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

// Load JWT private key for signing/verification
let jwtPrivateKey: string | null = null;
let jwtPublicKey: string | null = null;

function loadJWTKeys() {
  try {
    const privateKeyPath = process.env.SERVICE_JWT_PRIVATE_KEY_PATH;
    if (privateKeyPath) {
      const fullPath = path.resolve(privateKeyPath);
      logger.info(`Loading JWT private key from: ${fullPath}`);
      if (fs.existsSync(fullPath)) {
        jwtPrivateKey = fs.readFileSync(fullPath, 'utf8');
        logger.info('JWT private key loaded successfully');
      } else {
        logger.error(`JWT private key file not found: ${fullPath}`);
      }
    }

    const publicKeyPath = process.env.FOUNDER_PUBLIC_KEY_PATH;
    if (publicKeyPath) {
      const fullPath = path.resolve(publicKeyPath);
      logger.info(`Loading JWT public key from: ${fullPath}`);
      if (fs.existsSync(fullPath)) {
        jwtPublicKey = fs.readFileSync(fullPath, 'utf8');
        logger.info('JWT public key loaded successfully');
      } else {
        logger.error(`JWT public key file not found: ${fullPath}`);
      }
    }
  } catch (error) {
    logger.error('Failed to load JWT keys:', error);
  }
}

// Load keys immediately
loadJWTKeys();

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header', { ip: req.ip, path: req.path });
      governanceLogger.log('auth_failure', {
        reason: 'missing_token',
        ip: req.ip,
        path: req.path
      });

      res.status(401).json({
        error: 'Authorization required',
        message: 'Bearer token required in Authorization header'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    if (!jwtPublicKey) {
      logger.error('JWT public key not configured');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const decoded = jwt.verify(token, jwtPublicKey, { algorithms: ['RS256'] }) as {
      id: string;
      role: string;
      permissions: string[];
      iat: number;
      exp: number;
    };

    // Check if token is expired
    if (decoded.exp < Date.now() / 1000) {
      logger.warn('Expired token used', { userId: decoded.id, ip: req.ip });
      governanceLogger.log('auth_failure', {
        reason: 'expired_token',
        userId: decoded.id,
        ip: req.ip
      });

      res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your token'
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      permissions: decoded.permissions,
    };

    // Log successful authentication
    governanceLogger.log('auth_success', {
      userId: decoded.id,
      role: decoded.role,
      path: req.path,
      ip: req.ip
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    governanceLogger.log('auth_failure', {
      reason: 'invalid_token',
      ip: req.ip,
      path: req.path,
      error: (error as Error).message
    });

    res.status(401).json({
      error: 'Invalid token',
      message: 'Token verification failed'
    });
  }
};

// Middleware to check for admin role
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin' && req.user.role !== 'founder') {
    logger.warn('Insufficient permissions', {
      userId: req.user.id,
      role: req.user.role,
      required: 'admin/founder',
      path: req.path
    });

    governanceLogger.log('permission_denied', {
      userId: req.user.id,
      role: req.user.role,
      required: 'admin/founder',
      path: req.path
    });

    res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Admin or founder role required'
    });
    return;
  }

  next();
};

// Middleware to check for founder role (highest privilege)
export const requireFounder = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'founder') {
    logger.warn('Founder permission required', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path
    });

    governanceLogger.log('permission_denied', {
      userId: req.user.id,
      role: req.user.role,
      required: 'founder',
      path: req.path
    });

    res.status(403).json({
      error: 'Founder access required',
      message: 'This operation requires founder privileges'
    });
    return;
  }

  next();
};

// Middleware to check for contributor role (or higher)
export const requireContributor = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const allowedRoles = ['contributor', 'admin', 'founder'];
  if (!allowedRoles.includes(req.user.role)) {
    logger.warn('Contributor permission required', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path
    });

    governanceLogger.log('permission_denied', {
      userId: req.user.id,
      role: req.user.role,
      required: 'contributor',
      path: req.path
    });

    res.status(403).json({ error: 'Contributor or higher role required' });
    return;
  }

  next();
};
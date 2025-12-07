import { Request, Response, NextFunction } from 'express';

export const authenticate = (requiredRole: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.split(' ')[1]; // Bearer <token>

        // Mock Token Validation: "mock.<role>.token"
        // In real world, verify JWT signature and claims.

        if (token === `mock.${requiredRole}.token`) {
            (req as any).user = { role: requiredRole, id: 'mock-service-id' };
            next();
        } else if (token === 'mock.admin.token') {
            // Admin supersedes all
            (req as any).user = { role: 'admin', id: 'mock-admin-id' };
            next();
        } else {
            return res.status(403).json({ error: 'Invalid or insufficient token permissions' });
        }
    };
};

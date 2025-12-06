const { upsertUser } = require('../db/users');
const { jwtVerify } = require('jose');

// Use the same secret as the prototype (in production this comes from secrets)
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'neuroswarm_jwt_secret_key_hs256');

/**
 * Middleware that verifies JWT and ensures a corresponding User record exists in DB.
 * Attaches req.user = { id, external_auth_id, role, ... }
 */
async function dbAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 1. Verify JWT signature
        const { payload } = await jwtVerify(token, JWT_SECRET);

        // 2. Extract subject (external auth ID)
        const externalAuthId = payload.sub;
        if (!externalAuthId) {
            return res.status(401).json({ error: 'Invalid token: missing subject claim' });
        }

        // 3. Find or Create User in DB
        const user = await upsertUser(externalAuthId);

        // 4. Attach to request
        req.user = user;

        // 5. Basic RBAC check (optional here, or in separate middleware)
        // For now, just ensure they are active
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is inactive' });
        }

        next();
    } catch (err) {
        console.error('Auth failed:', err.message);
        return res.status(401).json({ error: 'Authentication failed', details: err.message });
    }
}

module.exports = {
    dbAuth
};

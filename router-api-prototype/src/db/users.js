const { db } = require('./index');

/**
 * Upserts a user based on their external auth ID (JWT sub).
 * If the user exists, returns the record.
 * If not, creates a new user with default role 'user' and returns it.
 * 
 * @param {string} externalAuthId - The 'sub' claim from the JWT.
 * @returns {Promise<Object>} The user record.
 */
async function upsertUser(externalAuthId) {
    // Try to find existing user
    const existingUser = await db('users')
        .where({ external_auth_id: externalAuthId })
        .first();

    if (existingUser) {
        return existingUser;
    }

    // Create new user if not found
    const [newUser] = await db('users')
        .insert({
            external_auth_id: externalAuthId,
            role: 'user',
            status: 'active'
        })
        .returning('*');

    return newUser;
}

/**
 * Retrieves a user by their internal ID.
 * @param {number} id 
 * @returns {Promise<Object>}
 */
async function getUserById(id) {
    return db('users').where({ id }).first();
}

module.exports = {
    upsertUser,
    getUserById
};

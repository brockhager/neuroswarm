const knex = require('knex');
const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

const db = knex(config);

/**
 * Runs pending migrations on startup.
 * Should be called during server initialization.
 */
async function runMigrations() {
    try {
        console.log(`[DB] Running migrations for environment: ${environment}`);
        await db.migrate.latest();
        console.log('[DB] Migrations completed successfully.');
    } catch (err) {
        console.error('[DB] Migration failed:', err);
        throw err;
    }
}

module.exports = {
    db,
    runMigrations
};

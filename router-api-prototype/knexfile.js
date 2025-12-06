// Knex configuration for managing PostgreSQL migrations and connections.
const path = require('path');

/**
 * @type { Object.<string, import('knex').Knex.Config> }
 */
module.exports = {

    development: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'neuroswarm_dev',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'neuroswarm_router_dev'
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: path.join(__dirname, 'migrations')
        },
        pool: {
            min: 2,
            max: 10
        }
    },

    // Note: For true CI/Test environments, a separate DB instance should be spun up.
    // This uses a test database name for isolation.
    test: {
        client: 'pg',
        connection: {
            host: process.env.TEST_DB_HOST || 'localhost',
            port: process.env.TEST_DB_PORT || 5432,
            user: process.env.TEST_DB_USER || 'neuroswarm_test',
            password: process.env.TEST_DB_PASSWORD || 'password',
            database: process.env.TEST_DB_NAME || 'neuroswarm_router_test'
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: path.join(__dirname, 'migrations')
        },
        pool: {
            min: 1,
            max: 5
        }
    },

    production: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: path.join(__dirname, 'migrations')
        },
        pool: {
            min: 5,
            max: 20
        }
    }
};

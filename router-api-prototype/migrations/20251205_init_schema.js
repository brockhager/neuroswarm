/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // 1. Users Table (for RBAC and linking external JWT IDs)
    await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('external_auth_id', 255).notNullable().unique(); // JWT 'sub' claim
        table.string('role', 50).notNullable().defaultTo('user'); // 'user', 'admin', 'auditor'
        table.string('status', 50).notNullable().defaultTo('active');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        // Index for fast lookup by JWT subject
        table.index(['external_auth_id'], 'idx_users_external_auth_id');
    });

    // 2. Artifacts Table (The Anchoring Ledger)
    await knex.schema.createTable('artifacts', (table) => {
        table.bigIncrements('id').primary();
        table.integer('user_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('RESTRICT');

        // IPFS Content ID (CID) is the primary content identifier
        table.string('artifact_cid', 255).notNullable().unique();

        // Content integrity check: SHA256 of the raw payload
        table.specificType('checksum_sha256', 'CHAR(64)').notNullable().unique();

        // Status in the anchoring pipeline: PENDING_PIN, PINNED, ANCHORED, ERROR
        table.string('state', 50).notNullable().defaultTo('PENDING_PIN');

        // Metadata from the original submission payload
        table.jsonb('metadata');

        // Anchoring details
        table.timestamp('ipfs_pin_timestamp');
        table.string('on_chain_tx_id', 255); // ID of the REQUEST_REVIEW transaction

        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        // Index for fast lookup by CID
        table.index(['artifact_cid'], 'idx_artifacts_cid');
    });

    // 3. Audit Logs Table (for compliance and security events)
    await knex.schema.createTable('audit_logs', (table) => {
        table.bigIncrements('id').primary();
        table.integer('user_id').unsigned().nullable()
            .references('id').inTable('users').onDelete('SET NULL'); // Null if system event

        table.string('action', 100).notNullable(); // e.g., 'ARTIFACT_SUBMIT', 'AUTH_FAIL', 'PIN_SUCCESS'
        table.jsonb('metadata');
        table.timestamp('timestamp').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('audit_logs');
    await knex.schema.dropTableIfExists('artifacts');
    await knex.schema.dropTableIfExists('users');
};

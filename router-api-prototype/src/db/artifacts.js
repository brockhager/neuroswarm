const { db } = require('./index');

/**
 * Creates a new artifact record in PENDING_PIN state.
 * Throws error if CID or checksum already exists (unique constraint).
 * 
 * @param {Object} params
 * @param {number} params.userId - Owner ID
 * @param {string} params.artifactCid - IPFS Content ID
 * @param {string} params.checksum - SHA256 checksum
 * @param {Object} params.metadata - Submission metadata
 * @returns {Promise<Object>} The created artifact record
 */
async function createArtifact({ userId, artifactCid, checksum, metadata }) {
    const [artifact] = await db('artifacts')
        .insert({
            user_id: userId,
            artifact_cid: artifactCid,
            checksum_sha256: checksum,
            state: 'PENDING_PIN',
            metadata: metadata
        })
        .returning('*');

    return artifact;
}

/**
 * Updates the artifact state to PINNED and records the pin timestamp.
 * @param {number} id - Artifact ID
 */
async function markArtifactPinned(id) {
    return db('artifacts')
        .where({ id })
        .update({
            state: 'PINNED',
            ipfs_pin_timestamp: db.fn.now(),
            updated_at: db.fn.now()
        });
}

/**
 * Updates the artifact state to ANCHORED and records the transaction ID.
 * @param {number} id - Artifact ID
 * @param {string} txId - On-chain transaction ID
 */
async function markArtifactAnchored(id, txId) {
    return db('artifacts')
        .where({ id })
        .update({
            state: 'ANCHORED',
            on_chain_tx_id: txId,
            updated_at: db.fn.now()
        });
}

/**
 * Retrieves an artifact by its CID.
 * @param {string} cid 
 * @returns {Promise<Object>}
 */
async function getArtifactByCid(cid) {
    return db('artifacts').where({ artifact_cid: cid }).first();
}

module.exports = {
    createArtifact,
    markArtifactPinned,
    markArtifactAnchored,
    getArtifactByCid
};

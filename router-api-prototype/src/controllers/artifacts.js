const crypto = require('crypto');
const { createArtifact, getArtifactByCid, markArtifactPinned, markArtifactAnchored } = require('../db/artifacts');
const { logAction } = require('../db/audit');

/**
 * Handles artifact review submission (Anchoring Pipeline).
 * POST /api/artifact/review
 */
async function submitReview(req, res) {
    try {
        const { artifact_id, metadata } = req.body;
        const userId = req.user.id;

        if (!artifact_id) {
            return res.status(400).json({ error: 'Missing artifact_id (CID)' });
        }

        // 1. Calculate Checksum (Deterministic SHA256 of the CID itself for now, 
        //    in a real scenario this would be the hash of the payload content)
        //    For this prototype, we assume artifact_id IS the content identifier.
        const checksum = crypto.createHash('sha256').update(artifact_id).digest('hex');

        // 2. Check for duplicates / Create Record
        let artifact;
        try {
            artifact = await createArtifact({
                userId,
                artifactCid: artifact_id,
                checksum,
                metadata
            });

            await logAction({
                userId,
                action: 'ARTIFACT_SUBMIT',
                metadata: { artifactId: artifact.id, cid: artifact_id }
            });

        } catch (err) {
            // Handle unique constraint violation (duplicate submission)
            if (err.code === '23505') { // Postgres unique violation
                const existing = await getArtifactByCid(artifact_id);
                return res.status(200).json({
                    message: 'Artifact already exists',
                    status: existing.state,
                    tracking_id: existing.id
                });
            }
            throw err;
        }

        // 3. (Mock) IPFS Pinning
        // In production, this calls the IPFS Cluster API.
        // Here we simulate success.
        await markArtifactPinned(artifact.id);
        await logAction({ userId, action: 'PIN_SUCCESS', metadata: { artifactId: artifact.id } });

        // 4. (Mock) On-Chain Submission
        // In production, this submits a transaction to the Gateway.
        // Here we simulate a TX ID.
        const mockTxId = '0x' + crypto.randomBytes(32).toString('hex');
        await markArtifactAnchored(artifact.id, mockTxId);
        await logAction({ userId, action: 'ANCHOR_SUCCESS', metadata: { artifactId: artifact.id, txId: mockTxId } });

        // 5. Return Success
        res.status(201).json({
            message: 'Artifact submitted, pinned, and anchored successfully.',
            tracking_id: artifact.id,
            cid: artifact_id,
            state: 'ANCHORED',
            tx_id: mockTxId
        });

    } catch (err) {
        console.error('Submit Review Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * Retrieves critique history for an artifact.
 * GET /api/artifact/critique/:cid
 */
async function getCritique(req, res) {
    try {
        const { cid } = req.params;

        // 1. Check if artifact exists in our ledger
        const artifact = await getArtifactByCid(cid);
        if (!artifact) {
            return res.status(404).json({ error: 'Artifact not found in ledger' });
        }

        // 2. (Mock) Retrieve Critique from NS-Node
        // In production, this would query the NS-Node API or local cache.
        // For now, return a mock response or proxy if configured.

        // Mock response for prototype
        res.json({
            artifact_id: cid,
            status: 'CRITIQUED',
            critique: [
                { severity: 'INFO', file: 'metadata.json', line: 1, comment: 'Verified by Neuroswarm Consensus' }
            ],
            ledger_record: {
                id: artifact.id,
                state: artifact.state,
                pinned_at: artifact.ipfs_pin_timestamp,
                tx_id: artifact.on_chain_tx_id
            }
        });

    } catch (err) {
        console.error('Get Critique Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    submitReview,
    getCritique
};

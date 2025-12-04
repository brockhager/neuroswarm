import express from 'express';
import fetch from 'node-fetch';
import {
    validators, blockMap, txIndex, proposals, state, accounts,
    getCanonicalHeight, persistAccount
} from '../services/state.js';
import {
    applyBlock, chooseCanonicalTipAndReorg
} from '../services/chain.js';
import { getGatewayConfig } from '../services/gateway.js';
import {
    canonicalize, verifyEd25519, txIdFor, computeMerkleRoot, sha256Hex
} from '../utils/crypto.js';
import { verifyBlockSubmission } from '../block-verifier.mjs';
import { logNs } from '../utils/logger.js';
import { MessageType } from '../../../shared/peer-discovery/index.js';
import { computeSourcesRoot } from '../../../sources/index.js';

export default function createValidatorsRouter(p2pProtocol, peerManager) {
    const router = express.Router();

    // Endpoints for validators & PoS
    router.post('/register', (req, res) => {
        const { validatorId, stake = 0, publicKey } = req.body || {};
        if (!validatorId || !publicKey) return res.status(400).json({ error: 'validatorId/publicKey required' });
        if (validators.has(validatorId)) return res.status(400).json({ error: 'already registered' });

        // Register validator
        validators.set(validatorId, { stake: Number(stake || 0), publicKey, slashed: false });
        state.totalStake += Number(stake || 0);

        // Create account if not exists
        if (!accounts.has(validatorId)) {
            const newAccount = {
                address: validatorId,
                nst_balance: '0',
                nsd_balance: '0',
                staked_nst: '0',
                updatedAt: Date.now()
            };
            accounts.set(validatorId, newAccount);
            persistAccount(validatorId, newAccount);
            logNs(`[Validator] Created account for new validator ${validatorId}`);
        }

        res.json({ ok: true });
    });

    router.get('/', (req, res) => {
        const arr = [];
        for (const [id, v] of validators.entries()) arr.push({ validatorId: id, stake: v.stake, publicKey: v.publicKey, slashed: !!v.slashed, slashedAt: v.slashedAt || null });
        res.json({ validators: arr, totalStake: state.totalStake });
    });

    router.post('/slash', (req, res) => {
        const { validatorId, amount } = req.body || {};
        if (!validatorId || !amount) return res.status(400).json({ error: 'validatorId/amount required' });
        if (!validators.has(validatorId)) return res.status(400).json({ error: 'not found' });
        const v = validators.get(validatorId);
        const slash = Math.min(Number(amount), v.stake);
        v.stake -= slash;
        state.totalStake -= slash;
        res.json({ ok: true, slashed: slash, newStake: v.stake });
    });

    return router;
}

export function createTxRouter(p2pProtocol, peerManager) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        const tx = req.body || {};
        // Basic validation: require type and fee
        if (!tx.type || typeof tx.fee !== 'number') return res.status(400).json({ error: 'type and fee required' });
        // verify signature if tx.signedBy is validator
        if (tx.signedBy && validators.has(tx.signedBy)) {
            const v = validators.get(tx.signedBy);
            const data = canonicalize({ ...tx, signature: undefined });
            if (!verifyEd25519(v.publicKey, data, tx.signature)) return res.status(400).json({ error: 'invalid signature' });
        }
        // Forward transaction to configured gateway(s) and do not persist in NS mempool
        try {
            let forwarded = [];
            const GATEWAY_CONFIG = getGatewayConfig();
            for (const gw of GATEWAY_CONFIG) {
                const url = gw.url.replace(/\/$/, '') + '/v1/tx';
                try {
                    const fwd = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': req.header('x-forwarded-for') || req.socket.remoteAddress || '', 'X-Source': 'ns' }, body: JSON.stringify(tx) });
                    if (fwd.ok) {
                        const j = await fwd.json().catch(() => null);
                        forwarded.push({ url: gw.url, resp: j || true });
                        logNs(`Forwarded tx to gateway ${gw.url}`);
                        // stop on first successful forward
                        break;
                    } else {
                        forwarded.push({ url: gw.url, error: `HTTP ${fwd.status}` });
                    }
                } catch (e) {
                    forwarded.push({ url: gw.url, error: e.message });
                }
            }
            if (forwarded.length === 0) return res.status(500).json({ error: 'no_gateways_configured' });
            const ok = forwarded.some(f => f.resp);
            if (!ok) return res.status(502).json({ error: 'forward_failed', forwarded });

            // Broadcast transaction to peers
            const txMessage = p2pProtocol.createMessage(
                MessageType.NEW_TX,
                tx,
                peerManager.nodeId
            );
            p2pProtocol.broadcastMessage(txMessage).catch(err => {
                logNs('Failed to broadcast transaction to peers:', err.message);
            });

            return res.json({ ok: true, forwarded });
        } catch (e) {
            return res.status(500).json({ error: 'forward_exception', message: e.message });
        }
    });

    return router;
}

export function createBlocksRouter(p2pProtocol, peerManager, blockPropagation = null) {
    const router = express.Router();

    // Endpoint to produce block proposals from validators (vp-node posts here)
    router.post('/produce', (req, res) => {
        const { header, txs, signature, publicKey } = req.body || {};
        if (!header || !header.validatorId) return res.status(400).json({ error: 'invalid header' });
        if (!validators.has(header.validatorId)) return res.status(400).json({ error: 'unknown validator' });
        const maybeSlashed = validators.get(header.validatorId) && validators.get(header.validatorId).slashed;
        if (maybeSlashed) return res.status(400).json({ error: 'validator_slashed' });
        const v = validators.get(header.validatorId);

        // CRYPTOGRAPHIC VERIFICATION GATE: Verify signature and merkle root using block-verifier
        // This is the first line of defense - reject tampered blocks before any consensus checks
        const publicKeyPem = publicKey || v.publicKey;
        const verifyResult = verifyBlockSubmission({ header, txs, signature, publicKeyPem });
        if (!verifyResult.ok) {
            logNs('Block verification failed:', verifyResult.reason, verifyResult);
            return res.status(401).json({ error: 'AUTH_FAILED', reason: verifyResult.reason, details: verifyResult });
        }

        // Legacy verification logic (kept for backwards compatibility and additional validation)
        // canonical data excludes signature key entirely
        const { signature: _sigDrop, ...headerNoSig } = header;
        const data = canonicalize(headerNoSig);
        const verified = verifyEd25519(v.publicKey, data, signature);
        if (!verified) {
            return res.status(401).json({ error: 'AUTH_FAILED', reason: 'invalid header signature (legacy check)' });
        }
        // verify merkle root
        const txIds = (txs || []).map(tx => txIdFor(tx));
        const calcRoot = computeMerkleRoot(txIds);
        if (calcRoot !== header.merkleRoot) return res.status(400).json({ error: 'bad merkle root' });
        // verify sourcesRoot if present
        if (header.sourcesRoot) {
            const srcRoot = computeSourcesRoot(txs);
            if (srcRoot !== header.sourcesRoot) {
                logNs('ERROR', 'Bad sources root computed', srcRoot, 'expected', header.sourcesRoot);
                return res.status(400).json({ error: 'bad_sources_root' });
            }
        }
        // verify prevHash references any known block (or genesis)
        const parentHash = header.prevHash;
        const genesisPrev = '0'.repeat(64);
        if (parentHash !== genesisPrev && !blockMap.has(parentHash)) return res.status(400).json({ error: 'unknown prevHash' });
        // apply block
        // If a payloadCid is provided in the header, attempt to fetch it from the producer
        // for integrity verification before accepting the block.
        const payloadCid = header.payloadCid || header.cid || null;
        if (payloadCid) {
            const producerUrl = req.header('x-producer-url') || null;
            if (!producerUrl) return res.status(400).json({ error: 'producer_url_required_for_payload_cid' });
            (async () => {
                try {
                    const fetchUrl = `${producerUrl.replace(/\/$/, '')}/ipfs/${payloadCid}`;
                    const fetched = await fetch(fetchUrl, { method: 'GET' });
                    if (!fetched.ok) {
                        logNs('ERROR', 'Failed to fetch payloadCid from producer', fetchUrl, fetched.status);
                        return res.status(400).json({ error: 'payload_cid_fetch_failed', status: fetched.status });
                    }
                    const body = await fetched.json();
                    const payloadContent = body && body.content ? body.content : null;
                    if (!payloadContent) return res.status(400).json({ error: 'invalid_payload_content' });
                    // Validate the merkleRoot & txs equality
                    const fetchedHeader = payloadContent.header || {};
                    const fetchedTxs = payloadContent.txs || [];
                    const fetchedSigner = payloadContent && payloadContent.signer ? payloadContent.signer : (fetchedHeader && fetchedHeader.validatorId);
                    const fetchedPayloadSig = payloadContent && payloadContent.payloadSignature ? payloadContent.payloadSignature : (payloadContent && payloadContent.payload && payloadContent.payload.payloadSignature ? payloadContent.payload.payloadSignature : null);
                    const fetchedSourcesRoot = computeSourcesRoot(fetchedTxs);
                    if (header.sourcesRoot && fetchedSourcesRoot !== header.sourcesRoot) {
                        logNs('ERROR', 'Payload CID sources root mismatch', fetchedSourcesRoot, header.sourcesRoot);
                        return res.status(400).json({ error: 'payload_sources_root_mismatch', fetchedSourcesRoot, expected: header.sourcesRoot });
                    }
                    const fetchedIds = (fetchedTxs || []).map(tx => txIdFor(tx));
                    const fetchedRoot = computeMerkleRoot(fetchedIds);
                    if (fetchedRoot !== header.merkleRoot) {
                        logNs('ERROR', 'Payload CID merkle root mismatch', fetchedRoot, header.merkleRoot);
                        return res.status(400).json({ error: 'payload_cid_merkle_mismatch' });
                    }
                    // verify signature if present
                    if (fetchedPayloadSig) {
                        try {
                            const signerId = fetchedSigner || header.validatorId;
                            if (fetchedSigner && header.validatorId && fetchedSigner !== header.validatorId) {
                                logNs('ERROR', 'Payload signer mismatch', fetchedSigner, header.validatorId);
                                return res.status(400).json({ error: 'payload_signer_mismatch' });
                            }
                            if (!signerId || !validators.has(signerId)) return res.status(400).json({ error: 'signer_not_registered' });
                            const pv = validators.get(signerId);
                            const pubKey = pv.publicKey;
                            const payloadObj = payloadContent && payloadContent.payload ? payloadContent.payload : { header: fetchedHeader, txs: fetchedTxs };
                            const payloadData = canonicalize(payloadObj);
                            const sigValid = verifyEd25519(pubKey, payloadData, fetchedPayloadSig);
                            if (!sigValid) return res.status(400).json({ error: 'payload_signature_invalid' });
                        } catch (e) {
                            logNs('ERROR', 'Error verifying payload signature', e.message);
                            return res.status(500).json({ error: 'payload_signature_verify_exception', message: e.message });
                        }
                    }
                    // Fetched content matches - proceed to apply block
                    header.signature = signature;
                    const block = { header, txs };
                    const result = applyBlock(block);
                    if (!result.ok) return res.status(400).json({ error: result.reason });

                    // Trigger reorg check
                    await chooseCanonicalTipAndReorg();

                    // Broadcast block to peers
                    // Broadcast block to network via Block Propagation Service
                    if (blockPropagation) {
                        const height = header.height || 0;
                        await blockPropagation.announceBlock(result.blockHash, header, height);
                    } else {
                        // Legacy P2P broadcast (fallback)
                        const blockMessage = p2pProtocol.createMessage(
                            MessageType.NEW_BLOCK,
                            { header, txs },
                            peerManager.nodeId
                        );
                        p2pProtocol.broadcastMessage(blockMessage).catch(err => {
                            logNs('Failed to broadcast block to peers:', err.message);
                        });
                    }

                    res.json({ ok: true, blockHash: result.blockHash });
                } catch (e) {
                    logNs('ERROR', 'Error fetching payloadCid', e.message);
                    return res.status(400).json({ error: 'payload_cid_fetch_exception', message: e.message });
                }
            })();
            return; // early return while we async-verified
        }
        header.signature = signature;
        const block = { header, txs };
        const result = applyBlock(block);
        if (!result.ok) return res.status(400).json({ error: result.reason });

        // Trigger reorg check
        chooseCanonicalTipAndReorg().catch(e => logNs('Reorg check failed:', e));

        // Broadcast block to peers
        const blockMessage = p2pProtocol.createMessage(
            MessageType.NEW_BLOCK,
            { header, txs },
            peerManager.nodeId
        );
        p2pProtocol.broadcastMessage(blockMessage).catch(err => {
            logNs('Failed to broadcast block to peers:', err.message);
        });

        res.json({ ok: true, blockHash: result.blockHash });
    });

    router.get('/latest', (req, res) => {
        const b = state.canonicalTipHash ? blockMap.get(state.canonicalTipHash) : null;
        res.json({ block: b });
    });

    return router;
}

export function createChainRouter(p2pProtocol, peerManager) {
    const router = express.Router();

    router.get('/mempool', async (req, res) => {
        // NS does not keep a mempool; proxy to gateway's mempool for compatibility
        try {
            const GATEWAY_CONFIG = getGatewayConfig();
            const gw = GATEWAY_CONFIG && GATEWAY_CONFIG.length ? GATEWAY_CONFIG[0] : null;
            if (!gw || !gw.url) return res.json({ mempool: [] });
            const url = gw.url.replace(/\/$/, '') + '/v1/mempool';
            const r = await fetch(url);
            if (!r.ok) return res.status(500).json({ error: 'gateway_mempool_unavailable', status: r.status });
            const j = await r.json();
            return res.json(j);
        } catch (e) {
            return res.status(500).json({ error: 'proxy_failed', message: e.message });
        }
    });

    router.get('/chain/height', (req, res) => {
        res.json({ height: getCanonicalHeight() });
    });

    router.get('/headers/tip', (req, res) => {
        const h = state.canonicalTipHash ? blockMap.get(state.canonicalTipHash).header : null;
        res.json({ header: h });
    });

    router.post('/debug/verifyHeader', (req, res) => {
        const { header, signature, publicKey } = req.body || {};
        if (!header || !signature || !publicKey) return res.status(400).json({ error: 'header/signature/publicKey required' });
        try {
            const data = canonicalize({ ...header, signature: undefined });
            const ok = verifyEd25519(publicKey, data, signature);
            return res.json({ ok, data });
        } catch (e) {
            return res.status(400).json({ ok: false, error: e.message });
        }
    });

    // SPV proof endpoint
    router.get('/proof/:txId', (req, res) => {
        const { txId } = req.params;
        if (!txIndex.has(txId)) return res.status(404).json({ error: 'not found' });
        const { blockHash, txIndex: idx } = txIndex.get(txId);
        const block = blockMap.get(blockHash);

        const txIds = block.txs.map(tx => txIdFor(tx));

        function buildMerkleProofLocal(txIds, targetIdHex) {
            const idx = txIds.indexOf(targetIdHex);
            if (idx === -1) return null;
            let layer = txIds.map(id => Buffer.from(id, 'hex'));
            let index = idx;
            const proof = [];
            while (layer.length > 1) {
                if (layer.length % 2 === 1) layer.push(layer[layer.length - 1]);
                const pairIndex = index ^ 1;
                const sibling = layer[pairIndex];
                proof.push({ sibling: sibling.toString('hex'), position: pairIndex % 2 === 0 ? 'left' : 'right' });
                // compute next layer
                const next = [];
                for (let i = 0; i < layer.length; i += 2) {
                    const a = layer[i];
                    const b = layer[i + 1];
                    const hash = sha256Hex(Buffer.concat([a, b]));
                    next.push(Buffer.from(hash, 'hex'));
                }
                index = Math.floor(index / 2);
                layer = next;
            }
            return proof;
        }

        const proof = buildMerkleProofLocal(txIds, txId);
        res.json({ proof, blockHeader: block.header, txIndex: idx });
    });

    router.post('/verify/proof', (req, res) => {
        const { txId, proof, blockHeader } = req.body || {};
        if (!txId || !proof || !blockHeader) return res.status(400).json({ error: 'txId, proof, blockHeader required' });
        // recompute merkle root
        try {
            let hBuf = Buffer.from(txId, 'hex');
            for (const p of proof) {
                const siblingBuf = Buffer.from(p.sibling, 'hex');
                const combined = p.position === 'left' ? Buffer.concat([siblingBuf, hBuf]) : Buffer.concat([hBuf, siblingBuf]);
                const hh = sha256Hex(combined);
                hBuf = Buffer.from(hh, 'hex');
            }
            if (hBuf.toString('hex') === blockHeader.merkleRoot) return res.json({ ok: true });
            return res.status(400).json({ ok: false, reason: 'merkle_mismatch' });
        } catch (e) {
            return res.status(400).json({ ok: false, reason: 'invalid_proof', message: e.message });
        }
    });

    router.post('/ipfs/verify', async (req, res) => {
        const { cid, producerUrl } = req.body || {};
        if (!cid || !producerUrl) return res.status(400).json({ error: 'cid and producerUrl required' });
        try {
            const fetchUrl = `${producerUrl.replace(/\/$/, '')}/ipfs/${cid}`;
            const fetched = await fetch(fetchUrl);
            if (!fetched.ok) return res.status(400).json({ error: 'fetch_failed', status: fetched.status });
            const body = await fetched.json();
            const payloadContent = body && body.content ? body.content : null;
            if (!payloadContent) return res.status(400).json({ error: 'invalid_payload' });
            // validate merkle root and txs if possible
            const fetchedHeader = (payloadContent && payloadContent.payload && payloadContent.payload.header) ? payloadContent.payload.header : (payloadContent && payloadContent.header) || {};
            const fetchedTxs = (payloadContent && payloadContent.payload && payloadContent.payload.txs) ? payloadContent.payload.txs : (payloadContent && payloadContent.txs) || [];
            // verify payload signature if present
            const fetchedSigner = payloadContent && payloadContent.signer ? payloadContent.signer : (fetchedHeader && fetchedHeader.validatorId);
            const fetchedPayloadSig = payloadContent && payloadContent.payloadSignature ? payloadContent.payloadSignature : (payloadContent && payloadContent.payload && payloadContent.payload.payloadSignature ? payloadContent.payload.payloadSignature : null);
            const fetchedIds = (fetchedTxs || []).map(tx => txIdFor(tx));
            const fetchedRoot = computeMerkleRoot(fetchedIds);
            const matches = (fetchedRoot === fetchedHeader.merkleRoot);
            // verify signature if present
            let signatureValid = null;
            try {
                if (fetchedPayloadSig) {
                    if (!fetchedSigner || !validators.has(fetchedSigner)) return res.status(400).json({ error: 'signer_not_registered' });
                    const pub = validators.get(fetchedSigner).publicKey;
                    const payloadObj = payloadContent && payloadContent.payload ? payloadContent.payload : { header: fetchedHeader, txs: fetchedTxs };
                    const payloadData = canonicalize(payloadObj);
                    signatureValid = verifyEd25519(pub, payloadData, fetchedPayloadSig);
                }
            } catch (e) {
                return res.status(500).json({ error: 'signature_verify_exception', message: e.message });
            }
            const sourcesValid = (fetchedHeader && fetchedHeader.sourcesRoot) ? (computeSourcesRoot(fetchedTxs) === fetchedHeader.sourcesRoot) : null;
            const fetchedOrigins = Array.from(new Set((fetchedTxs || []).flatMap(tx => (tx.sources || []).map(s => s.origin || s.adapter || 'unknown'))));
            res.json({ ok: true, matches, signatureValid, sourcesValid, fetchedHeader, fetchedTxs, fetchedOrigins });
        } catch (e) {
            res.status(500).json({ error: 'verify_exception', message: e.message });
        }
    });

    // Governance endpoints
    router.post('/governance/proposals', (req, res) => {
        const { id, title } = req.body || {};
        if (!id || !title) return res.status(400).json({ error: 'id and title required' });
        if (proposals.has(id)) return res.status(400).json({ error: 'proposal exists' });
        proposals.set(id, { title, yes: 0, no: 0 });
        res.json({ ok: true });
    });

    router.post('/governance/vote', (req, res) => {
        const { id, validatorId, yes } = req.body || {};
        if (!id || !validatorId) return res.status(400).json({ error: 'id and validatorId required' });
        if (!proposals.has(id)) return res.status(400).json({ error: 'proposal not found' });
        if (!validators.has(validatorId)) return res.status(400).json({ error: 'validator not found' });
        const v = validators.get(validatorId);
        const weight = Number(v.stake || 0);
        const p = proposals.get(id);
        if (yes) p.yes += weight; else p.no += weight;
        proposals.set(id, p);
        res.json({ ok: true, tally: p });
    });

    router.get('/governance/proposals/:id', (req, res) => {
        const { id } = req.params;
        if (!proposals.has(id)) return res.status(404).json({ error: 'proposal not found' });
        res.json({ proposal: proposals.get(id) });
    });

    return router;
}

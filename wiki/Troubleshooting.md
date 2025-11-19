# Troubleshooting
[← Home](Home.md)

Common problems & solutions for running NeuroSwarm locally and in CI.

## Gateway unreachable (DNS/port)
- Symptoms: `gateway-node` can't reach `ns-node` or `ns-node` complains about missing `gateway`.
- Quick checks:
  - `curl http://localhost:3000/health` and `http://localhost:8080/health`
  - Ensure `NS_NODE_URL` is set correctly when starting gateway: `NS_NODE_URL=http://localhost:3000 node gateway-node/server.js`.

## IPFS add or read errors
- Symptoms: VP logs `IPFS not available` or `ipfs_add_failed` or `ipfs_read_failed`.
- Quick fixes:
  - Start an IPFS daemon: `docker run -d --name ipfs -p 5001:5001 ipfs/go-ipfs:latest` or install and run `ipfs daemon`.
  - Ensure `IPFS_API` env var is set to IPFS API endpoint e.g., `IPFS_API=http://localhost:5001`.

## Signature mismatch / payload signature invalid
- Symptoms: NS rejects a block with `payload_signature_invalid` or `/ipfs/verify` responds `signatureValid:false`.
- Quick checks:
  - Confirm the validator registered its public key at `POST /validators/register` on NS before VP posts blocks.
  - Confirm VP uses the private key associated with the registered public key; check logs for `register` and `register ok` messages.
  - Verify that canonicalize is applied the same way in VP signing and NS verification (the code uses a canonicalize function in both components).

## Sources mismatches / `sourcesRoot` mismatch
- Symptoms: NS rejects a block with `payload_sources_root_mismatch` or `/ipfs/verify` returns `sourcesValid:false`.
- Quick checks:
  - The gateway attaches `tx.sources` to tx payloads. VP must include them in the IPFS payload used to compute `sourcesRoot`.
  - Confirm that `computeSourcesRoot()` function is consistent between VP & NS (both import the same implementation from `sources/index.js`).
  - If you tamper with IPFS payload or alter the `sources` fields between VP and NS, NS should reject the block.

## Requeue & reorg behavior
- Symptom: Transactions lost after a reorg.
- Quick checks:
  - NS uses `POST /v1/mempool/requeue` on gateway to re-add removed txs. Ensure the gateway is reachable and that `NS_ALLOW_REQUEUE_SIM=true` (for debug) is set.
  - Confirm the gateway logs show `Requeued tx` entries if NS attempts to re-add txs.

## Rate limiting or adapter query timeouts
- Symptoms: `POST /v1/tx` returns `rate_limited` or `adapter_query_timeout` errors for sources queries.
- Quick fixes:
  - Tune `GATEWAY_RATE_LIMIT` and `GATEWAY_RATE_WINDOW_MS` for gateway-side rate-limiting control.
  - Tune `GATEWAY_SOURCES_QUERY_TIMEOUT_MS` and `GATEWAY_SOURCES_MAX_PER_TX` to match expected workloads.

## CI failures
- Symptoms: Integration tests fail or IPFS not reachable in CI.
- Quick checks:
  - Check that CI uses Docker to start `ipfs` and sets `IPFS_API=http://localhost:5001` for VP in the job.
  - Ensure `pnpm install -w` and `pnpm -w build` were run in the CI step.
  - Capture logs from `ns`, `gateway`, and `vp` for timestamps & error messages — CI workflows upload logs for debugging.

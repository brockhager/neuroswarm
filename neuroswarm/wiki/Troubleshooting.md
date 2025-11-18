# Troubleshooting
[← Home](Home.md)

Common problems & solutions for running NeuroSwarm locally and in CI.

## Gateway unreachable (DNS/port)
- Symptoms: `gateway-node` can't reach `ns-node` or `ns-node` complains about missing `gateway`.
- Quick checks:
  - `curl http://localhost:3000/health` and `http://localhost:8080/health`
  - Ensure `NS_NODE_URL` is set correctly when starting gateway.

## IPFS add or read errors
- Symptoms: VP logs `IPFS not available` or `ipfs_add_failed` or `ipfs_read_failed`.
- Quick fixes:
  - Start an IPFS daemon: `docker run -d --name ipfs -p 5001:5001 ipfs/go-ipfs:latest`.
  - Ensure `IPFS_API` is set to `http://localhost:5001`.

## Signature mismatch / payload signature invalid
- Symptoms: NS rejects a block with `payload_signature_invalid`.
- Quick checks:
  - Verify validator registered at `POST /validators/register`.
  - Confirm canonicalization is consistent between VP and NS.

## Sources mismatches / `sourcesRoot` mismatch
- Symptoms: NS rejects a block with `payload_sources_root_mismatch`.
- Quick checks:
  - Confirm the gateway attached `tx.sources` and `tx.sourcesVerified`.
  - Confirm `computeSourcesRoot()` function is consistent between VP & NS.

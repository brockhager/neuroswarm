# Solana Testnet Guide

This guide explains how to use the Solana testnet for NeuroSwarm anchoring and verification. Testnet is a safe rehearsal for mainnet, using faucet SOL and testnet RPC endpoints.

Setup:
- Install Solana CLI: sh -c "$(curl -sSfL https://release.solana.com/stable/install)" and check with solana --version
- Point CLI to testnet: solana config set --url https://api.testnet.solana.com
- Generate a keypair: solana-keygen new --outfile ~/.config/solana/id.json

Funding:
- Request testnet SOL: solana airdrop 2
- Check balance: solana balance

Deploy Anchor Program:
- Build and deploy: anchor build && anchor deploy --provider.cluster testnet
- Save the program ID and update configs (Anchor.toml, client code)

Verify Manifests:
- Run end-to-end test: create manifest → attest → finalize → query provenance
- Confirm local cache matches chain state

Troubleshooting:
- Airdrop may fail if faucet is rate-limited, retry later
- Deployment errors often mean Solana or Anchor versions mismatch
- RPC timeouts can be solved by using alternative testnet endpoints or adding retries

Principle:
Testnet should mirror mainnet practices. Follow the same steps here so production deployment is smooth.

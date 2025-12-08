# Vault / Transit Connector — Production Integration Guide

This document outlines how to implement a production-grade transit connector (HashiCorp Vault Transit or similar) for the KMS sign-only path.

💡 Purpose: The project currently supports a `SecureTransitConnector` interface and a mock implementation used in tests and CI. This guide helps implement a vendor-specific connector (Vault or AWS KMS) that adheres to the interface and can be used by `KmsVaultClient`.

## Design goals
- Sign-only: private key material must never be exposed outside the KMS/HSM. The connector must only use service-level calls to sign digests.
- Rotation-friendly: support signing with multiple key versions and verifying signatures against known public keys or registry.
- Auditability: log signing requests, rotation events, and ensure idempotency keys are stored and inspected.
- Testability: provide a mock or emulated connector for CI when the vendor service isn't available.

## Responsibilities
- authenticate(): establish and renew credentials (AppRole, token) securely.
- signHash(keyId, hashBuffer): call the vendor's sign-only API for the specific key and return a raw signature Buffer.

## Example flow (HashiCorp Vault Transit)
1. Initialize node-vault client with proper endpoint and authentication (AppRole or token).
2. authenticate(): perform a token lookup/renew or AppRole login if necessary.
3. signHash(keyId, buffer): call `client.write('transit/sign/<keyId>', {input: buffer.toString('base64')})` and return the base64 decoded signature.

## Environment and configuration
- VAULT_ADDR — Vault endpoint
- VAULT_ROLE_ID — AppRole role_id (if using AppRole auth)
- VAULT_SECRET_ID — AppRole secret_id
- VAULT_TOKEN — Token (if using token auth)
- VAULT_TRANSIT_IMPL_MODULE — Optional: path or module string used by `KmsVaultClient` to import a custom connector at runtime.

## Implementation Template
A template file exists at `shared/vault-transit-impl.example.ts`. Copy and adapt to `shared/vault-transit-impl.vault.ts` and add the vendor SDK dependency.

## Testing / CI
- Use a local Vault dev server or a mock transit service for CI.
- Add a CI job that sets up Vault (or uses a mock) then runs the integration tests with `VAULT_TRANSIT_IMPL_MODULE` pointing to your connector.

## Security Notes
- Never commit real credentials to the repository.
- Use secret management in CI (GitHub Secrets) and host-level secrets for deployment.

## Next steps
- Implement `VaultTransitConnector` using `node-vault` or the HashiCorp official SDK and wire it into configuration via `VAULT_TRANSIT_IMPL_MODULE`.
- Add a CI job that spins up Vault dev server and runs the integration tests.

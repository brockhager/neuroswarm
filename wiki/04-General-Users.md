# NeuroSwarm — General Users (Chatbot / API Consumer)

This landing page is for end users and client developers who interact with the deployed NeuroSwarm services (chatbot, SDKs, and API consumers).

This is intentionally high-level — if you are an engineer working on client SDKs or the API spec, please use the *Consumer / API Guide* (Developer-focused) linked from this page.

## Quick start — interact with the running chatbot

- Web UI demo (example): `neuro-web/pages/sdk-demo.tsx` — this is the client demo that shows common flows.
- Try the demo app or the hosted demo (if available) to see example chatbot interactions.

## API & client usage

- Primary consumer-facing service: `neuro-services` (Port 3007) — this provides the public API endpoints used by clients.
- For full API details, look for a canonical OpenAPI/Swagger spec in `neuro-services/openapi.yaml` (if present) or ask the team to publish one.

## Common topics for users
- Authentication: How to obtain API tokens and authenticate requests to the gateway
- Rate limits: Understand request quotas and retry/backoff behavior enforced by the gateway
- Examples: Provide JavaScript/TypeScript snippets and quick curl examples

## Where to find more help
- Developer-focused API spec & examples: `wiki/03-Consumer-API-Guide.md` (technical, for implementers)
- User-facing guides and support: consider the `neuro-web` demo and the GitHub Discussions/Issues for help

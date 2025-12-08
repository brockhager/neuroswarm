# NeuroSwarm — General Users (Chatbot)

This landing page is for end users and non-technical consumers who want to try the NeuroSwarm chatbot, demos, or client-facing experiences. It intentionally focuses on quickstarts and usage guidance — if you're building integrations, SDKs, or need the formal API specification, please see the *Consumer / API Guide* at `wiki/03-Consumer-API-Guide.md` (technical reference).

## Quick start — interact with the running chatbot

- Web UI demo (example): `neuro-web/pages/sdk-demo.tsx` — this is the client demo that shows common flows.
- Try the demo app or the hosted demo (if available) to see example chatbot interactions.

## How to try NeuroSwarm (end-user)

- Web UI/demo — open the demo app (if hosted) or run `neuro-web` locally to try conversations and example flows.
- Local quickstart — run the example demo under `neuro-web/pages/sdk-demo.tsx` to explore common interactions and UI patterns.

If you need the formal API details (OpenAPI, SDKs, rate limits), see the technical Consumer/API Guide (`wiki/03-Consumer-API-Guide.md`).

## Common topics for users
- Authentication: How to obtain API tokens and authenticate requests to the gateway
- Rate limits: Understand request quotas and retry/backoff behavior enforced by the gateway
- Examples: Provide JavaScript/TypeScript snippets and quick curl examples

## Where to find more help
- Developer-focused API spec & examples: `wiki/03-Consumer-API-Guide.md` (technical, for implementers)
- User-facing guides and support: consider the `neuro-web` demo and the GitHub Discussions/Issues for help

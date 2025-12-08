# NeuroSwarm — Consumer / API Guide

This page is for engineers and writers who maintain *client-facing* documentation or build apps that consume the NeuroSwarm API (chatbot/API consumer). It points to the public API surface, rate-limits, and examples.

## Core API surface (neuro-services)
- The primary public-facing API is provided by `neuro-services` on Port `3007`.
- For client integrations and SDKs, consult `neuro-services` README and API spec files when present.

## Key consumer topics
- Authentication & rate-limiting — how the gateway and neuro-services authenticate users and enforce request quotas
- Common payload/response formats — normalized artifact and settlement structures used by clients
- Example flows — sequence diagrams for submit -> process -> status

## Links & quick references
- Development & API server implementation: `neuro-services/src` (see `NeuroServiceController.ts`)  
- API spec / OpenAPI (if present): search for `openapi`, `swagger`, or `api-spec` in the repo root or `neuro-services/` (add if missing)  
- SDKs & client examples: `neuro-web/` and `neuro-shared` client utilities

## Next steps for docs authors
- Add a stable OpenAPI/Swagger spec under `neuro-services/openapi.yaml` and link it here  
- Add client examples for JavaScript/TypeScript and a lightweight curl quickstart for basic flows

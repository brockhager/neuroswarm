# API Rate Limiting & Abuse Prevention

This spec outlines a baseline API rate limiting and abuse prevention approach for NeuroSwarm Admin Node service endpoints.

## Objectives
- Throttle abusive clients and reduce noisy requests
- Prevent denial-of-service patterns against public observability endpoints
- Allow burst traffic for known collaborators via whitelisting

## Design
- Implement token bucket rate limiting at an API gateway or per-node middleware with the following default policy:
  - Unauthenticated requests: 10 requests per minute per IP
  - Authenticated (admin / founder) requests: 60 requests per minute per user
  - Whitelist contributors / CI runner IPs with higher throughput

## Implementation Options
- Node-level middleware (express-rate-limit) for quick implementation in `admin-node`
- Opt-in gateway (API Gateway or Cloudflare RateLimiting) for global policy and centralization

## Enforcement & Monitoring
- Emit governance logs for rate-limit events
- Add alerts for rate-limit thresholds (e.g., 90% of threshold across many IPs in a short time)

## Next Steps
- Add a small middleware config and wire it into `admin-node/src/index.ts` for Discovery endpoints
- Add e2e test to verify rate-limiting behavior for public observability endpoints

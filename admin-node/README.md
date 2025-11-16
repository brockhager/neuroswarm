# ⚠️ WARNING! ⚠️

**DO NOT USE ADMIN NODE UNLESS GIVEN PERMISSION BY FOUNDER.**

**USING WITHOUT PERMISSION CAN RESULT IN PERMANENT BAN**

---

# Admin Node

NeuroSwarm Admin Node - Founder control plane for observability and emergency controls.

## Overview

The Admin Node provides a secure, founder-only interface for monitoring NeuroSwarm's core systems and executing emergency controls. It implements multi-signature authentication with HSM integration and comprehensive governance logging.

## Architecture

- **Framework**: Express.js with TypeScript
- **Authentication**: Multi-signature JWT with HSM integration
- **Observability**: Real-time dashboards for consensus, tokenomics, and communication streams
- **Security**: Founder-only access with comprehensive audit trails
- **Logging**: Cryptographically signed governance logs for all actions

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Admin Operations (Founder Only)
- `GET /v1/admin/status` - System status overview
- `POST /v1/admin/freeze` - Emergency system freeze
- `POST /v1/admin/restore` - Emergency system restore
- `GET /v1/admin/logs` - Recent governance logs
- `POST /v1/admin/config` - Update system configuration
- `POST /v1/admin/anchor-genesis` - Execute genesis anchoring (API)
- `GET /v1/admin/verify-genesis/:txSig` - Execute genesis verification (API)
 - `GET /v1/admin/verify-genesis/:txSig` - Execute genesis verification (founder-only)
- `POST /v1/admin/rotate-founder-key` - Execute founder key rotation (API)
- `GET /v1/admin/validate-genesis-config` - Validate genesis configuration integrity (API)
- `GET /v1/admin/latest-anchor` - Return the most recent governance anchor (admin access)
 - `GET /v1/admin/latest-anchor` - Return the most recent governance anchor (founder-only access)
 - `GET /v1/observability/latest-anchor` - Read-only observability endpoint for dashboards and contributors (no auth required)

#### GET /v1/admin/latest-anchor
Return the most recent governance anchor recorded in the timeline. Intended for admin and founder users to fetch the latest anchor quickly.

Sample response:

```json
{
   "success": true,
   "anchor": {
      "txSignature": "INTEG_SIG",
      "hash": "b6e200c7ec732caf...",
      "timestamp": "2025-11-15T15:58:29.561Z"
   },
   "timestamp": "2025-11-15T15:58:29.660Z"
}
```

If no anchor is found, a 404 response with a descriptive error is returned:

```json
{
   "error": "No anchor found",
   "timestamp": "2025-11-15T..."
}
```

Query parameters:
- `action` (optional): Filter by anchor action type (e.g., `genesis`, `key-rotation`). Example: `/v1/admin/latest-anchor?action=genesis`


### Observability (Admin Access)
- `GET /v1/observability/consensus` - Consensus monitoring data
- `GET /v1/observability/tokenomics` - Tokenomics monitoring data
- `GET /v1/observability/communication` - Agent communication monitoring
- `GET /v1/observability/metrics` - General system metrics
- `GET /v1/observability/anchor-status` - Blockchain anchor verification status
- `GET /v1/observability/nodes` - Network nodes overview
- `GET /v1/observability/governance-anchoring` - Governance anchoring status
- `GET /v1/observability/governance-timeline` - Governance anchoring timeline
- `GET /v1/observability/governance-alerts` - Governance alerts and notifications
- `POST /v1/observability/governance-alerts/:alertId/resolve` - Resolve governance alerts
- `POST /v1/observability/check-alerts` - Manually trigger alert checking

## Security Model

- **Multi-signature Authentication**: Requires founder key validation
- **HSM Integration**: Hardware-secured cryptographic operations
- **Role-based Access**: Founder > Admin > User hierarchy
- **Audit Logging**: All actions logged with cryptographic signatures
- **Rate Limiting**: DDoS protection and abuse prevention

## Development

### Prerequisites
- Node.js 18+
- TypeScript 5.3+
- Access to governance private key (for signing logs)

### Setup
```bash
npm install
npm run build
npm run health-check  # Verify configuration before starting
npm start
```

### Environment Variables
- `PORT`: Server port (default: 8080)
- `JWT_SECRET`: JWT signing secret
- `GOVERNANCE_PRIVATE_KEY_PATH`: Path to governance signing key
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)

### Pre-Startup Health Check
Before starting the Admin Node, run the health check to verify configuration:

```bash
npm run health-check
```

This validates:
- ✅ dotenv configuration loads correctly
- ✅ Required environment variables are defined
- ✅ Key files exist and have correct PEM format
- ✅ Governance signing is enabled

Example output:
```
🔍 Admin Node Health Check
==========================

1. Checking dotenv configuration...
✅ dotenv loaded successfully (90 environment variables)

2. Checking environment variables...
✅ SERVICE_JWT_PRIVATE_KEY_PATH: secrets/admin-node.jwt.key
✅ FOUNDER_PUBLIC_KEY_PATH: secrets/founder.jwt.pub
✅ GOVERNANCE_PRIVATE_KEY_PATH: secrets/founder.jwt.key

3. Validating key files...
✅ Admin Node JWT Private Key: Valid private key
✅ Founder Public Key: Valid public key
✅ Governance Private Key: Valid private key

4. Governance signing readiness...
✅ Governance signing enabled - logs will be cryptographically signed

🎉 Health Check Complete!
========================
✅ dotenv configuration: OK
✅ Environment variables: OK
✅ Key files: OK
✅ Governance signing: ENABLED

🚀 Admin Node is ready to start!
```

### Governance Anchoring (Blockchain Verification)

NeuroSwarm implements a comprehensive governance ritual system that anchors all critical governance actions to the Solana blockchain for public verification and transparency.

#### Supported Anchor Types

- **Genesis**: Founder keys and genesis configuration
- **Key Rotation**: Cryptographic key updates and transitions
- **Policy Update**: Governance policy and configuration changes

#### Governance Ritual Commands

```bash
# Genesis anchoring (initial setup)
npm run anchor-governance genesis

# Key rotation anchoring
npm run anchor-governance key-rotation --new-key=./new-key.pem --old-key=./old-key.pem

# Policy update anchoring
npm run anchor-governance policy-update --policy-file=./policy.json
```

#### Verification Workflow

Contributors can independently verify any governance action:

```bash
# Verify genesis integrity
npm run verify-governance <TRANSACTION_SIGNATURE> genesis

# Verify key rotation
npm run verify-governance <TRANSACTION_SIGNATURE> key-rotation --new-key=./new-key.pem --old-key=./old-key.pem

# Verify policy update
npm run verify-governance <TRANSACTION_SIGNATURE> policy-update --policy-file=./policy.json
```

#### Ritual Process

1. **Preparation**: Generate fingerprints for the governance action
2. **Anchoring**: Execute Solana memo transaction with fingerprints
3. **Logging**: Record action in governance logs with transaction signature
4. **Verification**: Contributors verify fingerprints match blockchain data
5. **Transparency**: All actions publicly auditable on Solana explorer

#### Dashboard Integration

The admin dashboard provides:
- Real-time anchoring status for all governance actions
- One-click verification command copying
- Interactive anchoring workflow buttons
- Latest anchor quick lookup endpoint and dashboard modal (`GET /v1/admin/latest-anchor` and a "Latest Anchor" button in the dashboard)

#### E2E Testing (Playwright)

We use Playwright to validate the dashboard's latest anchor modal and founder/admin flows.

Run locally (requires Playwright to be installed):

```bash
cd admin-node
npm ci
npx playwright install
npm run e2e
```

CI: Playwright e2e tests are executed in `.github/workflows/admin-node-integration.yml` in the `e2e-tests` job.

Reproducible E2E setup:
- Use `npm ci` to ensure `package-lock.json` is used for deterministic installs.
- Install Playwright browsers with `npx playwright install --with-deps` after dependency install.
- When contributing, run these steps to validate: `npm ci && npx playwright install && npm run e2e`.

UI polish & e2e coverage notes:
- The dashboard now features non-blocking toast notifications for key actions (copy-to-clipboard, mark verified, set tx signature) to improve UX.
- The latest anchor modal now supports overlay click-to-close and a close button with `data-testid` attributes for robust E2E targeting.
- Playwright tests were extended to validate copy-to-clipboard behavior, mark-verified flow, modal open/close, and founder vs admin permission checks.

#### Running Unit & Integration Tests

Run the project's unit and integration tests locally with the standard test runner:

```bash
cd admin-node
npm ci
npm test
```

To run a single integration test or a subset by name, pass Jest `-t`:

```bash
npm run integration -- -t "Anchor lifecycle integration"
```

For targeted unit tests (useful while iterating):

```bash
npm test -- -t "AnchorService.getLatestAnchor"
```

- Alert system for failed or stale anchors
- **Key Rotation**: Automated key rotation workflow with new keypair generation
- **Config Validation**: Real-time genesis configuration integrity checking
- **Governance Timeline**: Complete history of all anchoring events with verification status
- **Automated Alerts**: Real-time notifications for verification failures and system issues

#### Dashboard Tabs

**Anchor Status**: Current blockchain anchor verification status and system health
**Governance Timeline**: Historical view of all governance anchoring events with filtering and verification
**Alerts**: Active alerts with resolution workflow and severity indicators  
**Governance Anchoring**: Active anchoring operations and available actions
**Node Overview**: Network node status and connectivity information

#### Dashboard-Based Anchoring (Recommended)

The admin dashboard provides one-click anchoring and verification:

**Genesis Anchoring:**
1. Navigate to "Governance Anchoring" tab
2. Click "🏛️ Anchor Genesis" button
3. Execute the displayed Solana CLI command manually
4. Update governance logs with transaction signature

**Genesis Verification:**
1. Click "✅ Verify Genesis" button
2. Enter transaction signature when prompted
3. View verification results and Solana Explorer link

**Key Rotation:**
1. Click "🔄 Rotate Founder Key" button
2. Execute the displayed Solana CLI command manually
3. Update governance logs with transaction signature
4. Update environment configuration with new key paths

**Config Validation:**
1. Click "🔍 Validate Config" button
2. Review validation results and field-by-field analysis
3. Address any configuration issues identified

#### Governance Timeline

The Governance Timeline provides a complete, immutable history of all anchoring events:

**Features:**
- Chronological display of all governance actions (genesis, key rotations, policy updates)
- Verification status tracking (verified, failed, pending, error)
- Actor identification and timestamp logging
- Direct Solana Explorer links for each transaction
- One-click verification for any timeline entry
- Filtering by action type, actor, and verification status

**Timeline Data Structure:**
```json
{
  "id": "uuid",
  "timestamp": "2025-11-14T10:30:00Z",
  "action": "genesis",
  "actor": "founder",
  "txSignature": "abc123...",
  "memoContent": "NeuroSwarm Genesis Anchor",
  "fingerprints": {
    "genesis_sha256": "a1b2c3...",
    "founder_pub_sha256": "d4e5f6..."
  },
  "verificationStatus": "verified",
  "explorerUrl": "https://explorer.solana.com/tx/abc123",
  "details": { "scriptOutput": "...", "operation": "anchor_genesis" },
  "signature": "signature..."
}
```

#### Automated Alerts System

The alerts system provides proactive monitoring and notification of governance issues:

**Alert Types:**
- **Verification Failures**: Hash mismatches or blockchain verification errors
- **Configuration Errors**: Missing or invalid genesis configuration files
- **Security Alerts**: Unauthorized anchoring attempts or key validation failures
- **System Warnings**: Stale anchors, connectivity issues, or performance degradation

**Alert Severities:**
- **Critical**: Immediate action required (verification failures, security breaches)
- **Warning**: Attention needed (stale data, configuration issues)
- **Info**: Informational notifications (system events, status updates)

**Alert Resolution Workflow:**
1. Alerts appear in the "Alerts" dashboard tab with severity indicators
2. Click "✅ Mark as Resolved" to resolve alerts with optional resolution notes
3. Resolved alerts are archived but remain in the timeline for audit purposes
4. Manual alert checking available via "🔄 Check for New Alerts" button

**Automatic Alert Triggers:**
- Genesis anchor verification failures
- Missing genesis configuration files
- Anchors older than 30 days (stale anchor warnings)
- System health check failures
- Unauthorized access attempts

#### CLI-Based Anchoring (Advanced)

For direct CLI usage, the scripts are still available:

```bash
npm run anchor-genesis
npm run verify-genesis <TRANSACTION_SIGNATURE>
```

#### Key Rotation Workflow

1. Generate new key pair with `generate-admin-node-keys.js`
2. Test new keys in staging environment
3. Run key rotation anchoring: `npm run anchor-governance key-rotation --new-key=./new-key.pem --old-key=./old-key.pem`
4. Execute Solana transaction and update governance logs
5. Update `.env` with new key paths
6. Restart admin node with `npm run health-check`
7. Verify rotation: `npm run verify-governance <TX_SIG> key-rotation`

#### Recovery Procedures

**If anchoring fails:**
1. Check Solana CLI configuration: `solana config get`
2. Verify funded account: `solana balance`
3. Retry anchoring with same command
4. If persistent, check key file permissions and formats

**If verification fails:**
1. Regenerate local fingerprints
2. Compare with blockchain data manually
3. Check for file corruption or tampering
4. Contact NeuroSwarm team if mismatch persists

#### Contributor Checklist

- [ ] Run `npm run health-check` before any governance action
- [ ] Execute anchoring command and complete Solana transaction
- [ ] Update governance logs with actual transaction signature
- [ ] Run `npm run verify-governance <TX_SIG> <TYPE>` to confirm
- [ ] Run config validation to ensure genesis integrity
- [ ] Share verification results with the community

#### Transparency Standards

All governance actions are recorded with:
- SHA-256 fingerprints of all affected files/keys
- Complete transaction signatures on Solana mainnet
- Cryptographically signed governance log entries
- Public verification commands for all contributors
- Timestamped audit trails for forensic analysis

### Testing
```bash
npm test
npm run lint
```

## Governance Integration

All admin actions are logged to `wp_publish_log.jsonl` with:
- Timestamp and actor identification
- Cryptographic signatures for integrity
- Complete audit trails for forensic analysis
- Structured JSON format for automated processing

## Phase 1 Implementation Status

✅ **Completed:**
- TypeScript service scaffolded with Express.js framework
- Multi-signature authentication middleware implemented
- Governance logging service with cryptographic signing
- Admin and observability route structures
- Secure configuration management
- Health check and error handling
- **Genesis anchoring and verification API endpoints**
- **Founder key rotation workflow API**
- **Genesis configuration validation API**
- **Dashboard UI with governance ritual controls**
- **Governance timeline service with persistent storage**
- **Automated alerts system with severity levels**
- **Timeline and alerts dashboard tabs**
- **One-click verification and alert resolution**

🔄 **In Progress:**
- HSM client integration for key operations
- Real-time data stream integration
- Email/Slack alert notifications
- Advanced timeline filtering and search
- **Discord bot integration for real-time notifications** ✅
- **Comprehensive testing and validation** ✅
- Email/Slack alert notifications
- Advanced timeline filtering and search
- Multi-anchor history timeline view
- Automated alerts system for verification failures

### Discord Bot Integration

The Admin Node includes real-time Discord notifications for governance events and contributor engagement.

#### Discord Application Setup

1. **Create Discord Application:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and name it "NeuroSwarm Admin"
   - Go to "Bot" section and click "Add Bot"
   - Copy the bot token for environment configuration

2. **Bot Permissions:**
   - Server Members Intent: ✅ Enabled
   - Message Content Intent: ✅ Enabled
   - Bot Permissions: Send Messages, Embed Links, Read Message History

3. **Invite Bot to Server:**
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=68608&scope=bot
   ```

4. **Create Channel Structure:**
   - `#genesis-anchors` - Anchoring events (genesis, rotations)
   - `#verification-results` - Contributor verification outcomes
   - `#governance-logs` - Immutable feed of governance actions
   - `#alerts-critical` - High-severity alerts (verification failures)
   - `#alerts-info` - Warnings and informational notices
   - `#system-health` - Pre-startup health check and monitoring
   - `#onboarding` - Guides for new contributors
   - `#faq` - Common governance questions
   - `#discussion` - General contributor chat
   - `#timeline-feed` - Auto-posted entries from Governance Timeline
   - `#audit-trail` - Signed records of all dashboard/API actions

#### Environment Configuration

Add Discord settings to your `.env` file:

```bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your-bot-token-here
DISCORD_GUILD_ID=your-server-id-here

# Discord Role IDs (generated by setup-discord script)
FOUNDER_ROLE_ID=1234567890123456789
ADMIN_ROLE_ID=1234567890123456789
CONTRIBUTOR_ROLE_ID=1234567890123456789
OBSERVER_ROLE_ID=1234567890123456789

# Discord Channel IDs (generated by setup-discord script)
GENESIS_ANCHORS_CHANNEL_ID=1234567890123456789
VERIFICATION_RESULTS_CHANNEL_ID=1234567890123456789
GOVERNANCE_LOGS_CHANNEL_ID=1234567890123456789
ALERTS_CRITICAL_CHANNEL_ID=1234567890123456789
ALERTS_INFO_CHANNEL_ID=1234567890123456789
SYSTEM_HEALTH_CHANNEL_ID=1234567890123456789
ONBOARDING_CHANNEL_ID=1234567890123456789
FAQ_CHANNEL_ID=1234567890123456789
DISCUSSION_CHANNEL_ID=1234567890123456789
TIMELINE_FEED_CHANNEL_ID=1234567890123456789
AUDIT_TRAIL_CHANNEL_ID=1234567890123456789
```

#### Discord Notification Types

**Anchor Events:**
- Posted when new governance actions are anchored
- Includes transaction signatures and Solana Explorer links
- Sent to `#genesis-anchors` and `#timeline-feed`

**Verification Results:**
- Posted when contributors verify governance actions
- Shows pass/fail status with detailed results
- Sent to `#verification-results`

**Alerts:**
- Critical alerts → `#alerts-critical`
- Warning/Info alerts → `#alerts-info`
- Include severity indicators and resolution status

**System Health:**
- Automated health check reports
- Posted to `#system-health` channel
- Includes admin node, logging, and blockchain status

**Governance Logs:**
- All governance actions logged with signatures
- Posted to `#governance-logs` and `#audit-trail`
- Immutable audit trail for transparency

#### Discord API Endpoints

```
POST /v1/observability/send-onboarding  # Send onboarding guide to Discord
GET  /v1/observability/discord-status   # Check Discord bot connection status
```

#### Testing Discord Integration

1. **Check Bot Status:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:8080/v1/observability/discord-status
   ```

2. **Send Onboarding Guide:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:8080/v1/observability/send-onboarding
   ```

3. **Trigger Test Events:**
   - Run genesis anchoring to test anchor notifications
   - Manually resolve alerts to test alert notifications
   - Run verification to test verification result notifications

## Contributing

See the canonical [Contributor Guide (Wiki)](https://github.com/brockhager/neuro-infra/wiki/Contributor-Guide#admin-node-awareness) for admin node awareness requirements and security protocols.
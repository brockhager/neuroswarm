# Discord Updates Channel

This directory contains instructions and optional helper scripts to integrate a Discord channel for project updates.

How to create an updates channel and webhook:

1. In your Discord server, create a new channel (e.g., `#project-updates`).
2. Go to channel settings → Integrations → Create Webhook and copy the webhook URL.
3. Store the webhook URL as a GitHub Secret in your repository named `DISCORD_WEBHOOK`.

Posting updates
----------------
You can use the repository workflow `neuroswarm/.github/workflows/publish-update.yml` to publish an update. It will:

- Append a new entry to `neuroswarm/wiki/Updates.md`.
- Post a message to the `DISCORD_WEBHOOK`.

If you prefer to use a bot to create channels programmatically, add a bot to the server and use bot token and the `createChannel.js` helper in `scripts/` (example not included by default).
	* If you prefer to programmatically create a channel, add a bot to your server and grant it `MANAGE_CHANNELS`, set `DISCORD_BOT_TOKEN` and `GUILD_ID`, and run `node neuroswarm/scripts/createDiscordChannel.js --name 'project-updates' --type text`.

Note: To publish an update that appends to the wiki and posts to Discord, call the ESM script `neuroswarm/scripts/publishUpdate.mjs` using Node. For example:

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "New Update" --body "Update body" --author "Bot"
```
You can override the webhook URL on the command line for testing with `--webhook`:

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "Testing webhook" --body "Testing" --webhook "https://discord.com/api/webhooks/..."

Templates and custom PR body
---------------------------
If you'd like structured PRs, use the built-in `--template full` option to generate a PR body with Summary/Impact/Next Steps and add Update metadata to the wiki entry. You can also supply `--template-file <path>` and include placeholders such as `{{title}}`, `{{body}}`, `{{author}}`, `{{date}}`, `{{labels}}`, and `{{reviewers}}`.

Example:

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "New Update" --body "Summary..." --pr --open-pr --template full --labels "ops" --reviewers "alice"
```

If you want to request reviewers or add repo labels when creating a PR from the script, you can use `--reviewers` and `--labels`:

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "New Update" --body "Update body" --author "Bot" --pr --open-pr --labels "ops,release" --reviewers "alice,bob"
```
```
# NeuroSwarm Discord Integration

This directory contains the Discord bot integration for NeuroSwarm governance notifications and server management.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables from the main NeuroSwarm project:
```bash
cp ../.env .env
```

Make sure your `.env` file contains:
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- Channel IDs (after running setup)

## Scripts

### Setup Discord Server
Creates roles, channels, and permissions for the NeuroSwarm governance server:

```bash
npm run setup
```

This will:
- Create governance roles (Founder, Admin, Contributor, Observer)
- Set up channel categories (Governance, Alerts & Monitoring, Community & Support)
- Configure channel permissions
- Output environment variable mappings for channel IDs

### Check Discord Status
Verifies bot connection and channel access:

```bash
npm run status
```

### Organize Channels
Reorganizes existing channels into proper categories:

```bash
npm run organize
```

## Channel Structure

### Governance Category
- `#genesis-anchors` - Genesis anchoring operations
- `#verification-results` - Independent verification results
- `#governance-logs` - Automated governance action logs
- `#timeline-feed` - Real-time governance timeline feed
- `#audit-trail` - Complete audit trail of all governance actions

### Alerts & Monitoring Category
- `#alerts-critical` - Critical system alerts and security notifications
- `#alerts-info` - Informational alerts and system updates
- `#system-health` - System health monitoring and status updates

### Community & Support Category
- `#onboarding` - New contributor onboarding and getting started
- `#faq` - Frequently asked questions and documentation
- `#discussion` - General governance and project discussion

## Usage in Admin Node

The Discord service is automatically integrated with the admin node for:

- **Governance Notifications**: Automatic posting of governance actions to relevant channels
- **Alert Broadcasting**: System alerts and critical notifications
- **Verification Results**: Independent verification outcomes
- **System Health**: Automated health check reports

## API Integration

The admin node provides REST endpoints for Discord operations:

- `POST /discord/send-onboarding` - Send onboarding guide
- `GET /discord/debug-channels` - Debug channel access
- `GET /discord-status` - Check bot connection status

## Environment Variables

Required environment variables:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here

# Channel IDs (generated by setup script)
GENESIS_ANCHORS_CHANNEL_ID=
VERIFICATION_RESULTS_CHANNEL_ID=
GOVERNANCE_LOGS_CHANNEL_ID=
ALERTS_CRITICAL_CHANNEL_ID=
ALERTS_INFO_CHANNEL_ID=
SYSTEM_HEALTH_CHANNEL_ID=
ONBOARDING_CHANNEL_ID=
FAQ_CHANNEL_ID=
DISCUSSION_CHANNEL_ID=
TIMELINE_FEED_CHANNEL_ID=
AUDIT_TRAIL_CHANNEL_ID=

# Role IDs (generated by setup script)
FOUNDER_ROLE_ID=
ADMIN_ROLE_ID=
CONTRIBUTOR_ROLE_ID=
OBSERVER_ROLE_ID=
```

## Bot Permissions

The bot requires the following Discord permissions:
- Read Messages
- Send Messages
- Manage Messages
- Embed Links
- Read Message History
- Use Slash Commands

## Development

To run scripts directly:

```bash
# Build TypeScript
npm run build

# Run individual scripts
npx ts-node src/setup-discord.ts
npx ts-node src/discord-status.ts
npx ts-node src/organize-discord.ts
```
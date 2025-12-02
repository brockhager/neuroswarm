# Router API Alerting Configuration

This guide explains how to configure `router-api/src/services/alerting.ts` to send high-priority operational alerts to external systems (Slack / Discord) using a webhook URL.

Note: The implementation currently looks for `SLACK_ALERT_WEBHOOK` environment variable and will attempt to deliver alerts to the configured webhook. The implementation uses a runtime fetch resolver and will fall back on local console logging if delivery fails.

## 1 — Environment variable

Set the webhook URL as an environment variable in your deployment environment (container, systemd service, Kubernetes Secret, CI job etc.)

Example (Linux / Docker):

export SLACK_ALERT_WEBHOOK="https://discord.com/api/webhooks/xxxx/xxxx"

Important: The alerting service will accept either Slack or Discord webhook URLs but you must choose the correct payload shape. The code has a simple Slack-oriented payload by default but can be adapted for Discord with the changes below.

## 2 — Discord Integration

Discord webhooks require an object with `content` and `embeds` rather than Slack's `attachments`. To have the existing `AlertingService` send Discord-compatible messages, edit `SlackAlerter.postToSlack` in `router-api/src/services/alerting.ts`.

Below is a suggested Discord payload to replace the existing Slack payload:

```ts
// --- INSIDE SlackAlerter.postToSlack() ---
const colorMap: Record<AlertPriority, number> = {
  'CRITICAL': 14686298, // #e01e5a
  'HIGH': 16754432,      // #ffc300
  'MEDIUM': 4438500,     // #439FE0
  'LOW': 8882035         // #86A873
};

const discordPayload = {
  content: `**${priority} ALERT:** ${title}`,
  embeds: [{
    title: `🚨 [${priority}] Router Alert: ${title}`,
    color: colorMap[priority] || 13158600,
    fields: [
      { name: 'Details', value: details, inline: false },
      { name: 'Timestamp', value: new Date().toISOString(), inline: true },
      { name: 'Tags', value: tags && tags.length > 0 ? tags.join(', ') : 'None', inline: true }
    ],
    timestamp: new Date().toISOString()
  }]
};

await fetch(this.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(discordPayload) });
```

If you want to support both Slack and Discord simultaneously, you can detect which format to send based on pattern matching the webhook URL (e.g. `discord.com/api/webhooks` in the webhook URL implies Discord payloads).

## 3 — Test and verify

1. Ensure the environment variable is present and the service is running.
2. Trigger a high priority alert from the running system (e.g., cause the ReconciliationService to detect an unsigned refund or call the alerting dispatch manually).
3. Confirm the message appears in the Discord/Slack channel with expected formatting.

## 4 — Production suggestions

- Add an alert throttling/deduplication facility so repeated alerts do not overwhelm the channel.
- Ship monitoring dashboard panels for `unsigned_refund_count`, `refund_confirmed_count` and reconciler run latency.
- Keep sensitive webhooks in secure secret stores; use short-lived tokens if possible.

If you want I can implement automatic detection for Discord vs Slack in `SlackAlerter` and add both payload paths as a follow-up.

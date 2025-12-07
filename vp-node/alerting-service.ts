// vp-node/alerting-service.ts
// CN-07-F: Operator Alert Integration (Discord Webhook targeting)
// Formats canonical OperatorAlert objects and dispatches them to the internal Alert Sink API (APP-04).

// --- MOCK CONSTANTS & CONFIGURATION ---
const ALERT_SINK_API_URL = process.env.ALERT_SINK_API_URL || 'http://alert-sink:3010/api/v1/alerts';

type AlertLevel = 'CRITICAL' | 'WARNING' | 'INFO';

export interface OperatorAlert {
  source: string; // e.g., 'VP-Node:CN-07-E'
  level: AlertLevel;
  title: string;
  description: string;
  details: Record<string, any>;
  timestamp: string;
}

/**
 * Build a Discord-compatible webhook payload from an internal OperatorAlert.
 */
export function createDiscordPayload(alert: OperatorAlert): any {
  const colorMap: Record<AlertLevel, number> = {
    CRITICAL: 15158332, // red
    WARNING: 16776960, // yellow
    INFO: 3447003, // blue
  };

  const detailsFields = Object.entries(alert.details || {}).map(([name, value]) => ({
    name: name.toUpperCase(),
    value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
    inline: true,
  }));

  return {
    username: 'NeuroSwarm Alert Bot',
    content: `@here **${alert.level} ALERT:** ${alert.title}`,
    embeds: [
      {
        title: alert.title,
        description: alert.description,
        color: colorMap[alert.level],
        timestamp: alert.timestamp,
        footer: { text: `Source: ${alert.source} | VP-Node: ${process.env.VP_NODE_ID || 'LocalTest'}` },
        fields: detailsFields.slice(0, 25),
      },
    ],
  };
}

/**
 * Dispatch the canonical alert to the Alert Sink (mocked) that forwards to Discord.
 * This is best-effort: we log success/failure and don't throw for transient errors.
 */
export async function dispatchAlert(alert: OperatorAlert): Promise<void> {
  try {
    const payload = createDiscordPayload(alert);

    // In the prototype we don't perform network IO. The alert sink would POST the payload to Discord.
    // We'll simulate a short async call so tests can await and the code path remains realistic.
    await new Promise((res) => setTimeout(res, 20));

    // For observability we log an abbreviated payload summary.
    console.log(`[ALERT] Dispatched ${alert.level} to sink (url=${ALERT_SINK_API_URL}): ${alert.title}`);
    // In a real implementation:
    // const r = await fetch(ALERT_SINK_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    // if (!r.ok) throw new Error(`alert sink responded ${r.status}`);
  } catch (err) {
    console.error(`[ALERT FAILED] Could not dispatch alert: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// lightweight simulation helper when executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('alerting-service.ts')) {
  (async () => {
    const critical: OperatorAlert = {
      source: 'VP-Node:CN-07-E',
      level: 'CRITICAL',
      title: 'SLASHING THRESHOLD BREACHED',
      description: 'Validator V-ROGUE-7 hit 5 consecutive missed slots. Slashing Evidence submitted.',
      details: { validatorId: 'V-ROGUE-7', consecutiveMisses: 5 },
      timestamp: new Date().toISOString(),
    };
    await dispatchAlert(critical);
  })();
}

export default { createDiscordPayload, dispatchAlert };

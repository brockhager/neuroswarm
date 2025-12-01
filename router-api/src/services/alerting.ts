/**
 * Alerting Service (Mock Implementation)
 * Centralized alerting helper for the Router API. Can be replaced with a
 * production implementation that posts to Slack, PagerDuty, etc.
 */

export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AlertMessage {
    priority: AlertPriority;
    title: string;
    details: string;
    tags?: string[];
}

// Use runtime resolution for fetch: prefer globalThis.fetch (Node 18+); fall back to node-fetch at runtime.

class SlackAlerter {
    private webhookUrl: string;
    constructor(webhookUrl: string) {
        this.webhookUrl = webhookUrl;
    }

    async postToSlack(title: string, details: string, priority: string, tags: string[]) {
        const payload = {
            text: `*[${priority}]* ${title}\n${details}\n_tags: ${tags.join(', ')}_`,
        };

        // Determine fetch implementation at runtime to avoid static ESM import.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fetchFn: any = (typeof (globalThis as any).fetch === 'function') ? (globalThis as any).fetch : (require('node-fetch').default || require('node-fetch'));

        const res = await fetchFn(this.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            // keep short timeout semantics handled by upstream or node runtime
        });

        if (!res.ok) {
            throw new Error(`Slack webhook responded with status ${res.status}`);
        }
    }
}

export class AlertingService {
    private slackWebhookUrl: string | null = process.env.SLACK_ALERT_WEBHOOK || null;
    private slackAlerter: SlackAlerter | null = null;

    constructor() {
        if (this.slackWebhookUrl) {
            this.slackAlerter = new SlackAlerter(this.slackWebhookUrl);
            console.log('[Alerting] Slack webhook configured; external delivery enabled.');
        } else {
            console.warn('[Alerting] No SLACK_ALERT_WEBHOOK configured — running in mock mode.');
        }
    }

    public async dispatch(alert: AlertMessage): Promise<void> {
        const { priority, title, details, tags = [] } = alert;

        const alertBox = `\n======================================================\n!!! ${priority} ALERT: ${title} !!!\n------------------------------------------------------\nDetails: ${details}\nTags: ${tags.length ? tags.join(', ') : 'None'}\nTimestamp: ${new Date().toISOString()}\n======================================================\n`;
        // Always log locally for traceability
        console.error(alertBox);

        // If Slack is configured, try to send
        if (this.slackAlerter) {
            try {
                await this.slackAlerter.postToSlack(title, details, priority, tags);
                console.log('[Alerting] Slack delivery succeeded');
            } catch (err) {
                console.error('[Alerting] Slack delivery failed:', err);
                // keep fallback logging only — do not throw to avoid crashing the worker
            }
        }
    }

    public async dispatchCritical(title: string, details: string, tags: string[] = []) {
        await this.dispatch({ priority: 'CRITICAL', title, details, tags });
    }
}

export default AlertingService;

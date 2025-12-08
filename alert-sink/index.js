const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3010;

// Optional Firestore integration (admin SDK). Initialized only when credentials available.
let firestoreClient = null;
const initFirestore = () => {
    try {
        // Lazy-load so test environments without firebase don't fail on require
        const admin = require('firebase-admin');

        // If GOOGLE_APPLICATION_CREDENTIALS is set or the default credentials are available
        // admin.initializeApp will use them automatically. For explicit use provide
        // a SERVICE_ACCOUNT_JSON env that contains the JSON payload for test scenarios.
        if (!admin.apps || admin.apps.length === 0) {
            if (process.env.SERVICE_ACCOUNT_JSON) {
                const sa = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
                admin.initializeApp({ credential: admin.credential.cert(sa) });
            } else {
                admin.initializeApp();
            }
        }

        firestoreClient = admin.firestore();
        console.log('[AlertSink] Firestore initialized');
    } catch (err) {
        // If firebase-admin isn't installed or credentials missing, leave firestoreClient null
        console.log('[AlertSink] Firestore not configured / unavailable:', err?.message || err);
        firestoreClient = null;
    }
};

// Initialize lazily at startup if possible (no hard failure)
initFirestore();

// --- Configuration ---
// NOTE: Use environment variables for production secrets.
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WORKFLOW_WEBHOOK;
const APP_NAME = process.env.APP_NAME || 'NeuroSwarm Router Ops';
const GRAFANA_LINK = process.env.GRAFANA_LINK || 'https://grafana.example.com/d/neuroswarm-ops';

app.use(express.json());

const getAlertColor = (status) => {
    switch ((status || '').toLowerCase()) {
        case 'firing':
            return 16711680; // Red
        case 'resolved':
            return 65280;    // Green
        case 'warning':
            return 16776960; // Yellow
        default:
            return 4473924;  // Gray
    }
}

// --- Deduplication State ---
const alertCooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const shouldSendAlert = (alert) => {
    const { status, labels = {} } = alert;
    
    // Always let RESOLVED alerts through to clear incidents
    if (status === 'resolved') return true;

    const alertKey = `${labels.alertname}:${labels.severity}:${labels.instance}`;
    const now = Date.now();
    const lastSent = alertCooldowns.get(alertKey);

    if (lastSent && (now - lastSent) < COOLDOWN_MS) {
        console.log(`[Dedup] Skipping duplicate alert: ${alertKey} (cooldown active)`);
        return false;
    }

    alertCooldowns.set(alertKey, now);
    return true;
}

const buildDedupKey = (labels = {}) => `${labels.alertname || 'alert'}:${labels.instance || 'instance'}:${labels.severity || 'info'}`;

const writeIncidentToFirestore = async (payload) => {
    if (!firestoreClient) return false;

    try {
        const { status, alerts = [] } = payload;
        const batch = firestoreClient.batch();

        for (const alert of alerts) {
            const labels = alert.labels || {};
            const annotations = alert.annotations || {};
            const dedupKey = buildDedupKey(labels);

            const docRef = firestoreClient.collection('alert_incidents').doc(dedupKey);

            // Merge semantics: write fields and append raw payload to a history array
            const update = {
                alertname: labels.alertname || 'Unnamed Alert',
                severity: labels.severity || 'info',
                instance: labels.instance || 'unknown',
                summary: annotations.summary || annotations.description || null,
                status: status || 'firing',
                startsAt: alert.startsAt ? new Date(alert.startsAt) : new Date(),
                endsAt: alert.endsAt ? (alert.endsAt === 'null' ? null : new Date(alert.endsAt)) : null,
                lastSeenAt: new Date(),
                dedupKey,
                rawPayload: payload,
            };

            // Upsert: keep a small history of events
            batch.set(docRef, { ...update, updatedAt: new Date() }, { merge: true });
        }

        await batch.commit();
        return true;
    } catch (err) {
        console.error('Failed to write incident(s) to Firestore:', err?.message || err);
        return false;
    }
};

const formatAlertEmbed = (alertPayload) => {
    const { status, alerts = [] } = alertPayload;
    const timestamp = new Date().toISOString();
    const color = getAlertColor(status);

    // Filter alerts based on deduplication logic
    const actionableAlerts = alerts.filter(shouldSendAlert);

    if (actionableAlerts.length === 0) {
        return null; // Nothing to send
    }

    const embeds = actionableAlerts.map(alert => {
        const labels = alert.labels || {};
        const annotations = alert.annotations || {};

        return {
            title: `[${status ? status.toUpperCase() : 'ALERT'}] ${labels.alertname || 'Unnamed Alert'}`,
            description: annotations.summary || annotations.description || 'No summary provided.',
            color,
            timestamp: alert.startsAt || timestamp,
            fields: [
                { name: 'Severity', value: (labels.severity || 'info').toUpperCase(), inline: true },
                { name: 'Instance', value: labels.instance || 'N/A', inline: true },
                { name: 'Service', value: labels.job || labels.service || 'N/A', inline: true },
                { name: 'Runbook', value: annotations.runbook || `Open runbook (see ${GRAFANA_LINK})`, inline: false },
            ],
            footer: { text: `${APP_NAME} | Source: ${labels.source || 'Alertmanager'}` }
        };
    });

    return {
        username: `${APP_NAME} Alert System`,
        avatar_url: 'https://placehold.co/128x128/3f51b5/ffffff?text=NS',
        content: `**[${status ? status.toUpperCase() : 'ALERT'}]** ${actionableAlerts.length} alert(s) from **${APP_NAME}**`,
        embeds
    };
}

const sendAlertToDiscord = async (payload) => {
    if (!DISCORD_WEBHOOK_URL) {
        console.error('DISCORD_WORKFLOW_WEBHOOK is not set. Alert not sent.');
        return false;
    }

    const message = formatAlertEmbed(payload);
    
    // If deduplication filtered everything out, message will be null
    if (!message) {
        console.log('All alerts in payload were deduplicated. Skipping Discord send.');
        return true; // Treated as success (handled)
    }

    try {
        await axios.post(DISCORD_WEBHOOK_URL, message, { headers: { 'Content-Type': 'application/json' } });
        console.log(`Routed ${message.embeds.length} alert(s) (status=${payload.status}) to Discord.`);
        return true;
    } catch (err) {
        console.error('Failed to send alert to Discord:', err.message || err);
        return false;
    }
}

app.post('/webhook/alerts', async (req, res) => {
    const payload = req.body;
    if (!payload || !payload.alerts) return res.status(400).send('Invalid alert payload');

    // Persist incoming alerts to Firestore if configured (best-effort). We still continue
    // to route to Discord and return processing status to caller.
    try {
        const wrote = await writeIncidentToFirestore(payload);
        if (wrote) console.log('[AlertSink] Persisted alert(s) to Firestore');
    } catch (err) {
        console.warn('[AlertSink] Firestore write failed (continuing):', err?.message || err);
    }

    // fire-and-forget send to Discord, respond based on outcome
    sendAlertToDiscord(payload)
        .then(ok => {
            if (ok) res.status(202).send('Alert accepted for processing.');
            else res.status(202).send('Alert processed (discord failed)');
        })
        .catch(err => {
            console.error('Unexpected sink error:', err);
            res.status(500).send('Internal error');
        });
});

// Basic root page for humans and quick local verification
app.get('/', (req, res) => {
    res.set('Content-Type', 'text/html');
    res.status(200).send(`
        <html>
            <head><title>Alert Sink</title></head>
            <body>
                <h1>NeuroSwarm Alert Sink</h1>
                <p>This service accepts incoming Alertmanager webhooks at <code>POST /webhook/alerts</code>.</p>
                <p>Try <a href="/health">/health</a> to check service health.</p>
            </body>
        </html>
    `);
});

// Lightweight health endpoint useful for orchestration checks
app.get('/health', (req, res) => {
    res.json({ ok: true, firestoreConfigured: !!firestoreClient, alertsInCooldown: alertCooldowns.size });
});

if (require.main === module) {
    app.listen(PORT, () => {
    if (!DISCORD_WEBHOOK_URL) {
        console.warn('\n=======================================================');
        console.warn('WARNING: DISCORD_WORKFLOW_WEBHOOK is NOT set. Alerts will be logged but NOT routed to Discord.');
        console.warn('=======================================================\n');
    }
    console.log(`Alert sink handler running on http://localhost:${PORT} (POST /webhook/alerts)`);
    });
} else {
    // When required from tests, do not start the HTTP server automatically.
    console.log('alert-sink module loaded (server not started because required as a module)');
}

// export helpers for testing
// Helper to set firestore client in tests (mocking)
const setFirestoreClientForTest = (client) => { firestoreClient = client; };

module.exports = { app, getAlertColor, formatAlertEmbed, sendAlertToDiscord, writeIncidentToFirestore, buildDedupKey, initFirestore, setFirestoreClientForTest };

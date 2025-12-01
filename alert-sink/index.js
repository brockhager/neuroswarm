const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 8080;

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

const formatAlertEmbed = (alertPayload) => {
    const { status, alerts = [] } = alertPayload;
    const timestamp = new Date().toISOString();
    const color = getAlertColor(status);

    const embeds = alerts.map(alert => {
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
        content: `**[${status ? status.toUpperCase() : 'ALERT'}]** ${alerts.length} alert(s) from **${APP_NAME}**`,
        embeds
    };
}

const sendAlertToDiscord = async (payload) => {
    if (!DISCORD_WEBHOOK_URL) {
        console.error('DISCORD_WORKFLOW_WEBHOOK is not set. Alert not sent.');
        return false;
    }

    const message = formatAlertEmbed(payload);
    try {
        await axios.post(DISCORD_WEBHOOK_URL, message, { headers: { 'Content-Type': 'application/json' } });
        console.log(`Routed ${payload.alerts?.length || 0} alert(s) (status=${payload.status}) to Discord.`);
        return true;
    } catch (err) {
        console.error('Failed to send alert to Discord:', err.message || err);
        return false;
    }
}

app.post('/webhook/alerts', async (req, res) => {
    const payload = req.body;
    if (!payload || !payload.alerts) return res.status(400).send('Invalid alert payload');

    // fire-and-forget send, still await to catch errors for logging
    sendAlertToDiscord(payload)
        .then(ok => {
            if (ok) res.status(202).send('Alert accepted for processing.');
            else res.status(502).send('Alert failed to deliver to sink.');
        })
        .catch(err => {
            console.error('Unexpected sink error:', err);
            res.status(500).send('Internal error');
        });
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
module.exports = { getAlertColor, formatAlertEmbed, sendAlertToDiscord };

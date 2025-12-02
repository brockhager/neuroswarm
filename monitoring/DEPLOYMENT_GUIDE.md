# NeuroSwarm Monitoring Stack Deployment Guide

## Overview
This guide explains how to deploy the complete T22 monitoring stack connecting Prometheus → Alertmanager → Alert Sink → Discord.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌─────────┐
│  Router API │─────▶│  Prometheus  │─────▶│ Alertmanager│─────▶│Alert Sink│───▶ Discord
│   (metrics) │      │  (scraping)  │      │  (routing)  │      │  (T20)   │
└─────────────┘      └──────────────┘      └─────────────┘      └─────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Alert Rules  │
                     │  (T22 Rules) │
                     └──────────────┘
```

## Prerequisites

1. **Alert Sink** must be running (T19/T20):
   ```bash
   cd c:/JS/ns/neuroswarm/alert-sink
   npm install
   # Set your Discord webhook
   set DISCORD_WORKFLOW_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE
   node index.js
   ```
   Default port: 3010

2. **Router API** must expose metrics at `/api/metrics`

## Installation

### Option 1: Docker Compose (Recommended)

Create `docker-compose.yml` in `neuroswarm/monitoring/`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: neuroswarm-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert-rules.yml:/etc/prometheus/alert-rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - neuroswarm-network

  alertmanager:
    image: prom/alertmanager:latest
    container_name: neuroswarm-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - neuroswarm-network

  grafana:
    image: grafana/grafana:latest
    container_name: neuroswarm-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - neuroswarm-network

volumes:
  prometheus-data:
  alertmanager-data:
  grafana-data:

networks:
  neuroswarm-network:
    driver: bridge
```

**Start the stack:**
```bash
cd c:/JS/ns/neuroswarm/monitoring
docker-compose up -d
```

### Option 2: Manual Installation (Windows)

1. **Download Prometheus**
   - https://prometheus.io/download/
   - Extract to `C:\Program Files\Prometheus`

2. **Download Alertmanager**
   - https://prometheus.io/download/#alertmanager
   - Extract to `C:\Program Files\Alertmanager`

3. **Copy Config Files**
   ```bash
   # Copy configs to Prometheus directory
   copy monitoring\prometheus.yml "C:\Program Files\Prometheus\"
   copy monitoring\alert-rules.yml "C:\Program Files\Prometheus\"
   
   # Copy config to Alertmanager directory
   copy monitoring\alertmanager.yml "C:\Program Files\Alertmanager\"
   ```

4. **Start Services**
   ```batch
   # Terminal 1: Prometheus
   cd C:\Program Files\Prometheus
   prometheus.exe --config.file=prometheus.yml

   # Terminal 2: Alertmanager
   cd C:\Program Files\Alertmanager
   alertmanager.exe --config.file=alertmanager.yml
   ```

## Verification

### 1. Check Prometheus
Open http://localhost:9090

**Verify targets are being scraped:**
- Go to Status → Targets
- All targets should show "UP" status

**Test a query:**
- Go to Graph tab
- Query: `router_refund_retries_total`
- Should return data if Router API is running

### 2. Check Alertmanager
Open http://localhost:9093

**Verify configuration:**
- Go to Status
- Check that routing is configured correctly

### 3. Test Alert Flow

**Trigger a test alert:**
```bash
# Manually fire an alert to test the pipeline
curl -X POST http://localhost:9093/api/v1/alerts -d '[
  {
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "component": "router-api"
    },
    "annotations": {
      "summary": "This is a test alert"
    }
  }
]'
```

**Expected flow:**
1. Alert appears in Alertmanager UI
2. Alertmanager sends webhook to alert-sink (localhost:3010)
3. Alert-sink applies T20 deduplication
4. Alert posted to Discord webhook (if configured)

### 4. Check Alert Sink Logs
```bash
cd c:/JS/ns/neuroswarm/alert-sink
# View logs to confirm alert received
```

## Grafana Dashboard Setup

## T23 On-Chain Anchor Alert (Production enablement)

We added a Prometheus alert that fires when the T23 anchoring pipeline records a failed on-chain anchor after exhausting retries.

- Alert rule: `T23OnChainAnchorFailures` — fires when `t23_anchor_onchain_failures_total > 0` for 1 minute
- Severity: critical
- Routing: Alertmanager -> `neuroswarm-alert-sink` -> configured notification channel (Discord/Slack/PagerDuty)

Action items to enable end-to-end gated CI and monitoring for T23:

1. Add required GitHub repository secrets (Repository Settings → Secrets) for the gated CI job `t23_devnet_anchor_test`: 
  - SOLANA_RPC_URL (Devnet RPC endpoint)
  - ROUTER_PRIVATE_KEY (Router signer private key as a JSON secret-key array) or SOLANA_SIGNER_KEY (alternate env name)
  - IPFS_API_URL (IPFS pinning endpoint)
  - DISCORD_CRITICAL_ALERT_WEBHOOK (Discord webhook used by alert-sink / workflow notifications for critical alerts)
  - GOVERNANCE_SERVICE_TOKEN (internal token used between router-api and admin-node)

2. Merge the branch containing these changes to `main`. The CI workflow will run the new `t23_devnet_anchor_test` job and perform the full preflight.

3. Confirm Prometheus scrapes the router-api and admin-node metrics and Alertmanager is reachable. If `T23OnChainAnchorFailures` fires, the neurostack alert-sink will receive the webhook and forward notifications to your configured channel.


1. **Access Grafana**
   - URL: http://localhost:3000
   - Default login: admin / admin

2. **Add Prometheus Data Source**
   - Configuration → Data Sources → Add data source
   - Select "Prometheus"
   - URL: `http://prometheus:9090` (Docker) or `http://localhost:9090` (manual)
   - Click "Save & Test"

3. **Import NeuroSwarm Dashboard**
   - Create new dashboard
   - Add panels for:
     - Refund Retry Rate (graph)
     - Unsigned Refunds (stat)
     - Reconciliation Success Rate (gauge)
     - Job Queue Depth (graph)
     - Alert Timeline (heatmap)

## Alert Testing

### Test Each Alert Rule:

1. **High Refund Retry Rate**
   - Generate multiple refund retries in Router API
   - Alert should fire after 2 minutes

2. **Unsigned Refunds Pending**
   - Ensure `unsigned_refunds_pending` metric > 10
   - Alert should fire after 5 minutes

3. **Low Reconciliation Success Rate**
   - Simulate reconciliation failures
   - Alert fires when rate < 85%

## Troubleshooting

### Prometheus can't reach targets
- Check if services are running on expected ports
- Verify firewall rules
- Check prometheus.yml scrape configs

### Alertmanager not receiving alerts
- Check Prometheus → Alerting → Alertmanagers
- Verify alertmanager.yml in Prometheus config

### Alert Sink not receiving webhooks
- Check alert-sink is running on port 3010
- Verify alertmanager.yml webhook URL
- Check alert-sink logs for incoming requests

### Discord not showing alerts
- Verify DISCORD_WORKFLOW_WEBHOOK environment variable
- Test webhook manually with curl
- Check Discord webhook permissions

## Production Deployment

### Security Hardening:
1. Enable authentication on Prometheus/Grafana
2. Use HTTPS for all connections
3. Restrict network access to monitoring stack
4. Store Discord webhook in secrets manager

### High Availability:
1. Run multiple Alertmanager instances
2. Use Prometheus remote storage (e.g., Thanos)
3. Set up Grafana behind load balancer

### Backup:
- Prometheus data: `prometheus-data` volume
- Grafana dashboards: Export as JSON
- Config files: Version control (already in git)

## Monitoring the Monitors

Set up meta-monitoring:
- Prometheus self-scraping (already configured)
- Dead man's switch alert (fires if Prometheus stops working)
- Watchdog timer for alert-sink process

---

**Status**: Ready for Production  
**Completion**: T22 Monitoring/Dashboards ✅ COMPLETE  
**Last Updated**: December 1, 2025

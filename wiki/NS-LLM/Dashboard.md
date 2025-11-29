# NeuroSwarm System Dashboard

**Version**: v0.2.0
**Location**: `ns-web/src/Dashboard.jsx`

The **Consolidated System Dashboard** is the central command center for the NeuroSwarm node. It provides a unified interface to monitor performance, participate in governance, and manage plugins.

## Overview

The dashboard is divided into four main views, accessible via the top navigation bar:

1.  **System Overview** (Default)
2.  **Performance & Scalability**
3.  **Decentralized Governance**
4.  **Plugin Manager**

---

## 1. System Overview

The landing page provides a high-level snapshot of the node's health.

**Key Metrics:**
- **System Status**: Operational status (e.g., Online, Degraded).
- **Version**: Current software version (v0.2.0).
- **Uptime**: Duration since last restart.
- **Active Peers**: Number of connected nodes in the swarm.

---

## 2. Performance & Scalability

Detailed metrics on the AI inference engine's performance.

**Features:**
- **P95 Latency**: Color-coded indicator (< 80ms = Green, > 80ms = Red).
- **Throughput**: Tokens generated per second.
- **Time To First Token (TTFT)**: Responsiveness metric.
- **System Grade**: Overall performance score (A-F).
- **Trend Charts**: Real-time visualization of latency and throughput over the last 30 minutes.

---

## 3. Decentralized Governance

Interface for community-driven decision making and transparency.

**Features:**
- **Active Proposals**: Count of open votes.
- **Last Anchored Block**: Hash of the most recent audit log checkpoint on the blockchain.
- **Toxicity Flag Rate**: Percentage of generations flagged by safety validators.
- **Activity Feed**: Live stream of voting actions, proposal creations, and blockchain anchors.

---

## 4. Plugin Manager

Control panel for the extensible plugin system.

**Features:**
- **Plugin List**: Table showing ID, Type, Version, and Status.
- **Execution Stats**: Average execution time and success rate for each plugin.
- **Reload Function**: Button to hot-reload plugins from disk without restarting the node.

---

## Integration Guide

The dashboard is integrated into the main React application (`App.jsx`) as the default "System" tab.

### Usage
1.  Start the web UI:
    ```bash
    cd ns-web
    npm run dev
    ```
2.  Navigate to `http://localhost:3010`.
3.  The dashboard will load automatically.

### Customization
To add new views or modify existing ones, edit `ns-web/src/Dashboard.jsx`. The component uses a modular structure where each view is a separate sub-component (`PerformanceView`, `GovernanceView`, etc.).

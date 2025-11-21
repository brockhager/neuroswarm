# New User Guide: Getting Started with ns-node

Welcome! This page is the main entry point for new contributors to the NeuroSwarm project. It covers the basics of installing, running ns-node, and verifying that your node is connected to the network.

## Prerequisites
- Node.js (latest LTS version)
- Git installed
- Basic terminal knowledge

## Installation
- Clone the repository: `git clone https://github.com/neuroswarm/ns-node.git`
- Navigate into the folder: `cd ns-node`
- Install dependencies: `npm install`

## Running ns-node
- Start the node: `npm run start`
- Default port: 3000
- Logs will show peer discovery and connection events.

## Verifying Connectivity
- Open browser: `http://localhost:3000/metrics` (if metrics enabled)
- Check logs for "Connected peers" message.
- Confirm node type (NS, Gateway, VP) is displayed correctly.

## Feedback & Learning
- Use `/feedback` endpoint to submit thumbs up/down on responses.
- Helps improve adapter recommendations and learning system.

## Documentation Links
- [System Overview](/neuroswarm/wiki/System-Overview/README.md)
- [Reputation System](/neuroswarm/wiki/Reputation-System/README.md)
- [Encrypted Communication](/neuroswarm/wiki/Encrypted-Communication/README.md)
- [NAT Traversal](/neuroswarm/wiki/NAT-Traversal/README.md)
- [mTLS](/neuroswarm/wiki/mTLS/README.md)
- [Learning System](/neuroswarm/wiki/Learning.md)
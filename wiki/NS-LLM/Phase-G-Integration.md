# Phase G: Integration Guide

This guide outlines how to integrate with the distributed NeuroSwarm ecosystem, leveraging the new Orchestration, Consensus, and Federated Caching layers.

## 1. Node Types

The ecosystem consists of three primary node types:

*   **NS Node (Contributor)**: Runs models, generates content, and contributes to the knowledge graph.
*   **VP Node (Governance)**: Validates content, enforces rules, and participates in consensus.
*   **Gateway Node (Data)**: Routes requests, indexes data, and provides entry points.

## 2. Orchestration Layer

The `OrchestrationService` enables cross-node communication and task dispatching.

### Dispatching a Task

To send a task to another node (e.g., requesting validation from a VP node):

```javascript
const response = await fetch('http://localhost:3009/api/orchestration/dispatch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'VP', // Target node type
    endpoint: '/api/validate', // Endpoint to call on target
    payload: { content: '...' },
    strategy: 'random' // 'random' | 'broadcast'
  })
});
```

### Registering a New Node

New nodes automatically register via the P2P discovery protocol. Ensure your node is configured with the correct `nodeType` in `server.js` or environment variables:

```bash
NODE_TYPE=VP PORT=3010 npm start
```

## 3. Consensus Protocol

The `ScoringConsensus` service allows nodes to reach agreement on content quality or governance decisions.

### Submitting a Score

Validators (VP nodes) submit scores for a content item:

```javascript
await fetch('http://localhost:3009/api/consensus/vote', {
  method: 'POST',
  body: JSON.stringify({
    contentId: 'cid-123',
    score: 0.95,
    peerId: 'node-vp-1'
  })
});
```

### Checking Consensus

To check if a consensus has been reached:

```javascript
const result = await fetch('http://localhost:3009/api/consensus/cid-123');
// Returns: { score: 0.92, confidence: 0.85, status: 'finalized' }
```

## 4. Federated Caching

Federated Caching allows nodes to share embeddings and generation results, reducing redundancy.

### Enabling Federated Cache

In `ns-node`, the `FederatedCacheService` is enabled by default. It queries:
1.  **Local Cache**: `knowledge-index.json` / IPFS.
2.  **Remote Peers**: Broadcasts query to other NS nodes.

### Querying the Cache

```javascript
const result = await fetch('http://localhost:3009/api/cache/query', {
  method: 'POST',
  body: JSON.stringify({
    question: 'What is the price of Bitcoin?',
    threshold: 0.8
  })
});
```

## 5. Developing Plugins (Coming Soon)

Phase G will introduce a plugin system for custom scoring and governance modules. Stay tuned for the Plugin Development Guide.

# Developer SDK for AI Agent Integration (Design)

This document outlines a baseline developer SDK for AI agent integration with NeuroSwarm.

## Goals
- Provide lightweight interfaces and helper functions to register agents, discover peers, and interact with the protocol
- Standardize serialization and message formats for RPCs and events
- Support multi-language SDKs (Node.js, Python) in the future

## Features
- Agent registration and discovery
- Message bus helpers for pub/sub and RPC
- Utilities for signing and verification (founder/admin checks)
- Example: minimal Node.js package in `neuro-shared` exposing `registerAgent`, `sendMessage`, `listen` and `query` utilities

## Next steps
- Create `neuro-shared/sdk` package scaffold, with minimal API and tests
- Add docs, examples, and a toy agent demonstrating SDK usage

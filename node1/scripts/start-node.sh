#!/bin/bash

# NeuroSwarm Node1 Startup Script (Unix)
# This script starts the NeuroSwarm node1 with proper environment configuration

echo "Starting NeuroSwarm Node1..."

# Load environment variables
if [ -f "../.env" ]; then
    export $(cat ../.env | xargs)
    echo "Environment loaded from .env"
else
    echo "Warning: .env file not found"
fi

# Set working directory to project root
cd "$(dirname "$0")/../.."

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed. Please install pnpm first."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Start the node
echo "Launching NeuroSwarm node1 on port $PORT..."
pnpm dev --filter ns-node

echo "Node1 startup complete."
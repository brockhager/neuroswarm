#!/bin/bash

# Admin Node Genesis Anchor Script
# Computes SHA-256 hash of admin-genesis.json and submits Solana memo transaction

set -e

# Configuration
GENESIS_FILE="docs/admin-genesis.json"
FOUNDER_WALLET="${FOUNDER_WALLET:-}"  # Set via environment variable
SOLANA_RPC="${SOLANA_RPC:-https://api.mainnet-beta.solana.com}"
LOG_FILE="wp_publish_log.jsonl"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Admin Node Genesis Anchor Tool${NC}"
echo "================================="

# Check if genesis file exists
if [ ! -f "$GENESIS_FILE" ]; then
    echo -e "${RED}Error: $GENESIS_FILE not found${NC}"
    exit 1
fi

# Compute SHA-256 hash
echo "Computing SHA-256 hash of $GENESIS_FILE..."
GENESIS_HASH=$(sha256sum "$GENESIS_FILE" | cut -d' ' -f1)
echo -e "Genesis Hash: ${GREEN}$GENESIS_HASH${NC}"

# Check if founder wallet is configured
if [ -z "$FOUNDER_WALLET" ]; then
    echo -e "${RED}Error: FOUNDER_WALLET environment variable not set${NC}"
    echo "Set FOUNDER_WALLET to your Solana wallet address"
    exit 1
fi

echo "Founder Wallet: $FOUNDER_WALLET"

# Confirm action
echo ""
echo -e "${YELLOW}This will submit a Solana transaction with the genesis hash.${NC}"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Submit Solana memo transaction
echo "Submitting Solana memo transaction..."
MEMO="AdminNode1:$GENESIS_HASH"

# Use solana CLI to submit transaction
if command -v solana &> /dev/null; then
    TX_SIGNATURE=$(solana transfer "$FOUNDER_WALLET" 0 --memo "$MEMO" --url "$SOLANA_RPC" --output json | jq -r '.signatures[0]')
    TX_STATUS=$?
else
    echo -e "${RED}Error: solana CLI not found. Please install Solana CLI tools.${NC}"
    exit 1
fi

if [ $TX_STATUS -ne 0 ]; then
    echo -e "${RED}Error: Transaction failed${NC}"
    exit 1
fi

echo -e "Transaction Signature: ${GREEN}$TX_SIGNATURE${NC}"
EXPLORER_URL="https://explorer.solana.com/tx/$TX_SIGNATURE"
echo -e "Explorer URL: ${GREEN}$EXPLORER_URL${NC}"

# Log to governance log
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M")
LOG_ENTRY=$(cat <<EOF
{
  "action": "genesis-anchor",
  "file": "$GENESIS_FILE",
  "hash": "$GENESIS_HASH",
  "blockchain": "solana",
  "txSignature": "$TX_SIGNATURE",
  "explorerUrl": "$EXPLORER_URL",
  "timestamp": "$TIMESTAMP",
  "actor": "genesis-anchor-script"
}
EOF
)

echo "$LOG_ENTRY" >> "$LOG_FILE"
echo -e "${GREEN}Governance log updated${NC}"

echo ""
echo -e "${GREEN}Genesis anchor completed successfully!${NC}"
echo "Hash: $GENESIS_HASH"
echo "Transaction: $TX_SIGNATURE"
echo "Explorer: $EXPLORER_URL"
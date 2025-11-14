#!/bin/bash

# Admin Node Genesis Anchor Verification Script
# Verifies blockchain anchor against local genesis hash

set -e

# Configuration
GENESIS_FILE="docs/admin-genesis.json"
EXPECTED_TX="${EXPECTED_TX:-}"  # Set via environment variable
SOLANA_RPC="${SOLANA_RPC:-https://api.mainnet-beta.solana.com}"
LOG_FILE="wp_publish_log.jsonl"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Admin Node Genesis Anchor Verification${NC}"
echo "======================================="

# Check if genesis file exists
if [ ! -f "$GENESIS_FILE" ]; then
    echo -e "${RED}Error: $GENESIS_FILE not found${NC}"
    exit 1
fi

# Compute current SHA-256 hash
echo "Computing current SHA-256 hash of $GENESIS_FILE..."
CURRENT_HASH=$(sha256sum "$GENESIS_FILE" | cut -d' ' -f1)
echo -e "Current Hash: ${GREEN}$CURRENT_HASH${NC}"

# Check if expected transaction is configured
if [ -z "$EXPECTED_TX" ]; then
    echo -e "${YELLOW}EXPECTED_TX not set. Searching governance logs for anchor transaction...${NC}"

    # Try to find the latest genesis-anchor entry in logs
    LATEST_ANCHOR=$(grep '"action": "genesis-anchor"' "$LOG_FILE" | tail -1)
    if [ -n "$LATEST_ANCHOR" ]; then
        EXPECTED_TX=$(echo "$LATEST_ANCHOR" | jq -r '.txSignature')
        EXPECTED_HASH=$(echo "$LATEST_ANCHOR" | jq -r '.hash')
        echo -e "Found anchor transaction: ${GREEN}$EXPECTED_TX${NC}"
        echo -e "Expected hash: ${GREEN}$EXPECTED_HASH${NC}"
    else
        echo -e "${RED}Error: No genesis anchor found in governance logs${NC}"
        echo "Run genesis-anchor.sh first to create the blockchain anchor"
        exit 1
    fi
else
    echo "Expected Transaction: $EXPECTED_TX"
fi

# Fetch transaction data from Solana
echo "Fetching transaction data from Solana..."
if command -v solana &> /dev/null; then
    TX_DATA=$(solana confirm "$EXPECTED_TX" --url "$SOLANA_RPC" --output json 2>/dev/null || echo "failed")
else
    echo -e "${RED}Error: solana CLI not found. Please install Solana CLI tools.${NC}"
    exit 1
fi

if [ "$TX_DATA" = "failed" ] || [ -z "$TX_DATA" ]; then
    echo -e "${RED}Error: Could not fetch transaction $EXPECTED_TX${NC}"
    exit 1
fi

# Extract memo from transaction
MEMO=$(echo "$TX_DATA" | jq -r '.memo // empty')
if [ -z "$MEMO" ]; then
    echo -e "${RED}Error: No memo found in transaction${NC}"
    exit 1
fi

echo -e "Transaction Memo: ${GREEN}$MEMO${NC}"

# Parse memo for hash
if [[ $MEMO =~ AdminNode1:([a-f0-9]{64}) ]]; then
    BLOCKCHAIN_HASH="${BASH_REMATCH[1]}"
    echo -e "Blockchain Hash: ${GREEN}$BLOCKCHAIN_HASH${NC}"
else
    echo -e "${RED}Error: Invalid memo format. Expected 'AdminNode1:<hash>'${NC}"
    exit 1
fi

# Compare hashes
echo ""
echo "Verification Results:"
echo "===================="
echo "Current Genesis Hash:  $CURRENT_HASH"
echo "Blockchain Hash:       $BLOCKCHAIN_HASH"

if [ "$CURRENT_HASH" = "$BLOCKCHAIN_HASH" ]; then
    echo -e "${GREEN}✅ VERIFICATION PASSED: Genesis hash matches blockchain anchor${NC}"

    # Log successful verification
    TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M")
    LOG_ENTRY=$(cat <<EOF
{
  "action": "genesis-anchor-verified",
  "file": "$GENESIS_FILE",
  "hash": "$CURRENT_HASH",
  "blockchain": "solana",
  "txSignature": "$EXPECTED_TX",
  "result": "passed",
  "timestamp": "$TIMESTAMP",
  "actor": "verify-anchor-script"
}
EOF
    )
    echo "$LOG_ENTRY" >> "$LOG_FILE"
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILED: Genesis hash does not match blockchain anchor${NC}"
    echo "This indicates the genesis file has been modified since anchoring."

    # Log failed verification
    TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M")
    LOG_ENTRY=$(cat <<EOF
{
  "action": "genesis-anchor-verified",
  "file": "$GENESIS_FILE",
  "currentHash": "$CURRENT_HASH",
  "blockchainHash": "$BLOCKCHAIN_HASH",
  "blockchain": "solana",
  "txSignature": "$EXPECTED_TX",
  "result": "failed",
  "timestamp": "$TIMESTAMP",
  "actor": "verify-anchor-script"
}
EOF
    )
    echo "$LOG_ENTRY" >> "$LOG_FILE"
    exit 1
fi
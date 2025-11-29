#!/bin/bash
# NeuroSwarm Contributor Onboarding Script (Unix/Linux/macOS)
# One-command setup: ./onboard.sh
# Time to complete: < 5 minutes

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║        🧠  NEUROSWARM CONTRIBUTOR ONBOARDING  🧠         ║"
echo "║                                                           ║"
echo "║            Zero-Setup Installation Script                ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Step 1: Check Docker
echo -e "${YELLOW}[1/5]${NC} Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found!${NC}"
    echo ""
    echo "Please install Docker first:"
    echo "  • macOS: https://docs.docker.com/desktop/install/mac-install/"
    echo "  • Linux: https://docs.docker.com/engine/install/"
    echo ""
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker daemon not running!${NC}"
    echo "Please start Docker Desktop or run: sudo systemctl start docker"
    exit 1
fi

echo -e "${GREEN}✓ Docker found and running${NC}"

# Step 2: Check Docker Compose
echo -e "${YELLOW}[2/5]${NC} Checking Docker Compose..."
if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ Docker Compose not found!${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose ready${NC}"

# Step 3: Parse options
PROFILE="core"
DETACH=""
REBUILD=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            PROFILE="full"
            shift
            ;;
        --detach|-d)
            DETACH="-d"
            shift
            ;;
        --rebuild)
            REBUILD="--build"
            shift
            ;;
        --help|-h)
            echo ""
            echo "Usage: ./onboard.sh [options]"
            echo ""
            echo "Options:"
            echo "  --full      Start all services (including NS-LLM and web UI)"
            echo "  --detach    Run in background (detached mode)"
            echo "  --rebuild   Force rebuild of Docker images"
            echo "  --help      Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./onboard.sh              # Start core nodes (NS, Gateway, VP, Admin)"
            echo "  ./onboard.sh --full       # Start all services including AI and web UI"
            echo "  ./onboard.sh --detach     # Run in background"
            echo "  ./onboard.sh --rebuild    # Force rebuild if code changed"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Step 4: Start NeuroSwarm
echo -e "${YELLOW}[3/5]${NC} Starting NeuroSwarm nodes..."
echo ""

if [ "$PROFILE" = "full" ]; then
    echo "🚀 Starting FULL stack (core nodes + NS-LLM + web UI)..."
    docker compose --profile full up $DETACH $REBUILD
else
    echo "🚀 Starting CORE nodes (NS, Gateway, VP, Admin)..."
    docker compose up $DETACH $REBUILD
fi

# If running in detached mode, show status
if [ -n "$DETACH" ]; then
    echo ""
    echo -e "${YELLOW}[4/5]${NC} Waiting for services to be healthy..."
    sleep 5
    
    # Check health status
    echo ""
    echo "Service Status:"
    docker compose ps
    
    echo ""
    echo -e "${YELLOW}[5/5]${NC} Verifying connectivity..."
    sleep 10
    
    # Test endpoints
    echo ""
    echo "Testing endpoints:"
    
    if curl -s -f http://localhost:3009/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} NS Node (Brain):      http://localhost:3009"
    else
        echo -e "  ${RED}✗${NC} NS Node (Brain):      http://localhost:3009 (not ready yet)"
    fi
    
    if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Gateway Node:         http://localhost:8080"
    else
        echo -e "  ${RED}✗${NC} Gateway Node:         http://localhost:8080 (not ready yet)"
    fi
    
    if curl -s -f http://localhost:3002/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} VP Node (Validator):  http://localhost:3002"
    else
        echo -e "  ${RED}✗${NC} VP Node (Validator):  http://localhost:3002 (not ready yet)"
    fi
    
    if curl -s -f http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Admin Node (Dashboard): http://localhost:3000"
    else
        echo -e "  ${RED}✗${NC} Admin Node (Dashboard): http://localhost:3000 (not ready yet)"
    fi
    
    if [ "$PROFILE" = "full" ]; then
        if curl -s -f http://localhost:3010/ > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} Web UI:               http://localhost:3010"
        else
            echo -e "  ${YELLOW}⏳${NC} Web UI:               http://localhost:3010 (starting...)"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}✅ NeuroSwarm is running!${NC}"
    echo ""
    echo "Next Steps:"
    echo "  • View logs:       docker compose logs -f"
    echo "  • Stop services:   docker compose down"
    echo "  • Restart:         docker compose restart"
    echo "  • Check status:    docker compose ps"
    echo ""
    echo "Dashboard: http://localhost:3000"
    echo "API Docs:  http://localhost:3009/api-docs"
    echo ""
    echo "Happy coding! 🚀"
else
    echo ""
    echo -e "${GREEN}✅ NeuroSwarm started in foreground mode${NC}"
    echo "Press Ctrl+C to stop all services"
fi

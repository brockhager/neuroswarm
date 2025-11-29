#!/bin/bash
# NeuroSwarm WordPress Publisher Setup Script

echo "🚀 Setting up NeuroSwarm WordPress Publisher"
echo "==========================================="

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed. Please install Python 3.7+ first."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed. Please install pip3 first."
    exit 1
fi

echo "✅ pip3 found"

# Install dependencies
echo "📦 Installing Python dependencies..."
#!/bin/bash
echo "This helper was moved to admin-node/scripts/setup_wp_publisher.sh"
echo "Run the admin setup helper there to keep admin python tooling grouped under admin-node."
echo "  bash admin-node/scripts/setup_wp_publisher.sh"
exit 2
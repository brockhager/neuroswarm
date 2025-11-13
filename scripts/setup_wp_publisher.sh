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
pip3 install -r requirements-wp.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p content
mkdir -p assets
mkdir -p logs

echo "✅ Directories created"

# Check for configuration file
if [ ! -f ".wp_publisher.env" ]; then
    echo "⚠️  Configuration file .wp_publisher.env not found"
    echo "   Please create it with your WordPress credentials:"
    echo "   "
    echo "   WP_SITE_URL=https://getblockchain.tech/neuroswarm/"
    echo "   WP_USERNAME=your_wordpress_username"
    echo "   WP_APP_PASSWORD=your_application_password"
    echo "   "
    echo "   See .wp_publisher.env.example for reference"
else
    echo "✅ Configuration file found"
fi

# Test connection if credentials are provided
if [ -f ".wp_publisher.env" ]; then
    echo "🔗 Testing WordPress connection..."
    # Load environment variables
    export $(cat .wp_publisher.env | xargs 2>/dev/null)

    if [ -n "$WP_USERNAME" ] && [ -n "$WP_APP_PASSWORD" ]; then
        python3 tests/test_connection.py --username "$WP_USERNAME" --password "$WP_APP_PASSWORD" --url "${WP_SITE_URL:-https://getblockchain.tech/neuroswarm/}"
        connection_test=$?
    else
        echo "⚠️  WordPress credentials not found in .wp_publisher.env"
        connection_test=1
    fi
else
    connection_test=1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Available commands:"
echo "  python3 scripts/wp_publisher.py --help          # Single file publishing"
echo "  python3 scripts/batch_publish.py --help         # Batch publishing"
echo "  python3 scripts/content_sync.py --help          # Auto-sync with watch mode"
echo "  python3 tests/test_connection.py --help       # Test WordPress connection"
echo ""
echo "Example usage:"
echo "  python3 scripts/wp_publisher.py --content example-content.json"
echo ""
echo "For more information, see WP_PUBLISHER_README.md"

if [ $connection_test -eq 0 ]; then
    echo ""
    echo "✅ WordPress connection test passed - you're ready to publish!"
else
    echo ""
    echo "⚠️  Please configure your WordPress credentials and test the connection"
    echo "   before publishing content."
fi
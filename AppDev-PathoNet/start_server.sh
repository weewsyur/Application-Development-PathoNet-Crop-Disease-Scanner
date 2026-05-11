#!/bin/bash
# PathoNet — Flask API Server Launcher
# Usage: bash start_server.sh
# Or make it executable: chmod +x start_server.sh && ./start_server.sh

echo "=============================================="
echo "  🌱 PathoNet AI Server"
echo "=============================================="
echo ""

# Check Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.8+"
    exit 1
fi

# Check dependencies
echo "→ Checking dependencies..."
python3 -c "import torch, flask, PIL" 2>/dev/null
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Missing dependencies. Installing..."
    pip3 install torch torchvision flask pillow requests --quiet
fi

echo "→ Starting Flask server..."
echo "→ Press Ctrl+C to stop"
echo ""

python3 run_api_server.py

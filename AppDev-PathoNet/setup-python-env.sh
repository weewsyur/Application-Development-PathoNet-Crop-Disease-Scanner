#!/bin/bash
# PathoNet Python Environment Setup Script
# Creates virtual environment and installs dependencies

echo "========================================"
echo "  PathoNet Python Environment Setup"
echo "========================================"
echo ""

# Check Python version
python3 --version
if [ $? -ne 0 ]; then
    echo "ERROR: Python3 not found"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

echo ""
echo "[1/3] Creating virtual environment..."
if [ -d ".venv" ]; then
    echo "Virtual environment already exists. Removing..."
    rm -rf .venv
fi
python3 -m venv .venv
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create virtual environment"
    exit 1
fi

echo ""
echo "[2/3] Activating virtual environment and installing dependencies..."
source .venv/bin/activate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to activate virtual environment"
    exit 1
fi

# Upgrade pip
python -m pip install --upgrade pip

# Install requirements
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo ""
echo "[3/3] Verifying installation..."
python -c "import numpy; import torch; import flask; print('All dependencies installed successfully!')"
if [ $? -ne 0 ]; then
    echo "ERROR: Dependency verification failed"
    exit 1
fi

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "To activate the virtual environment:"
echo "  source .venv/bin/activate"
echo ""
echo "To start the API server:"
echo "  python run_api_server.py"
echo ""
echo "To start with npm:"
echo "  npm start"
echo ""

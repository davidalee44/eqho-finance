#!/bin/bash

# Setup script for Eqho Data Validator
# Creates virtual environment and installs dependencies using uv

set -e

echo "🚀 Setting up Eqho Data Validator"
echo ""

# Check if we're in the backend directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd backend && ./setup_validator.sh"
    exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    echo "   Please install Python 3.9 or higher"
    exit 1
fi

echo "✓ Found Python 3"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "⚠️  uv not found. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

echo "✓ Found uv package manager"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# Install dependencies with uv
echo "📥 Installing backend dependencies..."
uv pip install -r requirements.txt

echo "📥 Installing validator dependencies..."
uv pip install -r validator_requirements.txt

echo "✓ All dependencies installed"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Copy .env.example to .env and configure your settings:"
    echo "   cp .env.example .env"
    echo ""
fi

# Make scripts executable
chmod +x data_validator.py
chmod +x quick_validate.py

echo "✅ Setup complete!"
echo ""
echo "📚 Usage:"
echo ""
echo "   1. Start the backend API (in another terminal):"
echo "      cd backend && uvicorn app.main:app --reload"
echo ""
echo "   2. Run the quick validator:"
echo "      source .venv/bin/activate"
echo "      python quick_validate.py"
echo ""
echo "   3. Or run the interactive TUI:"
echo "      python data_validator.py"
echo ""
echo "   Read VALIDATOR_README.md for detailed documentation"
echo ""


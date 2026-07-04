#!/bin/bash
# Hemp OS Python Microservice — Quick Start
# Requires: Python 3.11+, pip

set -e

echo "🔬 Hemp OS Python Scientific Microservice"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Install Python 3.11+ from python.org"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "✓ $PYTHON_VERSION"

# Install dependencies
echo ""
echo "Installing dependencies..."
pip3 install -r requirements.txt -q
echo "✓ Dependencies installed"

# Verify key libraries
python3 -c "
import importlib
libs = ['Bio', 'rdkit', 'scipy', 'fastapi', 'uvicorn']
for lib in libs:
    try:
        importlib.import_module(lib)
        print(f'  ✓ {lib}')
    except ImportError:
        print(f'  ✗ {lib} — NOT INSTALLED')
"

echo ""
echo "Starting server on http://localhost:8000 ..."
echo "API docs at http://localhost:8000/docs"
echo ""
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

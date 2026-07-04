#!/bin/bash
# Hemp OS — Full Stack Startup Script
# Starts: Node.js API server + Python scientific microservice

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              HEMP OS — SYSTEM STARTUP                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copy from .env.production:"
    echo "   cp .env.production .env"
    echo ""
    echo "Starting with default configuration..."
fi

# Start Python microservice (if available)
echo "🔬 Starting Python Scientific Microservice..."
if command -v python3 &> /dev/null; then
    cd python-microservice
    if pip install -r requirements.txt -q 2>/dev/null; then
        uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
        PYTHON_PID=$!
        echo "   ✓ Python microservice started (PID: $PYTHON_PID, port 8000)"
    else
        echo "   ⚠️  Python dependencies not installed. Run: pip install -r python-microservice/requirements.txt"
    fi
    cd ..
else
    echo "   ⚠️  Python not found. Install Python 3.11+ for scientific features."
fi

# Start Node.js API server
echo ""
echo "🌿 Starting Hemp OS API server..."
npx tsx server.ts &
NODE_PID=$!
echo "   ✓ Hemp OS started (PID: $NODE_PID, port ${PORT:-3100})"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    SYSTEM READY                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  API:       http://localhost:${PORT:-3100}"
echo "  Python:    http://localhost:8000 (if available)"
echo "  Health:    http://localhost:${PORT:-3100}/health"
echo "  Docs:      http://localhost:${PORT:-3100}/api/integration"
echo ""
echo "  Press Ctrl+C to stop all services"

trap "echo 'Shutting down...'; kill $NODE_PID $PYTHON_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait

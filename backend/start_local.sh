#!/bin/bash
# Local development server startup script

# Activate conda environment
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate maker

# Change to backend directory
cd "$(dirname "$0")"

# Check if port 8000 is already in use
PORT=8000
PID=$(lsof -ti:$PORT 2>/dev/null)

if [ ! -z "$PID" ]; then
    echo "⚠️  Port $PORT is already in use by process(es): $PID"
    echo "🔄 Killing existing process(es) on port $PORT..."
    kill -9 $PID 2>/dev/null
    sleep 1
    # Verify the port is free now
    if lsof -ti:$PORT >/dev/null 2>&1; then
        echo "❌ Failed to free port $PORT. Please manually kill the process(es)."
        exit 1
    fi
    echo "✅ Port $PORT is now free"
    echo ""
fi

# Initialize database if needed (idempotent)
echo "🔍 Checking database connection..."
python -m app.db.init_db

# Start FastAPI server
echo "🚀 Starting Backend server on http://localhost:8000"
echo "📚 API docs available at http://localhost:8000/docs"
echo ""
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload


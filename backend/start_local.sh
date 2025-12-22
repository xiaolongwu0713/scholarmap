#!/bin/bash
# Local development server startup script

# Activate conda environment
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate maker

# Change to backend directory
cd "$(dirname "$0")"

# Initialize database if needed (idempotent)
echo "🔍 Checking database connection..."
python -m app.db.init_db

# Start FastAPI server
echo "🚀 Starting Backend server on http://localhost:8000"
echo "📚 API docs available at http://localhost:8000/docs"
echo ""
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload


#!/bin/bash
# Local Frontend development server startup script

# Change to frontend directory
cd "$(dirname "$0")"

# Check if .env.local exists, if not create it with local settings
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local for local development..."
    cat > .env.local << EOF
# Local development environment variables
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieGlhb2xvbmd3dTIiLCJhIjoiY200bjczNDc4MDhsMTJqcXhiY2J1a243MiJ9.qTuRDiMLPxh1THNvHqxIzA
NODE_ENV=development
EOF
    echo "✅ Created .env.local"
fi

# Start Next.js development server
echo "🚀 Starting Frontend server on http://localhost:3000"
echo ""
npm run dev


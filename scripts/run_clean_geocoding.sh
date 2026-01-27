#!/bin/bash

# Clean invalid geocoding cache entries
# This script runs the SQL cleanup script

echo "🧹 Cleaning invalid geocoding cache entries..."
echo ""

# Get database connection info from .env or use defaults
if [ -f "../backend/.env" ]; then
    source ../backend/.env
fi

DB_NAME="${POSTGRES_DB:-scholarmap}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Run the SQL script
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f clean_invalid_geocoding.sql

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "These locations will be re-geocoded with country validation on next access."

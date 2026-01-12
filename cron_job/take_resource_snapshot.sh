#!/bin/bash

################################################################################
# Resource Snapshot Script for Cron
#
# This script:
# 1. Activates conda 'maker' environment
# 2. Runs Python snapshot script
# 3. Logs execution results
#
# Cron Setup:
#   Run `crontab -e` and add:
#   0 9 * * * /Users/xiaowu/local_code/scholarmap/scripts/take_resource_snapshot.sh
#
# This will run the snapshot daily at 09:00.
# If run multiple times on the same day, only the latest snapshot is kept.
################################################################################

# Exit on error
set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Log file
#LOG_DIR="$PROJECT_DIR/logs"
LOG_DIR="$PROJECT_DIR"
LOG_FILE="$LOG_DIR/resource_snapshot.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log start
echo "========================================" >> "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting resource snapshot cron job" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Activate conda environment
echo "Activating conda environment 'maker'..." >> "$LOG_FILE"
source "$HOME/opt/miniconda3/etc/profile.d/conda.sh" 2>> "$LOG_FILE"
conda activate maker >> "$LOG_FILE" 2>&1

# Change to project directory
cd "$PROJECT_DIR"

# Run Python snapshot script
echo "Running snapshot script..." >> "$LOG_FILE"
python scripts/take_resource_snapshot.py >> "$LOG_FILE" 2>&1

# Check exit status
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Snapshot completed successfully" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Snapshot failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

echo "========================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

exit $EXIT_CODE

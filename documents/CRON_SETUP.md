# Cron Setup for Resource Monitoring

This document explains how to set up the daily resource snapshot cron job.

## Overview

The system takes daily snapshots of database metrics (table row counts, disk sizes) at **09:00 every day**.

## Setup Instructions

### 1. Verify Scripts

Ensure the following files exist and are executable:

```bash
ls -l scripts/take_resource_snapshot.sh
ls -l scripts/take_resource_snapshot.py
```

If not executable, run:

```bash
chmod +x scripts/take_resource_snapshot.sh
```

### 2. Configure Cron

Edit your crontab:

```bash
crontab -e
```

Add the following line (replace with your actual path):

```cron
# Daily resource snapshot at 09:00
0 9 * * * /Users/xiaowu/local_code/scholarmap/scripts/take_resource_snapshot.sh
```

### 3. Verify Cron Entry

Check that the cron job was added:

```bash
crontab -l
```

You should see your new entry in the list.

### 4. Test Manually

Before waiting for the scheduled run, test the script manually:

```bash
cd /Users/xiaowu/local_code/scholarmap
./scripts/take_resource_snapshot.sh
```

Check the log file:

```bash
tail -f logs/resource_snapshot.log
```

## Log Files

Execution logs are stored in:

```
logs/resource_snapshot.log
```

Each execution appends to this file with timestamps.

## Troubleshooting

### Cron Job Not Running

1. **Check cron is running:**
   ```bash
   ps aux | grep cron
   ```

2. **Check system logs:**
   ```bash
   tail -f /var/log/system.log | grep cron
   ```

3. **Verify conda path:**
   Ensure the conda path in the script matches your installation:
   - Miniconda: `$HOME/miniconda3/etc/profile.d/conda.sh`
   - Anaconda: `$HOME/anaconda3/etc/profile.d/conda.sh`

### Database Connection Issues

1. **Check .env file:**
   Ensure `DATABASE_URL` is set in `.env` file

2. **Test database connection:**
   ```bash
   conda activate maker
   python backend/test_db_connection.py
   ```

### Script Fails

1. **Check log file:**
   ```bash
   cat logs/resource_snapshot.log
   ```

2. **Run script manually with verbose output:**
   ```bash
   bash -x scripts/take_resource_snapshot.sh
   ```

## Data Retention

- Snapshots are kept for **90 days** by default
- Old snapshots are automatically cleaned up (if cleanup task is configured)
- Only **one snapshot per day** is stored (UPSERT by date)

## Manual Snapshot

You can also trigger snapshots manually via the API (super user only):

```bash
curl -X POST http://localhost:8000/api/admin/resource-monitor/snapshot \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or click the "Refresh Resource Snapshot" button in the web UI (super user only).

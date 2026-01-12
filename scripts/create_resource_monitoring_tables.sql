-- Resource Monitoring Tables Migration
-- Create tables for resource monitoring and user activity tracking

-- 1. Resource Snapshots Table (for metrics 1-4)
-- Stores daily snapshots of database statistics
-- UNIQUE constraint on snapshot_date ensures only one snapshot per day
CREATE TABLE IF NOT EXISTS resource_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,  -- Date of snapshot (without time), ensures only one per day
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,  -- Actual execution time
    
    -- Metric 1: Table row counts
    users_count INTEGER NOT NULL DEFAULT 0,
    projects_count INTEGER NOT NULL DEFAULT 0,
    runs_count INTEGER NOT NULL DEFAULT 0,
    papers_count INTEGER NOT NULL DEFAULT 0,
    authorship_count INTEGER NOT NULL DEFAULT 0,
    run_papers_count INTEGER NOT NULL DEFAULT 0,
    affiliation_cache_count INTEGER NOT NULL DEFAULT 0,
    geocoding_cache_count INTEGER NOT NULL DEFAULT 0,
    institution_geo_count INTEGER NOT NULL DEFAULT 0,
    email_verification_codes_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metric 2: Disk space (MB)
    total_disk_size_mb FLOAT NOT NULL DEFAULT 0,
    users_disk_mb FLOAT NOT NULL DEFAULT 0,
    projects_disk_mb FLOAT NOT NULL DEFAULT 0,
    runs_disk_mb FLOAT NOT NULL DEFAULT 0,
    papers_disk_mb FLOAT NOT NULL DEFAULT 0,
    authorship_disk_mb FLOAT NOT NULL DEFAULT 0,
    run_papers_disk_mb FLOAT NOT NULL DEFAULT 0,
    affiliation_cache_disk_mb FLOAT NOT NULL DEFAULT 0,
    geocoding_cache_disk_mb FLOAT NOT NULL DEFAULT 0,
    institution_geo_disk_mb FLOAT NOT NULL DEFAULT 0,
    email_verification_codes_disk_mb FLOAT NOT NULL DEFAULT 0,
    
    -- Metric 3: Registered users (same as users_count)
    -- Metric 4: Total runs (same as runs_count)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_snapshot_date ON resource_snapshots(snapshot_date DESC);

-- 2. User Activity Table (for metric 5: online users)
-- Tracks last activity time for each user
CREATE TABLE IF NOT EXISTS user_activity (
    user_id VARCHAR(64) PRIMARY KEY,
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Index for efficient online user queries
CREATE INDEX IF NOT EXISTS idx_last_active ON user_activity(last_active_at DESC);

-- Comments for documentation
COMMENT ON TABLE resource_snapshots IS 'Daily snapshots of database resource usage (metrics 1-4)';
COMMENT ON TABLE user_activity IS 'User activity tracking for online user count (metric 5)';
COMMENT ON COLUMN resource_snapshots.snapshot_date IS 'Date of snapshot (unique per day)';
COMMENT ON COLUMN resource_snapshots.snapshot_time IS 'Actual time when snapshot was taken';
COMMENT ON COLUMN user_activity.last_active_at IS 'Last time user made an API request';

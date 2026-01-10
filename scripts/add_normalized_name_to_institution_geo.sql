-- Add normalized_name column to institution_geo table
-- This column stores the normalized version of primary_name for efficient matching

-- Step 1: Add normalized_name column (nullable initially)
ALTER TABLE institution_geo 
ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Step 2: Populate normalized_name for existing records
-- Note: This requires the normalize_text function from Python
-- We'll use a Python script to populate this column

-- Step 3: Make normalized_name NOT NULL after population
-- ALTER TABLE institution_geo ALTER COLUMN normalized_name SET NOT NULL;
-- (This will be done after populating all existing records)

-- Step 4: Create index on normalized_name for fast exact matching
CREATE INDEX IF NOT EXISTS idx_institution_normalized_name 
ON institution_geo (normalized_name);

-- Step 5: Update existing records to have normalized_name
-- This will be done by a Python script that calls normalize_text()
-- The Python script will:
-- 1. Read all records
-- 2. Generate normalized_name from primary_name
-- 3. Normalize aliases if they exist
-- 4. Update records

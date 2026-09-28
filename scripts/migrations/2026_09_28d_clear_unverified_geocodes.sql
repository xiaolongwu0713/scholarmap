DELETE FROM geocoding_cache
WHERE latitude IS NULL
  AND created_at < '2026-09-28T15:00:00+00:00'

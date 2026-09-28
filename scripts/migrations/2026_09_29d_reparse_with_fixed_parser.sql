DELETE FROM affiliation_cache WHERE created_at < '2026-09-29T01:00:00+00:00';
DELETE FROM institution_geo WHERE source = 'auto_added' AND created_at < '2026-09-29T01:00:00+00:00'

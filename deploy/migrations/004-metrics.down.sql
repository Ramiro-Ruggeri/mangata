-- Rollback of 004-metrics. Erases the visit counters; sales are not stored here.
BEGIN;

DO $$
BEGIN
  IF (SELECT value FROM commerce_meta WHERE key = 'schema_version') <> '4' THEN
    RAISE EXCEPTION 'expected schema_version 4';
  END IF;
END $$;

DROP TABLE metrics_daily;
UPDATE commerce_meta SET value = '3' WHERE key = 'schema_version';
COMMIT;

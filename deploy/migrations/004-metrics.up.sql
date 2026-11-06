-- Fase D: daily counters. No visitor identifier, IP or cookie: only "how many, per day".
-- Additive: the previous image ignores this table. Rollback: 004-metrics.down.sql.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF (SELECT value FROM commerce_meta WHERE key = 'schema_version') <> '3' THEN
    RAISE EXCEPTION 'expected schema_version 3';
  END IF;
END $$;

CREATE TABLE metrics_daily (
  day date NOT NULL,
  metric text NOT NULL,
  dimension text NOT NULL DEFAULT '',
  count bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric, dimension)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mangata_app') THEN
    GRANT SELECT, INSERT, UPDATE ON metrics_daily TO mangata_app;
  END IF;
END $$;

UPDATE commerce_meta SET value = '4' WHERE key = 'schema_version';
COMMIT;

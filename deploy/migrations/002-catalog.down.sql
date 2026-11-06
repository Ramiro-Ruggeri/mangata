-- Rollback of 002. Inventory, orders and payments are untouched, but edits made to descriptions,
-- photos, categories and order are lost: take a backup first if the panel is already in use.
-- Deploy the previous image before running this: the current code expects the table to exist.
BEGIN;

DO $$
BEGIN
  IF (SELECT value FROM commerce_meta WHERE key = 'schema_version') <> '2' THEN
    RAISE EXCEPTION 'expected schema_version 2';
  END IF;
END $$;

DROP TABLE catalog_products;
UPDATE commerce_meta SET value = '1' WHERE key = 'schema_version';
COMMIT;

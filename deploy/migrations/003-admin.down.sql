-- Rollback of 003-admin. The previous image does not need it: run only if the panel is abandoned.
-- Refuses when manual sales exist, because dropping them would erase a record of money.
-- Also erases the audit log, the stock history, costs, drafts' status and fulfillment notes.
BEGIN;

DO $$
BEGIN
  IF (SELECT value FROM commerce_meta WHERE key = 'schema_version') <> '3' THEN
    RAISE EXCEPTION 'expected schema_version 3';
  END IF;
  IF EXISTS (SELECT 1 FROM manual_sales) THEN
    RAISE EXCEPTION 'manual sales exist: export them before dropping this schema';
  END IF;
  IF EXISTS (SELECT 1 FROM catalog_products WHERE images::text LIKE '%/media/%') THEN
    RAISE EXCEPTION 'pieces use panel photos: dropping this schema would break them';
  END IF;
END $$;

DROP TRIGGER inventory_stock_movement ON inventory;
DROP FUNCTION record_stock_movement();
DROP SEQUENCE catalog_product_id_seq;
ALTER TABLE catalog_products DROP COLUMN cost_cents, DROP COLUMN is_draft;
ALTER TABLE orders DROP COLUMN fulfillment, DROP COLUMN internal_note;
DROP TRIGGER IF EXISTS inventory_notify ON inventory;
DROP TRIGGER IF EXISTS catalog_products_notify ON catalog_products;
DROP FUNCTION IF EXISTS notify_stock_change();
DROP TABLE IF EXISTS catalog_images;
DROP TABLE manual_sales, stock_movements, audit_log, admin_login_throttle, admin_sessions, admin_users;

UPDATE commerce_meta SET value = '2' WHERE key = 'schema_version';
COMMIT;

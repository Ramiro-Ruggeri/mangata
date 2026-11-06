-- Fase C: panel. Additive: existing rows keep their meaning and the current image ignores the new
-- objects, except the stock trigger, which only appends to its own ledger.
-- Run as the owner role with ON_ERROR_STOP. Rollback: 003-admin.down.sql.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF (SELECT value FROM commerce_meta WHERE key = 'schema_version') <> '2' THEN
    RAISE EXCEPTION 'expected schema_version 2';
  END IF;
END $$;

CREATE TABLE admin_users (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND position('@' IN email) > 1),
  password_hash text,
  totp_secret_enc text,
  totp_last_step bigint NOT NULL DEFAULT 0,
  recovery_hashes jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(recovery_hashes) = 'array'),
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  invite_hash text UNIQUE,
  invite_expires_at timestamptz,
  pending_password_hash text,
  pending_totp_enc text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- A session is revoked, never deleted: the application role has no DELETE.
CREATE TABLE admin_sessions (
  token_hash text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES admin_users(id),
  mfa_passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX admin_sessions_user_idx ON admin_sessions(user_id) WHERE revoked_at IS NULL;

CREATE TABLE admin_login_throttle (
  ip_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_id integer REFERENCES admin_users(id),
  actor_email text NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX audit_log_entity_idx ON audit_log(entity, entity_id, id DESC);

CREATE TABLE stock_movements (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  sku text NOT NULL REFERENCES inventory(sku),
  from_state text,
  to_state text NOT NULL,
  from_active boolean,
  to_active boolean NOT NULL,
  reference text,
  kind text NOT NULL,
  reason text,
  actor_id integer REFERENCES admin_users(id)
);
CREATE INDEX stock_movements_sku_idx ON stock_movements(sku, id DESC);

-- In the database, not the application: checkout, webhooks and any manual SQL leave a record too.
CREATE FUNCTION record_stock_movement() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.state = OLD.state AND NEW.active = OLD.active
    AND NEW.held_reference IS NOT DISTINCT FROM OLD.held_reference THEN
    RETURN NEW;
  END IF;
  INSERT INTO stock_movements(sku, from_state, to_state, from_active, to_active, reference, kind, reason, actor_id)
  VALUES (NEW.sku,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.state END, NEW.state,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.active END, NEW.active,
    COALESCE(NEW.held_reference, CASE WHEN TG_OP = 'UPDATE' THEN OLD.held_reference END),
    COALESCE(NULLIF(current_setting('mangata.kind', true), ''), 'sistema'),
    NULLIF(current_setting('mangata.reason', true), ''),
    NULLIF(current_setting('mangata.actor', true), '')::integer);
  RETURN NEW;
END $$;
CREATE TRIGGER inventory_stock_movement AFTER INSERT OR UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION record_stock_movement();

INSERT INTO stock_movements(sku, to_state, to_active, reference, kind)
  SELECT sku, state, active, held_reference, 'inicial' FROM inventory;

-- Tells open stores that something changed, whoever changed it: panel, checkout, webhook or manual SQL.
-- Delivered only on commit, so nobody sees a change that was rolled back.
CREATE FUNCTION notify_stock_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('mangata_stock', '');
  RETURN NULL;
END $$;
CREATE TRIGGER inventory_notify AFTER INSERT OR UPDATE ON inventory
  FOR EACH STATEMENT EXECUTE FUNCTION notify_stock_change();
CREATE TRIGGER catalog_products_notify AFTER INSERT OR UPDATE ON catalog_products
  FOR EACH STATEMENT EXECUTE FUNCTION notify_stock_change();

-- Transfer and WhatsApp sales. Kept apart from `orders`, which only holds provider-confirmed payments.
CREATE TABLE manual_sales (
  reference text PRIMARY KEY REFERENCES checkout_intents(reference),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  channel text NOT NULL CHECK (channel IN ('transferencia','whatsapp','efectivo','otro')),
  note text NOT NULL DEFAULT '',
  fulfillment text NOT NULL DEFAULT 'pendiente' CHECK (fulfillment IN ('pendiente','preparando','enviado','entregado')),
  created_by integer NOT NULL REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  voided_by integer REFERENCES admin_users(id),
  void_reason text
);

-- Separate from orders.status, which belongs to the payment lifecycle and to recorded().
ALTER TABLE orders
  ADD COLUMN fulfillment text NOT NULL DEFAULT 'pendiente' CHECK (fulfillment IN ('pendiente','preparando','enviado','entregado')),
  ADD COLUMN internal_note text NOT NULL DEFAULT '';

ALTER TABLE catalog_products
  ADD COLUMN cost_cents bigint CHECK (cost_cents IS NULL OR cost_cents >= 0),
  ADD COLUMN is_draft boolean NOT NULL DEFAULT false;

-- Photos uploaded from the panel. In the database so that the nightly dump backs them up.
CREATE TABLE catalog_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bytes bytea NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  created_by integer NOT NULL REFERENCES admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Above every id ever published, including the retired ones: a public URL is never recycled.
CREATE SEQUENCE catalog_product_id_seq START WITH 1000 MINVALUE 1000;

-- The default privileges of the owner would grant UPDATE on the new tables, so state them outright.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mangata_app') THEN
    GRANT SELECT, INSERT, UPDATE ON admin_users, admin_sessions, admin_login_throttle, manual_sales TO mangata_app;
    REVOKE ALL ON audit_log, stock_movements, catalog_images FROM mangata_app;
    GRANT SELECT, INSERT ON catalog_images TO mangata_app;
    GRANT SELECT, INSERT ON audit_log, stock_movements TO mangata_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mangata_app;
  END IF;
END $$;

UPDATE commerce_meta SET value = '3' WHERE key = 'schema_version';
COMMIT;

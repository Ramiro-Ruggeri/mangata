-- Private MANGATA database only. No destructive migration or automatic restocking.
CREATE TABLE IF NOT EXISTS checkout_intents (
  reference text PRIMARY KEY,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency = 'ARS'),
  items jsonb NOT NULL,
  status text NOT NULL DEFAULT 'reserved',
  expires_at timestamptz NOT NULL,
  preference_id text UNIQUE,
  payment_url text,
  approved_payment_id text UNIQUE,
  review_reason text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory (
  sku text PRIMARY KEY,
  name text NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents > 0),
  active boolean NOT NULL DEFAULT true,
  state text NOT NULL DEFAULT 'available' CHECK (state IN ('available','reserved','sold','review')),
  held_reference text REFERENCES checkout_intents(reference),
  CHECK ((state = 'available' AND held_reference IS NULL) OR (state <> 'available' AND held_reference IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS payments (
  payment_id text PRIMARY KEY,
  reference text NOT NULL REFERENCES checkout_intents(reference),
  status text NOT NULL,
  amount_cents bigint NOT NULL,
  currency text NOT NULL,
  provider_updated_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payment_events (
  payment_id text NOT NULL REFERENCES payments(payment_id),
  status text NOT NULL,
  provider_updated_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (payment_id, status, provider_updated_at)
);
CREATE TABLE IF NOT EXISTS orders (
  reference text PRIMARY KEY REFERENCES checkout_intents(reference),
  payment_id text UNIQUE NOT NULL REFERENCES payments(payment_id),
  amount_cents bigint NOT NULL,
  currency text NOT NULL,
  items jsonb NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkout_reconcile_idx ON checkout_intents(checked_at);
CREATE INDEX IF NOT EXISTS payments_reference_idx ON payments(reference);
CREATE TABLE IF NOT EXISTS commerce_meta (key text PRIMARY KEY, value text NOT NULL);
INSERT INTO commerce_meta(key,value) VALUES ('schema_version','1') ON CONFLICT DO NOTHING;

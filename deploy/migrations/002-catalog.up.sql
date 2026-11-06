-- Fase B: the catalog moves into the database. Additive: no existing table or row changes.
-- Name, price, active and stock state stay in `inventory`, the table every reservation already
-- locks, so a product can never show one price and charge another.
-- Run as the owner role with ON_ERROR_STOP. Rollback: 002-catalog.down.sql.
BEGIN;

DO $$
BEGIN
  IF (SELECT value FROM commerce_meta WHERE key = 'schema_version') <> '1' THEN
    RAISE EXCEPTION 'expected schema_version 1';
  END IF;
END $$;

CREATE TABLE catalog_products (
  id integer PRIMARY KEY CHECK (id > 0), -- public URL /producto/<id>; never recycled
  sku text NOT NULL UNIQUE REFERENCES inventory(sku),
  description text NOT NULL,
  category text NOT NULL CHECK (length(trim(category)) > 0),
  measurements jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(measurements) = 'array'),
  images jsonb NOT NULL CHECK (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) > 0),
  is_new boolean NOT NULL DEFAULT false,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_products_position_idx ON catalog_products(position, id);

-- No DELETE: a product is archived with inventory.active, so order history keeps its reference.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mangata_app') THEN
    GRANT SELECT, INSERT, UPDATE ON catalog_products TO mangata_app;
  END IF;
END $$;

UPDATE commerce_meta SET value = '2' WHERE key = 'schema_version';
COMMIT;

-- Complemento ao 001_initial.sql já aplicado no Supabase.
-- Preserva todos os registos e não altera public/auth.
BEGIN;
ALTER TABLE roadmesh.work_orders DROP CONSTRAINT work_orders_number_check;
ALTER TABLE roadmesh.work_orders ALTER COLUMN number TYPE text USING '#' || number::text;
ALTER TABLE roadmesh.work_orders ADD CONSTRAINT work_orders_number_check CHECK (number ~ '^#[0-9]+$');
-- Counters retain the API's stable key, while keeping workshop-local SQL keys.
ALTER TABLE roadmesh.counters ADD COLUMN id text UNIQUE;
ALTER TABLE roadmesh.media RENAME COLUMN storage_key TO storage_path;
ALTER TABLE roadmesh.media RENAME COLUMN size_bytes TO size;
ALTER TABLE roadmesh.media ALTER COLUMN storage_provider SET DEFAULT 'managed';
ALTER TABLE roadmesh.stock_movements RENAME COLUMN quantity TO delta;
-- Keep adjustment history after deleting an otherwise unused catalogue entry.
ALTER TABLE roadmesh.stock_movements ALTER COLUMN product_id DROP NOT NULL;
-- Keep fractional quantities and source unit prices without rounding them early.
-- Only computed financial totals are stored at cent precision.
ALTER TABLE roadmesh.products
  ALTER COLUMN stock TYPE numeric, ALTER COLUMN min_stock TYPE numeric,
  ALTER COLUMN purchase_price TYPE numeric, ALTER COLUMN sale_price TYPE numeric;
ALTER TABLE roadmesh.stock_movements ALTER COLUMN delta TYPE numeric, ALTER COLUMN balance TYPE numeric;
ALTER TABLE roadmesh.work_order_items ALTER COLUMN quantity TYPE numeric, ALTER COLUMN unit_price TYPE numeric;
ALTER TABLE roadmesh.quote_items ALTER COLUMN quantity TYPE numeric, ALTER COLUMN unit_price TYPE numeric;
ALTER TABLE roadmesh.purchase_order_items ALTER COLUMN unit_price TYPE numeric;

-- Metadata holds extensible API fields (appointment events, reference revisions,
-- stock source references). Business values and relationships remain SQL columns.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='roadmesh'
  LOOP
    EXECUTE format('ALTER TABLE roadmesh.%I ADD COLUMN metadata jsonb NOT NULL DEFAULT ''{}''::jsonb CHECK (jsonb_typeof(metadata) = ''object'')', t.tablename);
  END LOOP;
END;
$$;

DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT table_name,column_name FROM information_schema.columns
    WHERE table_schema='roadmesh' AND data_type='numeric'
  LOOP
    EXECUTE format('ALTER TABLE roadmesh.%I ADD CONSTRAINT %I CHECK (%I::text NOT IN (''NaN'',''Infinity'',''-Infinity''))', c.table_name, c.column_name || '_finite', c.column_name);
  END LOOP;
END;
$$;

-- Preserve the API's optimistic concurrency timestamp when explicitly supplied;
-- direct SQL edits still receive an automatically generated timestamp.
CREATE OR REPLACE FUNCTION roadmesh.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION roadmesh.touch_updated_at() FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON SCHEMA roadmesh IS 'RoadMesh PostgreSQL schema version 2; private server access';
COMMIT;

SELECT 'RoadMesh: complemento aplicado' AS resultado;

-- Additive migration; existing contracts and records are preserved.
BEGIN;
ALTER TABLE roadmesh.module_presets DROP CONSTRAINT module_presets_enabled_modules_check;
ALTER TABLE roadmesh.module_presets ADD CONSTRAINT module_presets_enabled_modules_check
 CHECK(jsonb_typeof(enabled_modules)='array' AND enabled_modules <@ '["customer_database","inventory","service_orders","vehicle_reception","customer_notifications","quotes","appointments","digital_inspections","technician_time","online_bookings","payments","invoicing","reports","technical_data","marketing","multi_location"]'::jsonb);
CREATE TABLE roadmesh.product_records (
 id uuid PRIMARY KEY,
 workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
 module text NOT NULL,
 title text NOT NULL,
 status text NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX product_records_tenant_module ON roadmesh.product_records(workshop_id,module,created_at DESC);
ALTER TABLE roadmesh.product_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON roadmesh.product_records FROM PUBLIC, anon, authenticated, service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='roadmesh_runtime') THEN
  GRANT SELECT, INSERT, UPDATE ON roadmesh.product_records TO roadmesh_runtime;
  CREATE POLICY roadmesh_server ON roadmesh.product_records FOR ALL TO roadmesh_runtime USING (true) WITH CHECK (true);
 END IF;
END $$;
COMMENT ON SCHEMA roadmesh IS 'RoadMesh PostgreSQL schema version 8; private server access';
COMMIT;

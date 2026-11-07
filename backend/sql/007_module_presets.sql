-- Additive; company capabilities and negotiated prices use workshops.metadata.
BEGIN;
CREATE TABLE roadmesh.module_presets (
 id uuid PRIMARY KEY,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 60),
 enabled_modules jsonb NOT NULL CHECK(jsonb_typeof(enabled_modules)='array' AND enabled_modules <@ '["customer_database","inventory","service_orders","vehicle_reception","customer_notifications"]'::jsonb),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES roadmesh.users(id),
 metadata jsonb NOT NULL DEFAULT '{}'
);
ALTER TABLE roadmesh.module_presets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON roadmesh.module_presets FROM PUBLIC, anon, authenticated, service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='roadmesh_runtime') THEN
  GRANT SELECT, INSERT, UPDATE ON roadmesh.module_presets TO roadmesh_runtime;
  CREATE POLICY roadmesh_server ON roadmesh.module_presets FOR ALL TO roadmesh_runtime USING (true) WITH CHECK (true);
 END IF;
END $$;
COMMENT ON SCHEMA roadmesh IS 'RoadMesh PostgreSQL schema version 7; private server access';
COMMIT;

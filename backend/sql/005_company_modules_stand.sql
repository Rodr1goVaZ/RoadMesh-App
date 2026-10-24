-- Apply after 003 (004 remains optional). Additive migration: no legacy data removal.
BEGIN;
ALTER TABLE roadmesh.workshops ADD COLUMN modules jsonb NOT NULL DEFAULT '["workshop"]'::jsonb;
UPDATE roadmesh.workshops SET modules=metadata->'modules'
 WHERE metadata->'modules' IN ('["workshop"]'::jsonb,'["stand"]'::jsonb,'["workshop","stand"]'::jsonb);
ALTER TABLE roadmesh.workshops ADD CONSTRAINT company_modules_valid
 CHECK(modules IN ('["workshop"]'::jsonb,'["stand"]'::jsonb,'["workshop","stand"]'::jsonb));

CREATE TABLE roadmesh.stand_inventory (
 id uuid PRIMARY KEY, workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
 vehicle_id uuid, license_plate text NOT NULL, plate_key text NOT NULL,
 make text NOT NULL, model text NOT NULL, year integer CHECK(year BETWEEN 1886 AND 2100),
 vin text, mileage integer CHECK(mileage>=0), fuel text, description text NOT NULL DEFAULT '',
 purchase_price numeric(14,2) NOT NULL CHECK(purchase_price>=0 AND purchase_price::text NOT IN ('NaN','Infinity','-Infinity')), asking_price numeric(14,2) NOT NULL CHECK(asking_price>=0 AND asking_price::text NOT IN ('NaN','Infinity','-Infinity')),
 status text NOT NULL DEFAULT 'disponivel' CHECK(status IN ('disponivel','reservado','vendido','retirado')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 metadata jsonb NOT NULL DEFAULT '{}', UNIQUE(workshop_id,id), UNIQUE(workshop_id,plate_key),
 FOREIGN KEY(workshop_id,vehicle_id) REFERENCES roadmesh.vehicles(workshop_id,id)
);
CREATE TABLE roadmesh.stand_leads (
 id uuid PRIMARY KEY, workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
 client_id uuid NOT NULL, inventory_id uuid,
 status text NOT NULL CHECK(status IN ('novo','contactado','interessado','fechado')),
 notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 metadata jsonb NOT NULL DEFAULT '{}',
 FOREIGN KEY(workshop_id,client_id) REFERENCES roadmesh.clients(workshop_id,id),
 FOREIGN KEY(workshop_id,inventory_id) REFERENCES roadmesh.stand_inventory(workshop_id,id)
);
CREATE TABLE roadmesh.stand_sales (
 id uuid PRIMARY KEY, workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
 inventory_id uuid NOT NULL, client_id uuid NOT NULL, vehicle_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES roadmesh.users(id),
 amount numeric(14,2) NOT NULL CHECK(amount>0 AND amount::text NOT IN ('NaN','Infinity','-Infinity')), purchase_price numeric(14,2) NOT NULL CHECK(purchase_price>=0 AND purchase_price::text NOT IN ('NaN','Infinity','-Infinity')),
 idempotency_key text NOT NULL, request_hash text NOT NULL, snapshot jsonb NOT NULL,
 notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}',
 UNIQUE(workshop_id,inventory_id), UNIQUE(workshop_id,idempotency_key),
 FOREIGN KEY(workshop_id,inventory_id) REFERENCES roadmesh.stand_inventory(workshop_id,id),
 FOREIGN KEY(workshop_id,client_id) REFERENCES roadmesh.clients(workshop_id,id),
 FOREIGN KEY(workshop_id,vehicle_id) REFERENCES roadmesh.vehicles(workshop_id,id)
);
CREATE INDEX stand_leads_company ON roadmesh.stand_leads(workshop_id,created_at DESC);
CREATE INDEX stand_sales_company ON roadmesh.stand_sales(workshop_id,created_at DESC);
CREATE TRIGGER immutable_stand_sales BEFORE UPDATE OR DELETE ON roadmesh.stand_sales
 FOR EACH ROW EXECUTE FUNCTION roadmesh.immutable_movement();
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['stand_inventory','stand_leads','stand_sales'] LOOP
  EXECUTE format('ALTER TABLE roadmesh.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('REVOKE ALL ON roadmesh.%I FROM PUBLIC,anon,authenticated,service_role',n);
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='roadmesh_runtime') THEN
   EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON roadmesh.%I TO roadmesh_runtime',n);
   EXECUTE format('CREATE POLICY roadmesh_server ON roadmesh.%I FOR ALL TO roadmesh_runtime USING (true) WITH CHECK (true)',n);
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='roadmesh_runtime') THEN
  REVOKE UPDATE,DELETE ON roadmesh.stand_sales FROM roadmesh_runtime;
 END IF;
END $$;
COMMENT ON SCHEMA roadmesh IS 'RoadMesh PostgreSQL schema version 5; private server access';
COMMIT;

-- Additive. Apply after 005 with a verified backup, first in staging.
-- Old monthly aggregates remain intact and are imported once on first write.
BEGIN;
DO $$ BEGIN
 IF obj_description('roadmesh'::regnamespace,'pg_namespace') <> 'RoadMesh PostgreSQL schema version 5; private server access' THEN
  RAISE EXCEPTION 'Expected RoadMesh schema 5';
 END IF;
END $$;
CREATE TABLE roadmesh.platform_service_periods (
 id uuid PRIMARY KEY,
 workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
 period text NOT NULL CHECK(period ~ '^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 metadata jsonb NOT NULL DEFAULT '{}',
 UNIQUE(workshop_id,period), UNIQUE(workshop_id,id)
);
CREATE TABLE roadmesh.platform_service_movements (
 id uuid PRIMARY KEY,
 workshop_id uuid NOT NULL,
 period_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES roadmesh.users(id),
 kind text NOT NULL CHECK(kind IN ('opening','billing_adjustment','payment','payment_reversal','assistance','assistance_reversal')),
 bucket text NOT NULL CHECK(bucket IN ('billed','received','hours_used')),
 amount numeric(14,2) NOT NULL CHECK(amount<>0 AND amount::text NOT IN ('NaN','Infinity','-Infinity')),
 occurred_on date,
 reference text NOT NULL DEFAULT '', method text NOT NULL DEFAULT '', note text NOT NULL,
 reverses_id uuid,
 idempotency_key text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 metadata jsonb NOT NULL DEFAULT '{}',
 UNIQUE(workshop_id,idempotency_key), UNIQUE(workshop_id,period_id,id), UNIQUE(reverses_id),
 FOREIGN KEY(workshop_id,period_id) REFERENCES roadmesh.platform_service_periods(workshop_id,id),
 FOREIGN KEY(workshop_id,period_id,reverses_id) REFERENCES roadmesh.platform_service_movements(workshop_id,period_id,id),
 CHECK ((kind IN ('payment_reversal','assistance_reversal'))=(reverses_id IS NOT NULL)),
 CHECK ((kind='billing_adjustment' AND bucket='billed') OR
        (kind='opening' AND amount>0) OR
        (kind='payment' AND bucket='received' AND amount>0) OR
        (kind='payment_reversal' AND bucket='received' AND amount<0) OR
        (kind='assistance' AND bucket='hours_used' AND amount>0) OR
        (kind='assistance_reversal' AND bucket='hours_used' AND amount<0)),
 CHECK (kind IN ('opening','billing_adjustment') OR (occurred_on IS NOT NULL AND length(trim(reference))>0 AND length(trim(note))>=5)),
 CHECK (kind<>'payment' OR length(trim(method))>0)
);
CREATE INDEX platform_movements_period ON roadmesh.platform_service_movements(workshop_id,period_id,created_at);
CREATE TRIGGER immutable_platform_movements BEFORE UPDATE OR DELETE ON roadmesh.platform_service_movements
 FOR EACH ROW EXECUTE FUNCTION roadmesh.immutable_movement();
CREATE TRIGGER immutable_platform_periods BEFORE UPDATE OR DELETE ON roadmesh.platform_service_periods
 FOR EACH ROW EXECUTE FUNCTION roadmesh.immutable_movement();
CREATE TRIGGER immutable_admin_audit BEFORE UPDATE OR DELETE ON roadmesh.admin_support_audit
 FOR EACH ROW EXECUTE FUNCTION roadmesh.immutable_movement();
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['platform_service_periods','platform_service_movements'] LOOP
  EXECUTE format('ALTER TABLE roadmesh.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('REVOKE ALL ON roadmesh.%I FROM PUBLIC,anon,authenticated,service_role',n);
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='roadmesh_runtime') THEN
   EXECUTE format('GRANT SELECT,INSERT ON roadmesh.%I TO roadmesh_runtime',n);
   EXECUTE format('CREATE POLICY roadmesh_server ON roadmesh.%I FOR ALL TO roadmesh_runtime USING (true) WITH CHECK (true)',n);
  END IF;
 END LOOP;
END $$;
COMMENT ON SCHEMA roadmesh IS 'RoadMesh PostgreSQL schema version 6; private server access';
COMMIT;

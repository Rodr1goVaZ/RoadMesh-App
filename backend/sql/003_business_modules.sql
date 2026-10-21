-- Adição de módulos. Executar numa cópia de staging antes de produção.
-- Os índices únicos falham se houver conflitos; nenhum duplicado é eliminado.
BEGIN;
ALTER TABLE roadmesh.purchase_orders DROP CONSTRAINT purchase_orders_status_check;
ALTER TABLE roadmesh.purchase_orders ADD CONSTRAINT purchase_orders_status_check
 CHECK(status IN ('rascunho','por_validar','pendente','parcial','recebida','cancelada'));

CREATE TABLE roadmesh.suppliers (
 id uuid PRIMARY KEY, workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
 name text NOT NULL, name_key text NOT NULL, nif text, phone text, email text, address text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 metadata jsonb NOT NULL DEFAULT '{}', UNIQUE(workshop_id,id), UNIQUE(workshop_id,name_key)
);
ALTER TABLE roadmesh.invoices ADD CONSTRAINT invoice_tenant_id UNIQUE(workshop_id,id);
CREATE TABLE roadmesh.financial_movements (
 id uuid PRIMARY KEY, workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
 work_order_id uuid NOT NULL, invoice_id uuid NOT NULL, client_id uuid NOT NULL,
 actor_id uuid REFERENCES roadmesh.users(id),
 kind text NOT NULL CHECK(kind IN ('charge','payment','payment_reversal','credit')),
 amount numeric NOT NULL CHECK(amount>0 AND amount::text NOT IN ('NaN','Infinity','-Infinity')),
 idempotency_key text NOT NULL, request_hash text NOT NULL, reverses_id uuid,
 method text, reason text, created_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}',
 UNIQUE(workshop_id,idempotency_key), UNIQUE(workshop_id,id),
 FOREIGN KEY(workshop_id,work_order_id) REFERENCES roadmesh.work_orders(workshop_id,id),
 FOREIGN KEY(workshop_id,invoice_id) REFERENCES roadmesh.invoices(workshop_id,id),
 FOREIGN KEY(workshop_id,client_id) REFERENCES roadmesh.clients(workshop_id,id),
 FOREIGN KEY(workshop_id,reverses_id) REFERENCES roadmesh.financial_movements(workshop_id,id)
);
CREATE UNIQUE INDEX one_charge_per_service ON roadmesh.financial_movements(workshop_id,work_order_id) WHERE kind='charge';
CREATE INDEX financial_history ON roadmesh.financial_movements(workshop_id,created_at DESC);
CREATE INDEX financial_service ON roadmesh.financial_movements(workshop_id,work_order_id);
CREATE TABLE roadmesh.order_receipts (
 id uuid PRIMARY KEY, workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
 purchase_order_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES roadmesh.users(id),
 idempotency_key text NOT NULL, request_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}',
 UNIQUE(workshop_id,idempotency_key),
 FOREIGN KEY(workshop_id,purchase_order_id) REFERENCES roadmesh.purchase_orders(workshop_id,id)
);
CREATE TABLE roadmesh.reorder_needs (
 id uuid PRIMARY KEY, workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id), product_id uuid NOT NULL,
 purchase_order_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}',
 UNIQUE(workshop_id,product_id), FOREIGN KEY(workshop_id,product_id) REFERENCES roadmesh.products(workshop_id,id),
 FOREIGN KEY(workshop_id,purchase_order_id) REFERENCES roadmesh.purchase_orders(workshop_id,id)
);
CREATE TABLE roadmesh.password_resets (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES roadmesh.users(id), workshop_id uuid,
 digest text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}'
);

-- Normalize legacy identifiers without merging/deleting any record.
UPDATE roadmesh.clients SET metadata=metadata || jsonb_build_object(
 'nif_key',NULLIF(regexp_replace(upper(COALESCE(nif,'')),'[^A-Z0-9]','','g'),''),
 'identity_key',jsonb_build_array(lower(regexp_replace(btrim(name),'\s+',' ','g')),lower(regexp_replace(btrim(COALESCE(nif,'')),'\s+',' ','g')),
 lower(regexp_replace(btrim(COALESCE(phone,'')),'\s+',' ','g')),lower(regexp_replace(btrim(COALESCE(email,'')),'\s+',' ','g')),lower(regexp_replace(btrim(COALESCE(address,'')),'\s+',' ','g')))::text);
UPDATE roadmesh.vehicles SET metadata=metadata || jsonb_build_object(
 'plate_key',NULLIF(regexp_replace(upper(license_plate),'[^A-Z0-9]','','g'),''),
 'vin_key',NULLIF(regexp_replace(upper(COALESCE(vin,'')),'[^A-Z0-9]','','g'),''));
UPDATE roadmesh.products SET metadata=metadata || jsonb_build_object(
 'reference_key',NULLIF(upper(regexp_replace(btrim(reference),'\s+',' ','g')),''),
 'supplier_key',lower(regexp_replace(btrim(COALESCE(supplier,'')),'\s+',' ','g')),
 'barcode_key',NULLIF(regexp_replace(upper(COALESCE(metadata->>'barcode','')),'[^A-Z0-9]','','g'),''));
INSERT INTO roadmesh.suppliers(id,workshop_id,name,name_key)
 SELECT gen_random_uuid(),workshop_id,min(btrim(supplier)),metadata->>'supplier_key' FROM roadmesh.products
 WHERE metadata->>'supplier_key'<>'' GROUP BY workshop_id,metadata->>'supplier_key';
CREATE UNIQUE INDEX client_nif_unique ON roadmesh.clients(workshop_id,(metadata->>'nif_key')) WHERE metadata->>'nif_key' IS NOT NULL;
CREATE UNIQUE INDEX client_identity_unique ON roadmesh.clients(workshop_id,(metadata->>'identity_key')) WHERE metadata->>'identity_key' IS NOT NULL;
CREATE UNIQUE INDEX vehicle_plate_unique ON roadmesh.vehicles(workshop_id,(metadata->>'plate_key')) WHERE metadata->>'plate_key' IS NOT NULL;
CREATE UNIQUE INDEX vehicle_vin_unique ON roadmesh.vehicles(workshop_id,(metadata->>'vin_key')) WHERE metadata->>'vin_key' IS NOT NULL;
CREATE UNIQUE INDEX product_reference_unique ON roadmesh.products(workshop_id,(metadata->>'reference_key')) WHERE metadata->>'reference_key' IS NOT NULL;
CREATE UNIQUE INDEX product_barcode_unique ON roadmesh.products(workshop_id,(metadata->>'barcode_key')) WHERE metadata->>'barcode_key' IS NOT NULL;
CREATE UNIQUE INDEX order_request_key_unique ON roadmesh.purchase_orders(workshop_id,(metadata->>'request_key')) WHERE metadata->>'request_key' IS NOT NULL;
CREATE UNIQUE INDEX one_supplier_draft ON roadmesh.purchase_orders(workshop_id,(metadata->>'supplier_key')) WHERE status IN ('rascunho','por_validar') AND metadata->>'supplier_key' IS NOT NULL;

CREATE FUNCTION roadmesh.immutable_movement() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Movimento imutável: utilizar um novo movimento de correção' USING ERRCODE='23514'; END; $$;
CREATE TRIGGER immutable_finance BEFORE UPDATE OR DELETE ON roadmesh.financial_movements FOR EACH ROW EXECUTE FUNCTION roadmesh.immutable_movement();
CREATE TRIGGER immutable_receipts BEFORE UPDATE OR DELETE ON roadmesh.order_receipts FOR EACH ROW EXECUTE FUNCTION roadmesh.immutable_movement();
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['suppliers','financial_movements','order_receipts','reorder_needs','password_resets'] LOOP
  EXECUTE format('ALTER TABLE roadmesh.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('REVOKE ALL ON roadmesh.%I FROM PUBLIC,anon,authenticated,service_role',n);
 END LOOP;
END; $$;
REVOKE EXECUTE ON FUNCTION roadmesh.immutable_movement() FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON SCHEMA roadmesh IS 'RoadMesh PostgreSQL schema version 3; private server access';
COMMIT;

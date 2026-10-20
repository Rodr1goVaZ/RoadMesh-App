-- RoadMesh: estrutura PostgreSQL inicial para futura adaptação do backend.
-- Executar no SQL Editor do Supabase como postgres.
-- Não apaga nem altera tabelas existentes em public ou auth.
-- Não liga automaticamente o backend MongoDB a PostgreSQL.
-- Acesso previsto: API FastAPI por ligação PostgreSQL privada no servidor.
-- Não adicionar roadmesh aos schemas expostos pela Data API.
-- Executar UMA VEZ. Se roadmesh já existir, a transação falha sem alterações.

BEGIN;
CREATE SCHEMA roadmesh;
REVOKE ALL ON SCHEMA roadmesh FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA roadmesh
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA roadmesh
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA roadmesh
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE roadmesh.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, nif text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '',
  email text, manager_name text, manager_email text, manager_id uuid,
  logo_media_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz
);

CREATE TABLE roadmesh.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
  name text NOT NULL, nif text, phone text, email text, address text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id,id)
);

-- Contas próprias do RoadMesh. Não são contas de auth.users.
-- As palavras-passe devem ser convertidas em hash bcrypt pelo backend.
CREATE TABLE roadmesh.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES roadmesh.workshops(id) DEFERRABLE INITIALLY DEFERRED,
  client_id uuid, name text NOT NULL, email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','workshop_staff','client')),
  is_active boolean NOT NULL DEFAULT true, is_manager boolean NOT NULL DEFAULT false,
  password_change_required boolean NOT NULL DEFAULT true,
  session_version bigint NOT NULL DEFAULT 0 CHECK (session_version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((role='admin' AND workshop_id IS NULL AND client_id IS NULL)
    OR (role='workshop_staff' AND workshop_id IS NOT NULL AND client_id IS NULL)
    OR (role='client' AND workshop_id IS NOT NULL AND client_id IS NOT NULL)),
  CHECK (NOT is_manager OR role='workshop_staff'),
  UNIQUE (workshop_id,id),
  FOREIGN KEY (workshop_id,client_id) REFERENCES roadmesh.clients(workshop_id,id)
);
CREATE UNIQUE INDEX users_email_unique ON roadmesh.users(lower(btrim(email)));
CREATE UNIQUE INDEX client_account_unique ON roadmesh.users(workshop_id,client_id) WHERE role='client';
ALTER TABLE roadmesh.workshops ADD CONSTRAINT workshop_manager_fk
  FOREIGN KEY (id,manager_id) REFERENCES roadmesh.users(workshop_id,id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE roadmesh.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  client_id uuid NOT NULL, license_plate text NOT NULL,
  make text NOT NULL, model text NOT NULL, year integer, vin text, fuel text,
  mileage integer CHECK (mileage >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id,id), UNIQUE (workshop_id,client_id,id),
  FOREIGN KEY (workshop_id,client_id) REFERENCES roadmesh.clients(workshop_id,id)
);

CREATE TABLE roadmesh.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
  reference text NOT NULL, name text NOT NULL, supplier text, category text,
  stock numeric(18,4) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock numeric(18,4) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  purchase_price numeric(18,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  sale_price numeric(18,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  vat_rate numeric(5,2) NOT NULL DEFAULT 23 CHECK (vat_rate BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id,id)
);

CREATE TABLE roadmesh.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  client_id uuid NOT NULL, vehicle_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL, scheduled_local text NOT NULL,
  description text NOT NULL, contact text NOT NULL,
  status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada','confirmada','cancelada','concluida')),
  suggested_at timestamptz, suggested_local text, suggestion_note text, note text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id,id),
  FOREIGN KEY (workshop_id,client_id,vehicle_id) REFERENCES roadmesh.vehicles(workshop_id,client_id,id)
);

CREATE TABLE roadmesh.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  client_id uuid NOT NULL, vehicle_id uuid NOT NULL, number text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviado','aceite','recusado')),
  notes text,
  subtotal numeric(18,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  vat numeric(18,2) NOT NULL DEFAULT 0 CHECK (vat >= 0),
  total numeric(18,2) NOT NULL DEFAULT 0 CHECK (total = subtotal + vat),
  -- Marcador permanente: não é FK para não desaparecer ao apagar uma OS.
  converted_work_order_id uuid, converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id,id), UNIQUE (workshop_id,number),
  FOREIGN KEY (workshop_id,client_id,vehicle_id) REFERENCES roadmesh.vehicles(workshop_id,client_id,id)
);

CREATE TABLE roadmesh.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  client_id uuid NOT NULL, vehicle_id uuid NOT NULL, number bigint NOT NULL CHECK (number > 0),
  quote_id uuid, mechanic text, complaint text, notes text,
  mileage_in integer CHECK (mileage_in >= 0),
  status text NOT NULL DEFAULT 'entrada' CHECK (status IN ('entrada','diagnostico','aguardando_pecas','concluido')),
  subtotal numeric(18,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  vat numeric(18,2) NOT NULL DEFAULT 0 CHECK (vat >= 0),
  total numeric(18,2) NOT NULL DEFAULT 0 CHECK (total = subtotal + vat),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id,id), UNIQUE (workshop_id,number), UNIQUE (workshop_id,quote_id),
  UNIQUE (workshop_id,vehicle_id,id),
  FOREIGN KEY (workshop_id,quote_id) REFERENCES roadmesh.quotes(workshop_id,id),
  FOREIGN KEY (workshop_id,client_id,vehicle_id) REFERENCES roadmesh.vehicles(workshop_id,client_id,id),
  CHECK ((status='concluido') = (completed_at IS NOT NULL))
);

CREATE TABLE roadmesh.work_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  work_order_id uuid NOT NULL, product_id uuid,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  item_type text NOT NULL CHECK (item_type IN ('peca','mao_de_obra')),
  description text NOT NULL,
  quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
  unit_price numeric(18,2) NOT NULL CHECK (unit_price >= 0),
  vat_rate numeric(5,2) NOT NULL DEFAULT 23 CHECK (vat_rate BETWEEN 0 AND 100),
  CHECK (product_id IS NULL OR item_type='peca'),
  FOREIGN KEY (workshop_id,work_order_id) REFERENCES roadmesh.work_orders(workshop_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id,product_id) REFERENCES roadmesh.products(workshop_id,id)
);

CREATE TABLE roadmesh.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  quote_id uuid NOT NULL, product_id uuid,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  item_type text NOT NULL CHECK (item_type IN ('peca','mao_de_obra')),
  description text NOT NULL,
  quantity numeric(18,4) NOT NULL CHECK (quantity > 0),
  unit_price numeric(18,2) NOT NULL CHECK (unit_price >= 0),
  vat_rate numeric(5,2) NOT NULL DEFAULT 23 CHECK (vat_rate BETWEEN 0 AND 100),
  CHECK (product_id IS NULL OR item_type='peca'),
  FOREIGN KEY (workshop_id,quote_id) REFERENCES roadmesh.quotes(workshop_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id,product_id) REFERENCES roadmesh.products(workshop_id,id)
);

CREATE TABLE roadmesh.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
  supplier text NOT NULL, notes text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','recebida')),
  total numeric(18,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id,id)
);
CREATE TABLE roadmesh.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  purchase_order_id uuid NOT NULL, product_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(18,2) NOT NULL CHECK (unit_price >= 0),
  vat_rate numeric(5,2) NOT NULL DEFAULT 23 CHECK (vat_rate BETWEEN 0 AND 100),
  description text,
  FOREIGN KEY (workshop_id,purchase_order_id) REFERENCES roadmesh.purchase_orders(workshop_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id,product_id) REFERENCES roadmesh.products(workshop_id,id)
);

CREATE TABLE roadmesh.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  product_id uuid NOT NULL, actor_id uuid, reason text NOT NULL,
  quantity numeric(18,4) NOT NULL,
  balance numeric(18,4) NOT NULL CHECK (balance >= 0),
  source_type text, source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workshop_id,product_id) REFERENCES roadmesh.products(workshop_id,id),
  FOREIGN KEY (actor_id) REFERENCES roadmesh.users(id)
);

CREATE TABLE roadmesh.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid REFERENCES roadmesh.workshops(id),
  owner_id uuid NOT NULL REFERENCES roadmesh.users(id),
  storage_provider text NOT NULL, storage_key text NOT NULL,
  content_type text NOT NULL, filename text,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id,id), UNIQUE (storage_provider,storage_key)
);
ALTER TABLE roadmesh.workshops ADD CONSTRAINT workshop_logo_fk
  FOREIGN KEY (logo_media_id) REFERENCES roadmesh.media(id);

CREATE TABLE roadmesh.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  vehicle_id uuid NOT NULL, work_order_id uuid, media_id uuid NOT NULL,
  zone text NOT NULL, caption text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id,vehicle_id,id),
  FOREIGN KEY (workshop_id,vehicle_id) REFERENCES roadmesh.vehicles(workshop_id,id),
  FOREIGN KEY (workshop_id,vehicle_id,work_order_id) REFERENCES roadmesh.work_orders(workshop_id,vehicle_id,id),
  FOREIGN KEY (workshop_id,media_id) REFERENCES roadmesh.media(workshop_id,id)
);
CREATE TABLE roadmesh.damages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  vehicle_id uuid NOT NULL, photo_id uuid, media_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('ferrugem','dano_estrutural','fuga','desgaste_pneu','risco','amolgadela','outro')),
  severity text NOT NULL CHECK (severity IN ('baixo','medio','critico')),
  description text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workshop_id,vehicle_id) REFERENCES roadmesh.vehicles(workshop_id,id),
  FOREIGN KEY (workshop_id,vehicle_id,photo_id) REFERENCES roadmesh.photos(workshop_id,vehicle_id,id),
  FOREIGN KEY (workshop_id,media_id) REFERENCES roadmesh.media(workshop_id,id)
);

CREATE TABLE roadmesh.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL,
  work_order_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('orcamento','fatura','fatura_recibo')),
  document_number text NOT NULL,
  total_labor numeric(18,2) NOT NULL DEFAULT 0 CHECK (total_labor >= 0),
  total_parts numeric(18,2) NOT NULL DEFAULT 0 CHECK (total_parts >= 0),
  subtotal numeric(18,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  vat numeric(18,2) NOT NULL DEFAULT 0 CHECK (vat >= 0),
  grand_total numeric(18,2) NOT NULL DEFAULT 0 CHECK (grand_total = subtotal + vat),
  snapshot jsonb NOT NULL, external_invoice_id text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id,document_number), UNIQUE (workshop_id,work_order_id,document_type),
  FOREIGN KEY (workshop_id,work_order_id) REFERENCES roadmesh.work_orders(workshop_id,id)
);

CREATE TABLE roadmesh.counters (
  workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
  kind text NOT NULL, sequence bigint NOT NULL DEFAULT 0 CHECK (sequence >= 0),
  PRIMARY KEY (workshop_id,kind)
);
CREATE TABLE roadmesh.revoked_sessions (
  jti text PRIMARY KEY, expires_at timestamptz NOT NULL
);
CREATE TABLE roadmesh.login_limits (
  key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL
);
CREATE TABLE roadmesh.support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), digest text NOT NULL UNIQUE,
  actor_id uuid NOT NULL REFERENCES roadmesh.users(id),
  workshop_id uuid NOT NULL REFERENCES roadmesh.workshops(id),
  reason text NOT NULL, expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE roadmesh.admin_support_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES roadmesh.users(id),
  workshop_id uuid REFERENCES roadmesh.workshops(id), action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clients_name_idx ON roadmesh.clients(workshop_id,name);
CREATE INDEX vehicles_client_idx ON roadmesh.vehicles(workshop_id,client_id);
CREATE INDEX work_orders_history_idx ON roadmesh.work_orders(workshop_id,vehicle_id,created_at DESC);
CREATE INDEX work_orders_client_idx ON roadmesh.work_orders(workshop_id,client_id);
CREATE INDEX appointments_calendar_idx ON roadmesh.appointments(workshop_id,scheduled_at);
CREATE INDEX appointments_client_idx ON roadmesh.appointments(workshop_id,client_id,scheduled_at);
CREATE INDEX products_name_idx ON roadmesh.products(workshop_id,name);
CREATE INDEX quotes_history_idx ON roadmesh.quotes(workshop_id,vehicle_id,created_at DESC);
CREATE INDEX quotes_client_idx ON roadmesh.quotes(workshop_id,client_id);
CREATE INDEX wo_items_parent_idx ON roadmesh.work_order_items(workshop_id,work_order_id,position);
CREATE INDEX quote_items_parent_idx ON roadmesh.quote_items(workshop_id,quote_id,position);
CREATE INDEX po_items_parent_idx ON roadmesh.purchase_order_items(workshop_id,purchase_order_id);
CREATE INDEX stock_history_idx ON roadmesh.stock_movements(workshop_id,product_id,created_at DESC);
CREATE INDEX photos_vehicle_idx ON roadmesh.photos(workshop_id,vehicle_id,created_at DESC);
CREATE INDEX damages_vehicle_idx ON roadmesh.damages(workshop_id,vehicle_id,created_at DESC);
CREATE INDEX invoices_date_idx ON roadmesh.invoices(workshop_id,created_at DESC);
CREATE INDEX revoked_expiry_idx ON roadmesh.revoked_sessions(expires_at);
CREATE INDEX login_limits_expiry_idx ON roadmesh.login_limits(expires_at);
CREATE INDEX support_expiry_idx ON roadmesh.support_sessions(expires_at);

-- Atualiza updated_at automaticamente nas tabelas que o possuem.
CREATE FUNCTION roadmesh.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
    WHERE table_schema='roadmesh' AND column_name='updated_at'
  LOOP
    EXECUTE format('CREATE TRIGGER touch_updated_at BEFORE UPDATE ON roadmesh.%I FOR EACH ROW EXECUTE FUNCTION roadmesh.touch_updated_at()', t.table_name);
  END LOOP;
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='roadmesh'
  LOOP
    EXECUTE format('ALTER TABLE roadmesh.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END;
$$;

-- Sem políticas de leitura/escrita para browsers: passam sempre pela API.
-- O proprietário das tabelas pode aceder; uma conta SQL dedicada para a API
-- e as suas políticas/permissões serão configuradas com a adaptação do backend.
REVOKE ALL ON ALL TABLES IN SCHEMA roadmesh FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA roadmesh FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA roadmesh FROM PUBLIC, anon, authenticated, service_role;

COMMIT;

-- Verificação: deve devolver 22 tabelas.
SELECT table_name FROM information_schema.tables
WHERE table_schema='roadmesh' AND table_type='BASE TABLE' ORDER BY table_name;

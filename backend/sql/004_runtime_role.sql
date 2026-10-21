-- OPCIONAL, após 003, como proprietário da base. Rever em staging primeiro.
-- Cria apenas um grupo SEM LOGIN. Não cria palavra-passe nem altera o utilizador da API.
-- Atribuir este grupo a um login exclusivo do backend criado em privado.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='roadmesh_runtime') THEN
  CREATE ROLE roadmesh_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
 END IF;
END $$;
GRANT USAGE ON SCHEMA roadmesh TO roadmesh_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA roadmesh TO roadmesh_runtime;
REVOKE UPDATE,DELETE ON roadmesh.financial_movements,roadmesh.order_receipts,roadmesh.admin_support_audit FROM roadmesh_runtime;
DO $$ DECLARE n text; BEGIN
 FOR n IN SELECT tablename FROM pg_tables WHERE schemaname='roadmesh' LOOP
  EXECUTE format('CREATE POLICY roadmesh_server ON roadmesh.%I FOR ALL TO roadmesh_runtime USING (true) WITH CHECK (true)',n);
 END LOOP;
END $$;
COMMIT;
-- Fora deste ficheiro, como administrador: GRANT roadmesh_runtime TO <login_backend>;
-- O login recebe acesso a todas as oficinas através da API; nunca o disponibilizar ao browser.
-- As contas públicas anon/authenticated/service_role continuam sem acesso ao esquema roadmesh.

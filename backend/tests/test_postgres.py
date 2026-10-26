"""SQL-specific isolation, rollback and relational persistence contracts."""
import os
import asyncio
import secrets
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import psycopg
import pytest
from psycopg import sql
from psycopg.rows import dict_row

from conftest import API, checked
from test_integrity import order_payload, product

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture
def pg():
    url = os.environ.get('ROADMESH_TEST_POSTGRES_URL')
    if not url or os.environ.get('ROADMESH_TEST_ALLOW_WRITE') != '1':
        pytest.skip('Requires the disposable PostgreSQL test runner')
    # Never use DATABASE_URL. Remote writes require the exact, separately confirmed staging project.
    from psycopg.conninfo import conninfo_to_dict
    host = conninfo_to_dict(url).get('host', '')
    options = conninfo_to_dict(url)
    staging = (os.environ.get('ROADMESH_TEST_STAGING_PROJECT') == 'deozdqnodbmqehkytzms'
        and host.endswith('.pooler.supabase.com')
        and options.get('user') == 'postgres.deozdqnodbmqehkytzms'
        and options.get('dbname') == 'postgres' and options.get('sslmode') == 'require')
    if host != '127.0.0.1' and not host.startswith('/tmp/roadmesh-pg-test-') and not staging:
        pytest.fail('PostgreSQL tests require an isolated local server')
    with psycopg.connect(url, autocommit=True, row_factory=dict_row, prepare_threshold=None,
            cursor_factory=psycopg.ClientCursor if os.environ.get('ROADMESH_TEST_EMBEDDED') == '1' else psycopg.Cursor) as conn:
        yield conn


@pytest.fixture(scope='module')
def pg_workshop(workshop_factory):
    return workshop_factory('TEST_PostgreSQL')


def test_private_tables_are_not_readable_by_supabase_browser_roles(pg):
    tables = pg.execute("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='roadmesh'").fetchall()
    assert len(tables) == 30
    assert all(t['rowsecurity'] for t in tables)
    for role in ('anon', 'authenticated'):
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            with pg.transaction():
                pg.execute(sql.SQL('SET LOCAL ROLE {}').format(sql.Identifier(role)))
                pg.execute('SELECT password_hash FROM roadmesh.users')


def test_sql_foreign_keys_prevent_cross_workshop_vehicle_link(pg, pg_workshop, workshop_factory):
    a = pg_workshop['session']
    b = workshop_factory('TEST_SQL_Tenant_B')
    client = checked(a.get(API+'/clients'))[0]
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        pg.execute("INSERT INTO roadmesh.vehicles(workshop_id,client_id,license_plate,make,model) VALUES (%s,%s,'BAD','Test','Test')",
            (b['user']['workshop_id'], client['id']))


def test_receipt_failure_rolls_back_all_sql_changes(pg, pg_workshop):
    s = pg_workshop['session']
    first, second = product(s), product(s)
    po = checked(s.post(API+'/purchase-orders', json={'supplier':'SQL Test', 'items':[
        {'product_id':p['id'],'quantity':3,'unit_price':10} for p in (first,second)]}),201)
    trigger = 'test_failure_' + uuid4().hex
    function = sql.Identifier('roadmesh', trigger)
    # Cause a real SQL failure after the first stock update, inside the transaction.
    pg.execute(sql.SQL("CREATE FUNCTION {}() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN IF NEW.product_id = {}::uuid AND NEW.reason = 'Entrada encomenda' THEN RAISE EXCEPTION 'test failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $body$").format(function, sql.Literal(second['id'])))
    pg.execute(sql.SQL('CREATE TRIGGER {} BEFORE INSERT ON roadmesh.stock_movements FOR EACH ROW EXECUTE FUNCTION {}()').format(sql.Identifier(trigger),function))
    try:
        response = s.post(f'{API}/purchase-orders/{po["id"]}/receive')
        assert response.status_code == 422, response.text
        assert checked(s.get(f'{API}/products/{first["id"]}'))['stock'] == 10
        assert pg.execute('SELECT status FROM roadmesh.purchase_orders WHERE id=%s',(po['id'],)).fetchone()['status'] == 'pendente'
        assert pg.execute("SELECT count(*) AS n FROM roadmesh.stock_movements WHERE metadata->>'purchase_order_id'=%s",(po['id'],)).fetchone()['n'] == 0
    finally:
        pg.execute(sql.SQL('DROP TRIGGER {} ON roadmesh.stock_movements').format(sql.Identifier(trigger)))
        pg.execute(sql.SQL('DROP FUNCTION {}()').format(function))
    checked(s.post(f'{API}/purchase-orders/{po["id"]}/receive'))
    assert checked(s.get(f'{API}/products/{first["id"]}'))['stock'] == 13


def test_previous_month_invoice_is_not_counted_again(pg, pg_workshop):
    s = pg_workshop['session']
    wo = checked(s.post(API+'/work-orders',json=order_payload(s,status='concluido')),201)
    before = checked(s.get(API+'/dashboard'))['kpis']['faturacao']
    invoice = checked(s.post(API+'/invoices',json={'work_order_id':wo['id'],'document_type':'fatura'}),201)
    previous = datetime.now(timezone.utc).replace(day=1) - timedelta(days=1)
    pg.execute('UPDATE roadmesh.invoices SET created_at=%s WHERE id=%s',(previous,invoice['id']))
    checked(s.post(API+'/invoices',json={'work_order_id':wo['id'],'document_type':'fatura_recibo'}),201)
    assert checked(s.get(API+'/dashboard'))['kpis']['faturacao'] == before


def test_work_order_lines_are_stored_relationally(pg, pg_workshop):
    s = pg_workshop['session']
    wo = checked(s.post(API+'/work-orders',json=order_payload(s)),201)
    row = pg.execute('SELECT description,quantity,unit_price,vat_rate FROM roadmesh.work_order_items WHERE work_order_id=%s',(wo['id'],)).fetchone()
    assert row['description'] == 'Service'
    assert row['quantity'] == 1
    assert row['unit_price'] == 10
    assert row['vat_rate'] == 23


def test_fractional_stock_and_unit_price_are_not_rounded_before_totals(pg, pg_workshop):
    s = pg_workshop['session']
    p = product(s, 0.00005)
    assert checked(s.get(f'{API}/products/{p["id"]}'))['stock'] == 0.00005
    payload = order_payload(s, [{'item_type':'mao_de_obra', 'description':'Precise price',
        'quantity':3, 'unit_price':1.005, 'vat_rate':0}])
    wo = checked(s.post(API+'/work-orders',json=payload),201)
    saved = checked(s.get(f'{API}/work-orders/{wo["id"]}'))
    assert saved['items'][0]['unit_price'] == 1.005
    assert saved['total'] == 3.02


def test_simultaneous_instance_bootstrap_creates_one_admin(pg, monkeypatch):
    from roadmesh.infrastructure.database.postgres import PostgresDatabase
    from roadmesh.core.access_control import Access
    email = f'bootstrap_{uuid4().hex}@test.pt'
    monkeypatch.setenv('BOOTSTRAP_ADMIN_EMAIL', email)
    monkeypatch.setenv('BOOTSTRAP_ADMIN_PASSWORD', secrets.token_urlsafe(24))
    async def start():
        databases = [PostgresDatabase(os.environ['ROADMESH_TEST_POSTGRES_URL']) for _ in range(2)]
        try:
            await asyncio.gather(*(db.initialize() for db in databases))
            await asyncio.gather(*(Access(db).bootstrap() for db in databases))
        finally:
            await asyncio.gather(*(db.close() for db in databases))
    asyncio.run(start())
    assert pg.execute('SELECT count(*) AS n FROM roadmesh.users WHERE email=%s',(email,)).fetchone()['n'] == 1


def test_failed_delete_audit_restores_order_and_stock_in_same_transaction(pg, pg_workshop):
    from test_integrity import part
    s = pg_workshop['session']
    p = product(s,10)
    body = order_payload(s,[part(p['id'],2)],status='diagnostico')
    wo = checked(s.post(API+'/work-orders',json=body),201)
    trigger = 'audit_failure_' + uuid4().hex
    function = sql.Identifier('roadmesh',trigger)
    pg.execute(sql.SQL("CREATE FUNCTION {}() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN IF NEW.metadata->>'resource' = {} AND NEW.action='work_order.deleted' THEN RAISE EXCEPTION 'test audit failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $body$").format(function,sql.Literal(wo['id'])))
    pg.execute(sql.SQL('CREATE TRIGGER {} BEFORE INSERT ON roadmesh.admin_support_audit FOR EACH ROW EXECUTE FUNCTION {}()').format(sql.Identifier(trigger),function))
    try:
        assert s.delete(f'{API}/work-orders/{wo["id"]}').status_code == 422
        assert checked(s.get(f'{API}/work-orders/{wo["id"]}'))['items'][0]['quantity'] == 2
        assert checked(s.get(f'{API}/products/{p["id"]}'))['stock'] == 8
    finally:
        pg.execute(sql.SQL('DROP TRIGGER {} ON roadmesh.admin_support_audit').format(sql.Identifier(trigger)))
        pg.execute(sql.SQL('DROP FUNCTION {}()').format(function))
    checked(s.delete(f'{API}/work-orders/{wo["id"]}'))
    assert checked(s.get(f'{API}/products/{p["id"]}'))['stock'] == 10
    audit = pg.execute("SELECT actor_id,details FROM roadmesh.admin_support_audit WHERE action='work_order.deleted' AND metadata->>'resource'=%s",(wo['id'],)).fetchone()
    assert str(audit['actor_id']) == pg_workshop['user']['id']
    assert audit['details']['snapshot']['id'] == wo['id']
    assert audit['details']['previous_status'] == 'diagnostico'


def test_recovery_token_single_use_expiry_and_session_revocation(pg,workshop_factory):
    import hashlib
    import requests
    from roadmesh.core.access_control import identifier
    s=workshop_factory('TEST_Recovery')['session']
    user=checked(s.get(API+'/auth/me'))
    token=secrets.token_urlsafe(48)
    version=pg.execute('SELECT session_version FROM roadmesh.users WHERE id=%s',(user['id'],)).fetchone()['session_version']
    for expired in (True,False):
        pg.execute("INSERT INTO roadmesh.password_resets(id,user_id,workshop_id,digest,expires_at,metadata) VALUES (%s,%s,%s,%s,%s,%s::jsonb)",
            (identifier(),user['id'],user['workshop_id'],hashlib.sha256(token.encode()).hexdigest(),
             datetime.now(timezone.utc)+timedelta(minutes=-1 if expired else 20),
             '{"session_version":'+str(version)+'}'))
        response=requests.post(API+'/auth/reset-password',json={'token':token,'new_password':'Updated-Test-Password-2026'})
        if expired:
            assert response.status_code==400,response.text
            pg.execute('DELETE FROM roadmesh.password_resets WHERE user_id=%s',(user['id'],))
        else:
            checked(response)
    assert requests.post(API+'/auth/reset-password',json={'token':token,'new_password':'Another-Test-Password-2026'}).status_code==400
    assert s.get(API+'/auth/me').status_code==401
    checked(requests.post(API+'/auth/staff/login',json={'email':user['email'],'password':'Updated-Test-Password-2026'}))
    checked(requests.post(API+'/auth/forgot-password',json={'email':user['email']}))
    unknown=checked(requests.post(API+'/auth/forgot-password',json={'email':'missing-'+secrets.token_hex(8)+'@example.pt'}))
    assert 'message' in unknown and 'token' not in unknown


def test_financial_and_receipt_history_is_immutable_in_sql(pg,pg_workshop):
    s=pg_workshop['session']
    wo=checked(s.post(API+'/work-orders',json=order_payload(s,status='concluido')),201)
    invoice=checked(s.post(API+'/invoices',json={'work_order_id':wo['id'],'document_type':'fatura'}),201)
    movement=checked(s.get(API+'/invoices/'+invoice['id']+'/balance'))['movements'][0]
    for command in ('UPDATE roadmesh.financial_movements SET amount=1 WHERE id=%s',
                    'DELETE FROM roadmesh.financial_movements WHERE id=%s'):
        with pytest.raises(psycopg.errors.CheckViolation):
            pg.execute(command,(movement['id'],))


def test_runtime_role_cannot_rewrite_financial_or_audit_history(pg):
    with pg.transaction():
        pg.execute('SET LOCAL ROLE roadmesh_runtime')
        assert pg.execute('SELECT count(*) FROM roadmesh.workshops').fetchone() is not None
    for table in ('financial_movements','order_receipts','admin_support_audit'):
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            with pg.transaction():
                pg.execute('SET LOCAL ROLE roadmesh_runtime')
                pg.execute(sql.SQL('DELETE FROM roadmesh.{} WHERE false').format(sql.Identifier(table)))

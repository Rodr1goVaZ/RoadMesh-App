"""Module access, shared identity, transactional sales and company isolation."""
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
import requests

from conftest import API, PASSWORD, checked
from test_postgres import pg as pg  # noqa: F401


@pytest.fixture
def company(platform_session):
    def create(modules=None):
        body = {'name': 'TEST_Company', 'manager_name': 'Manager', 'manager_email': f'{uuid4().hex}@test.pt'}
        if modules is not None:
            body['modules'] = modules
        data = checked(platform_session.post(API+'/admin/workshops', json=body), 201)
        auth = checked(requests.post(API+'/auth/login', json={'email': body['manager_email'], 'password': data['credentials']['temporary_password']}))
        s = requests.Session(); s.headers['Authorization'] = 'Bearer '+auth['access_token']
        auth = checked(s.post(API+'/auth/change-password', json={'current_password': data['credentials']['temporary_password'], 'new_password': PASSWORD}))
        s.headers['Authorization'] = 'Bearer '+auth['access_token']
        client = checked(s.post(API+'/clients', json={'name': 'Shared Buyer'}), 201)
        return {'session': s, 'user': auth['user'], 'company': data['workshop'], 'client': client, 'body': body}
    return create


def stock(s, **extra):
    return checked(s.post(API+'/stand/inventory', json={'license_plate': uuid4().hex[:10], 'make': 'BMW', 'model': '320d', 'purchase_price': 10000, 'asking_price': 15000, **extra}), 201)


@pytest.mark.parametrize('modules', [None, ['workshop'], ['stand'], ['workshop', 'stand']])
def test_company_modules_keep_one_login_and_gate_inactive_routes(company, modules):
    c = company(modules); s = c['session']; expected = modules or ['workshop']
    assert c['user']['role'] == 'workshop_staff' and c['user']['modules'] == expected
    assert s.get(API+'/dashboard').status_code == (200 if 'workshop' in expected else 403)
    assert s.get(API+'/products').status_code == (200 if 'workshop' in expected else 403)
    assert s.get(API+'/stand/dashboard').status_code == (200 if 'stand' in expected else 403)
    assert s.get(API+'/stand/inventory').status_code == (200 if 'stand' in expected else 403)
    assert checked(s.get(API+'/clients'))[0]['id'] == c['client']['id']


def test_module_configuration_validation_and_live_revocation(company, platform_session):
    c = company(['workshop', 'stand']); s = c['session']; wid = c['company']['id']
    for modules in ([], ['unknown'], ['stand', 'stand']):
        assert platform_session.put(API+'/admin/workshops/'+wid, json={**c['body'], 'modules': modules}).status_code == 422
    checked(platform_session.put(API+'/admin/workshops/'+wid, json={**c['body'], 'modules': ['workshop']}))
    # The original session remains valid, but direct API access is immediately denied.
    assert s.get(API+'/stand/dashboard').status_code == 403
    assert checked(s.get(API+'/auth/me'))['modules'] == ['workshop']
    assert s.get(API+'/dashboard').status_code == 200


def test_legacy_edit_does_not_disable_stand_and_plate_uniqueness(company, platform_session):
    c = company(['stand']); s = c['session']; wid = c['company']['id']
    checked(platform_session.put(API+'/admin/workshops/'+wid, json={key: value for key, value in c['body'].items() if key != 'modules'}))
    assert checked(s.get(API+'/auth/me'))['modules'] == ['stand']
    stock(s, license_plate='DUP-24-AA')
    assert s.post(API+'/stand/inventory', json={'license_plate': 'dup24aa', 'make': 'X', 'model': 'Y', 'purchase_price': 1, 'asking_price': 2}).status_code == 409


def test_company_isolation_for_inventory_leads_sales_and_shared_clients(company):
    a = company(['stand']); b = company(['stand']); s = a['session']; item = stock(s)
    assert b['session'].get(API+'/stand/inventory/'+item['id']).status_code == 404
    assert b['session'].put(API+'/stand/inventory/'+item['id'], json={'license_plate': item['license_plate'], 'make': 'X', 'model': 'Y', 'purchase_price': 1, 'asking_price': 2}).status_code == 404
    assert s.post(API+'/stand/leads', json={'client_id': b['client']['id'], 'inventory_id': item['id']}).status_code == 404
    assert s.post(API+'/stand/sales', json={'client_id': b['client']['id'], 'inventory_id': item['id'], 'amount': 12000, 'idempotency_key': str(uuid4())}).status_code == 404
    assert checked(s.get(API+'/stand/inventory/'+item['id']))['status'] == 'disponivel'
    assert len(checked(b['session'].get(API+'/stand/sales'))) == 0


def test_sale_is_idempotent_and_shared_vehicle_can_receive_workshop_service(company):
    c = company(['workshop', 'stand']); s = c['session']; item = stock(s)
    lead = checked(s.post(API+'/stand/leads', json={'client_id': c['client']['id'], 'inventory_id': item['id'], 'notes': 'Interested'}), 201)
    assert checked(s.get(API+'/stand/leads'))[0]['client_name'] == 'Shared Buyer'
    payload = {'client_id': c['client']['id'], 'inventory_id': item['id'], 'amount': 13000, 'idempotency_key': str(uuid4())}
    first = checked(s.post(API+'/stand/sales', json=payload), 201)
    again = checked(s.post(API+'/stand/sales', json=payload), 201)
    assert again['id'] == first['id']
    assert len(checked(s.get(API+'/stand/sales'))) == 1
    assert s.post(API+'/stand/sales', json={**payload, 'amount': 14000}).status_code == 409
    assert s.post(API+'/stand/sales', json={**payload, 'idempotency_key': str(uuid4())}).status_code == 409
    vehicle = checked(s.get(API+'/vehicles/'+first['vehicle_id']))
    assert vehicle['client_id'] == c['client']['id'] and vehicle['license_plate'] == item['license_plate']
    order = checked(s.post(API+'/work-orders', json={'client_id': c['client']['id'], 'vehicle_id': vehicle['id'], 'complaint': 'Service after purchase', 'items': []}), 201)
    assert order['vehicle_id'] == vehicle['id']
    assert checked(s.get(API+'/stand/leads'))[0]['status'] == 'fechado'
    dash = checked(s.get(API+'/stand/dashboard')); assert dash['sales_total'] == 13000 and dash['margin_total'] == 3000
    assert any(r['action'] == 'stand.sale.created' for r in checked(s.get(API+'/stand/history')))
    assert s.delete(API+'/clients/'+c['client']['id']).status_code == 409
    assert s.delete(API+'/vehicles/'+vehicle['id']).status_code == 409


def test_concurrent_sale_creates_exactly_one_transaction(company):
    c = company(['stand']); item = stock(c['session'])
    def sell(_):
        return requests.post(API+'/stand/sales', headers=dict(c['session'].headers), json={'client_id': c['client']['id'], 'inventory_id': item['id'], 'amount': 13000, 'idempotency_key': str(uuid4())}, timeout=30)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(sell, range(2)))
    assert sorted(r.status_code for r in responses) == [201, 409]
    assert len(checked(c['session'].get(API+'/stand/sales'))) == 1


def test_staff_cannot_change_prices_sell_or_read_purchase_cost(company, platform_session):
    c = company(['stand']); item = stock(c['session']); wid = c['company']['id']
    data = checked(platform_session.post(API+f'/admin/workshops/{wid}/staff', json={'name': 'Employee', 'email': f'{uuid4().hex}@test.pt'}), 201)
    auth = checked(requests.post(API+'/auth/login', json={'email': data['credentials']['email'], 'password': data['credentials']['temporary_password']}))
    s = requests.Session(); s.headers['Authorization'] = 'Bearer '+auth['access_token']
    auth = checked(s.post(API+'/auth/change-password', json={'current_password': data['credentials']['temporary_password'], 'new_password': PASSWORD})); s.headers['Authorization'] = 'Bearer '+auth['access_token']
    assert 'purchase_price' not in checked(s.get(API+'/stand/inventory/'+item['id']))
    assert 'sales_total' not in checked(s.get(API+'/stand/dashboard'))
    assert s.get(API+'/stand/sales').status_code == 403
    assert s.get(API+'/stand/history').status_code == 403
    assert s.post(API+'/stand/inventory', json={'license_plate': 'XX-22-YY', 'make': 'X', 'model': 'Y', 'purchase_price': 1, 'asking_price': 2}).status_code == 403
    assert s.post(API+'/stand/sales', json={'client_id': c['client']['id'], 'inventory_id': item['id'], 'amount': 1, 'idempotency_key': str(uuid4())}).status_code == 403
    checked(s.post(API+'/stand/leads', json={'client_id': c['client']['id'], 'inventory_id': item['id']}), 201)


def test_database_sales_immutable_and_cross_company_foreign_keys(pg, company):
    import psycopg
    c = company(['stand']); s = c['session']; item = stock(s)
    sale = checked(s.post(API+'/stand/sales', json={'client_id': c['client']['id'], 'inventory_id': item['id'], 'amount': 12000, 'idempotency_key': str(uuid4())}), 201)
    with pytest.raises(psycopg.errors.CheckViolation):
        pg.execute('UPDATE roadmesh.stand_sales SET amount=1 WHERE id=%s', (sale['id'],))
    b = company(['stand'])
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        pg.execute('UPDATE roadmesh.stand_inventory SET vehicle_id=%s WHERE id=%s', (sale['vehicle_id'], stock(b['session'])['id']))


def test_version5_snapshot_can_be_restored_locally(pg, company, tmp_path):
    import json
    import os
    import sys
    from pathlib import Path
    from psycopg import sql
    runtime = os.environ.get('ROADMESH_TEST_PGLITE_RUNTIME')
    if not runtime:
        pytest.skip('The standalone restore verifier requires the supplied PGlite runtime')
    c = company(['stand']); item = stock(c['session'])
    checked(c['session'].post(API+'/stand/sales', json={'client_id': c['client']['id'], 'inventory_id': item['id'], 'amount': 12000, 'idempotency_key': str(uuid4())}), 201)
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
    from backup_staging import TABLES
    from verify_staging_backup import verify
    tables = TABLES + ['stand_inventory', 'stand_leads', 'stand_sales']
    pairs = []
    for name in tables:
        pairs.extend([sql.Literal(name), sql.SQL("(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM roadmesh.{} t)").format(sql.Identifier(name))])
    raw = pg.execute(sql.SQL("""WITH snapshot AS (SELECT jsonb_build_object({}) AS tables)
      SELECT jsonb_build_object('format','roadmesh-snapshot-v1','timezone',current_setting('TimeZone'),
       'schema_version',obj_description('roadmesh'::regnamespace,'pg_namespace'),'tables',tables,
       'counts',(SELECT jsonb_object_agg(key,jsonb_array_length(value)) FROM jsonb_each(tables)))::text AS raw
      FROM snapshot""").format(sql.SQL(',').join(pairs))).fetchone()['raw']
    path = tmp_path / 'disposable-snapshot.json'
    path.write_text(raw)
    report_path = tmp_path / 'restore-report.json'
    assert verify(path, Path(runtime), report_path=report_path) == 0
    assert json.loads(report_path.read_text())['tables'] == 30

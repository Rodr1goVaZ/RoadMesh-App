"""Platform ledger: immutable history, retries, reversals and tenant boundaries."""
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from uuid import uuid4

import psycopg
import pytest
import requests
from psycopg import sql

from conftest import API, checked
from test_postgres import pg as pg  # noqa: F401


@pytest.fixture
def ledger_company(platform_session):
    result = checked(platform_session.post(API+'/admin/workshops', json={
        'name': 'TEST_Ledger', 'manager_name': 'Ledger Manager', 'manager_email': f'{uuid4().hex}@example.pt'}), 201)
    wid = result['workshop']['id']
    url = API+f'/admin/workshops/{wid}/service-months/2026/11'
    body = {'billed': 200, 'received': 0, 'hours_included': 10, 'hours_used': 0, 'revision': 0, 'note': 'Avença mensal de teste'}
    checked(platform_session.put(url, json=body))
    return wid, url, body


def movement(**values):
    return {'kind': 'payment', 'amount': '25.50', 'occurred_on': '2026-11-01',
            'reference': 'Transferência TEST', 'method': 'transferência',
            'note': 'Recebimento de teste', 'idempotency_key': str(uuid4()), **values}


def test_payment_replay_assistance_and_full_reversals(platform_session, ledger_company):
    _, url, _ = ledger_company
    body = movement()
    first = checked(platform_session.post(url+'/movements', json=body), 201)
    second = checked(platform_session.post(url+'/movements', json=body), 201)
    assert first['movement']['id'] == second['movement']['id'] and second['replayed']
    assert first['record']['received'] == '25.50'
    assert platform_session.post(url+'/movements', json={**body, 'amount': 30}).status_code == 409
    aid = checked(platform_session.post(url+'/movements', json=movement(kind='assistance', amount='1.25', method='')), 201)
    assert aid['record']['hours_used'] == '1.25'
    reverse = movement(kind='payment_reversal', reverses_id=first['movement']['id'])
    result = checked(platform_session.post(url+'/movements', json=reverse), 201)
    assert result['record']['received'] == '0.00'
    assert platform_session.post(url+'/movements', json={**reverse, 'idempotency_key': str(uuid4())}).status_code == 409
    checked(platform_session.post(url+'/movements', json=movement(kind='assistance_reversal', amount='1.25', reverses_id=aid['movement']['id'])), 201)
    entries = checked(platform_session.get(url+'/movements'))['movements']
    assert len(entries) == 5  # invoice amount + payment + assistance + both reversals
    assert len({entry['id'] for entry in entries}) == 5
    assert all(entry['actor_id'] and entry['created_at'] for entry in entries)


def test_cannot_overpay_or_replace_receipt_total(platform_session, ledger_company):
    _, url, body = ledger_company
    assert platform_session.post(url+'/movements', json=movement(amount=201)).status_code == 409
    assert len(checked(platform_session.get(url+'/movements'))['movements']) == 1
    assert platform_session.put(url, json={**body, 'received': 100, 'revision': 1}).status_code == 409
    assert platform_session.put(url, json={**body, 'hours_used': 2, 'revision': 1}).status_code == 409
    assert platform_session.put(url, json={**body, 'billed': 250, 'revision': 1, 'note': ''}).status_code == 422
    updated=checked(platform_session.put(url, json={**body, 'billed': 250, 'revision': 1, 'note': 'Ajuste contratual aprovado'}))
    assert Decimal(updated['record']['billed'])==250


@pytest.mark.parametrize('change', [
    {'occurred_on': None}, {'occurred_on': '2026-02-31'}, {'amount': 0},
    {'amount': 'NaN'}, {'amount': '1.001'}, {'reference': ' '}, {'method': ' '},
    {'note': '    '}, {'reverses_id': str(uuid4())},
])
def test_invalid_movements_rejected(platform_session, ledger_company, change):
    assert platform_session.post(ledger_company[1]+'/movements', json=movement(**change)).status_code == 422


def test_other_roles_and_foreign_reversals_are_rejected(platform_session, ledger_company, session_a):
    _, url, _ = ledger_company
    assert session_a['session'].get(url+'/movements').status_code == 403
    assert session_a['session'].post(url+'/movements', json=movement()).status_code == 403
    original = checked(platform_session.post(url+'/movements', json=movement()), 201)['movement']
    other = checked(platform_session.post(API+'/admin/workshops', json={'name':'TEST_Other', 'manager_name':'Other', 'manager_email':f'{uuid4().hex}@example.pt'}),201)['workshop']
    other_url = API+f'/admin/workshops/{other["id"]}/service-months/2026/11'
    checked(platform_session.put(other_url, json={'billed':200,'received':0,'hours_included':0,'hours_used':0}))
    assert platform_session.post(other_url+'/movements', json=movement(kind='payment_reversal', reverses_id=original['id'])).status_code == 409
    assert platform_session.post(url+'/movements', json=movement(kind='payment_reversal', reverses_id=original['id'], amount=1)).status_code == 409


def test_simultaneous_retry_adds_one_payment(platform_session, ledger_company):
    _, url, _ = ledger_company
    body = movement()
    def send(_):
        return requests.post(url+'/movements', json=body, headers=dict(platform_session.headers), timeout=30)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(send, range(2)))
    assert [response.status_code for response in results] == [201, 201]
    entries = checked(platform_session.get(url+'/movements'))['movements']
    assert len([entry for entry in entries if entry['kind'] == 'payment']) == 1


def test_legacy_balances_import_once_without_fabricating_dates(platform_session):
    result = checked(platform_session.post(API+'/admin/workshops', json={'name':'TEST_Opening', 'manager_name':'Opening', 'manager_email':f'{uuid4().hex}@example.pt'}),201)
    url=API+f'/admin/workshops/{result["workshop"]["id"]}/service-months/2026/10'
    body={'billed':200,'received':50,'hours_included':10,'hours_used':2}
    checked(platform_session.put(url, json=body))
    checked(platform_session.put(url, json={**body,'revision':1}))
    entries=checked(platform_session.get(url+'/movements'))['movements']
    assert len(entries)==3
    assert all(entry['occurred_on'] is None for entry in entries)
    assert {entry['bucket'] for entry in entries if entry['kind']=='opening'}=={'received','hours_used'}


def test_sql_ledger_and_audit_are_immutable(pg, platform_session, ledger_company):
    _, url, _ = ledger_company
    row=checked(platform_session.post(url+'/movements',json=movement()),201)['movement']
    for table in ('platform_service_movements','platform_service_periods','admin_support_audit'):
        for command in ('UPDATE roadmesh.{} SET metadata=metadata WHERE workshop_id=%s','DELETE FROM roadmesh.{} WHERE workshop_id=%s'):
            with pytest.raises(psycopg.errors.CheckViolation):
                pg.execute(sql.SQL(command).format(sql.Identifier(table)), (row['workshop_id'],))


def test_sql_audit_failure_rolls_back_movement_and_projection(pg, platform_session, ledger_company):
    wid,url,_=ledger_company
    function='ledger_fail_'+uuid4().hex
    trigger='ledger_fail_'+uuid4().hex
    pg.execute(sql.SQL("CREATE FUNCTION roadmesh.{}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.workshop_id={}::uuid AND NEW.action='platform.service_movement.created' THEN RAISE EXCEPTION 'isolated test rollback'; END IF; RETURN NEW; END $$").format(sql.Identifier(function),sql.Literal(wid)))
    pg.execute(sql.SQL('CREATE TRIGGER {} BEFORE INSERT ON roadmesh.admin_support_audit FOR EACH ROW EXECUTE FUNCTION roadmesh.{}()').format(sql.Identifier(trigger),sql.Identifier(function)))
    try:
        response=platform_session.post(url+'/movements',json=movement())
        assert response.status_code==500
        assert len(checked(platform_session.get(url+'/movements'))['movements'])==1
        company=checked(platform_session.get(API+'/admin/workshops/'+wid))
        assert Decimal(str(company['platform_service_months']['2026-11']['received']))==0
    finally:
        pg.execute(sql.SQL('DROP TRIGGER {} ON roadmesh.admin_support_audit').format(sql.Identifier(trigger)))
        pg.execute(sql.SQL('DROP FUNCTION roadmesh.{}()').format(sql.Identifier(function)))


def test_metadata_only_legacy_month_is_imported_once_on_first_payment(pg, platform_session, ledger_company):
    import json
    wid,url,_=ledger_company
    # Simulate a genuine schema-5 aggregate, with no normalized period yet.
    old={'billed':'200','received':'40','hours_included':'10','hours_used':'2','revision':1,'due_date':None,'note':'Anterior'}
    pg.execute("UPDATE roadmesh.workshops SET metadata=jsonb_set(metadata,'{platform_service_months,2026-10}',%s::jsonb) WHERE id=%s",(json.dumps(old),wid))
    old_url=url.replace('/2026/11','/2026/10')
    assert checked(platform_session.get(old_url+'/movements'))['legacy_unimported']
    body=movement(amount=10)
    first=checked(platform_session.post(old_url+'/movements',json=body),201)
    assert Decimal(first['record']['received'])==50
    checked(platform_session.post(old_url+'/movements',json=body),201)
    entries=checked(platform_session.get(old_url+'/movements'))['movements']
    openings=[entry for entry in entries if entry['kind']=='opening']
    assert len(openings)==3 and all(entry['occurred_on'] is None for entry in openings)
    original=next(entry for entry in openings if entry['bucket']=='received')
    result=checked(platform_session.post(old_url+'/movements',json=movement(kind='payment_reversal',amount=40,reverses_id=original['id'])),201)
    assert Decimal(result['record']['received'])==10


def test_concurrent_distinct_payments_cannot_overpay(platform_session,ledger_company):
    _,url,_=ledger_company
    def send(_):
        return requests.post(url+'/movements',json=movement(amount=150),headers=dict(platform_session.headers),timeout=30)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(send,range(2)))
    assert sorted(response.status_code for response in results)==[201,409]
    assert len([entry for entry in checked(platform_session.get(url+'/movements'))['movements'] if entry['kind']=='payment'])==1

"""Platform retainers: correct periods, permissions, revisions and private data."""
from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest
from conftest import API, checked
from roadmesh.modules.administration.analytics import build_analytics


def company(admin):
    return checked(admin.post(API+'/admin/workshops', json={'name': 'TEST_Avença', 'manager_name': 'Responsável', 'manager_email': f'{uuid4().hex}@test.pt'}), 201)['workshop']


def record(**extra):
    return {'billed': 150, 'received': 100, 'hours_included': 10, 'hours_used': 12.5,
            'due_date': '2020-01-01', 'note': 'Teste interno', **extra}


def analytics(admin, year=2088, month=10):
    return checked(admin.get(API+f'/admin/dashboard/analytics?year={year}&month={month}'))


def test_monthly_totals_revision_and_history(platform_session):
    c = company(platform_session); url = API+f"/admin/workshops/{c['id']}/service-months/2088/10"
    before = analytics(platform_session)
    saved = checked(platform_session.put(url, json=record()))['record']
    assert saved['revision'] == 1
    after = analytics(platform_session)
    assert after['summary']['billed'] == (before['summary']['billed'] or 0) + 150
    assert after['summary']['pending'] == (before['summary']['pending'] or 0) + 50
    assert after['summary']['hours_extra'] == (before['summary']['hours_extra'] or 0) + 2.5
    assert after['summary']['overdue'] == before['summary']['overdue'] + 1
    row = next(r for r in after['companies'] if r['id'] == c['id'])
    assert row['state'] == 'pending'
    assert platform_session.put(url, json=record()).status_code == 409
    checked(platform_session.post(url + "/movements", json={"kind": "payment", "amount": 50, "occurred_on": "2026-11-01", "reference": "TEST-RECEIPT", "method": "transfer", "note": "Pagamento de teste", "idempotency_key": str(uuid4())}), 201)
    updated = analytics(platform_session)
    assert updated['summary']['billed'] == after['summary']['billed']  # Editing never counts the month twice.
    assert next(r for r in updated['companies'] if r['id'] == c['id'])['state'] == 'paid'
    checked(platform_session.put(url.replace('/2088/10', '/2087/10'), json=record(billed=90, received=90)))
    compared = analytics(platform_session)
    assert compared['months'][9]['previous_billed'] >= 90
    assert compared['annual']['billed'] == updated['annual']['billed']


def test_unknown_is_not_unpaid_and_zero_is_not_missing(platform_session):
    c = company(platform_session)
    missing = analytics(platform_session, 2089, 2)
    assert next(r for r in missing['companies'] if r['id'] == c['id'])['state'] == 'unrecorded'
    url = API+f"/admin/workshops/{c['id']}/service-months/2089/2"
    checked(platform_session.put(url, json=record(billed=0, received=0, hours_used=0)))
    updated = analytics(platform_session, 2089, 2)
    assert updated['summary']['billed'] == 0
    assert updated['summary']['received'] == 0
    assert next(r for r in updated['companies'] if r['id'] == c['id'])['state'] == 'free'


@pytest.mark.parametrize('values', [{'received': 151}, {'billed': -1}, {'hours_used': -1}, {'hours_included': 'NaN'}, {'hours_used': 1.123}, {'due_date': '2026-02-31'}])
def test_invalid_service_month_is_rejected(platform_session, values):
    c = company(platform_session)
    assert platform_session.put(API+f"/admin/workshops/{c['id']}/service-months/2088/10", json=record(**values)).status_code == 422


def test_admin_only_and_platform_figures_are_not_exposed_to_workshops(platform_session, session_a):
    s = session_a['session']; wid = session_a['user']['workshop_id']
    url = API+f'/admin/workshops/{wid}/service-months/2088/10'
    assert s.get(API+'/admin/dashboard/analytics?year=2088&month=10').status_code == 403
    assert s.put(url, json=record()).status_code == 403
    checked(platform_session.put(url, json=record()))
    # Platform commercial data must not be copied into a workshop's invoice snapshot.
    client = checked(s.get(API+'/clients'))[0]
    vehicle = checked(s.get(API+'/vehicles?client_id='+client['id']))[0]
    order = checked(s.post(API+'/work-orders', json={'client_id': client['id'], 'vehicle_id': vehicle['id'], 'status': 'concluido', 'items': [{'item_type': 'mao_de_obra', 'description': 'Teste', 'quantity': 1, 'unit_price': 10}]}), 201)
    invoice = checked(s.post(API+'/invoices', json={'work_order_id': order['id'], 'document_type': 'fatura'}), 201)
    assert 'platform_service_months' not in invoice['snapshot']['workshop']


def test_archived_company_keeps_history_but_disallows_edits(platform_session):
    c = company(platform_session); url = API+f"/admin/workshops/{c['id']}/service-months/2088/10"
    checked(platform_session.put(url, json=record()))
    checked(platform_session.delete(API+'/admin/workshops/'+c['id'], json={"reason": "Arquivo para teste"}))
    assert platform_session.put(url, json=record(revision=1)).status_code == 409
    row = next(r for r in analytics(platform_session)['companies'] if r['id'] == c['id'])
    assert row['company_status'] == 'archived' and Decimal(str(row['record']['billed'])) == 150


def test_january_uses_previous_december_and_annual_hours_do_not_cancel_excess():
    c = {'id': 'one', 'name': 'Teste', 'status': 'active', 'created_at': '2024-01-01',
         'platform_service_months': {'2025-12': record(billed=80, received=80),
                                   '2026-01': record(hours_used=12),
                                   '2026-02': record(hours_used=1)}}
    result = build_analytics([c], 2026, 1, date(2026, 2, 1))
    assert result['previous_month']['billed'] == 80
    assert result['previous_year_month']['billed'] is None
    assert result['summary']['hours_extra'] == 2
    assert result['annual']['hours_extra'] == 2
    assert result['annual']['recorded'] == 1
    assert result['annual']['pending_companies'] == 1

"""Batched PostgreSQL metrics preserve the public API's accounting contract."""
import asyncio
import os
from contextlib import asynccontextmanager

from conftest import API, checked
from test_postgres import pg
from test_integrity import order_payload


def test_batched_metrics_match_legacy_counts_and_service_revenue(pg, platform_session, workshop_factory):
    from roadmesh.infrastructure.database.postgres import PostgresDatabase
    from roadmesh.infrastructure.database.integrity import revenue_pipeline

    first = workshop_factory('TEST_Metrics_A')
    second = workshop_factory('TEST_Metrics_Empty')
    baseline = checked(platform_session.get(API+'/admin/workshops/'+first['user']['workshop_id']))['metrics']['revenue']
    session = first['session']
    order = checked(session.post(API+'/work-orders', json=order_payload(session, status='concluido')), 201)
    for kind in ('fatura', 'fatura_recibo'):
        checked(session.post(API+'/invoices', json={'work_order_id': order['id'], 'document_type': kind}), 201)
    ids = [first['user']['workshop_id'], second['user']['workshop_id']]

    async def compare():
        db = PostgresDatabase(os.environ['ROADMESH_TEST_POSTGRES_URL'])
        try:
            await db.initialize()
            connection = db.connection
            calls = 0

            @asynccontextmanager
            async def counted(*args, **kwargs):
                nonlocal calls
                calls += 1
                async with connection(*args, **kwargs) as conn:
                    yield conn

            db.connection = counted
            for selected in (None, ids, ids[:1], ids + ids[:1], []):
                before = calls
                result = await db.administration_metrics(selected)
                assert calls - before == (0 if selected == [] else 1)
                scopes = [(None, {})] if selected is None else [(wid, {'workshop_id': wid}) for wid in set(selected)]
                assert set(result['companies']) == set(selected or [])
                for wid, scope in scopes:
                    expected = {name: await db[name].count_documents(scope) for name in ('clients', 'vehicles', 'work_orders', 'users')}
                    revenue = await db.invoices.aggregate(revenue_pipeline(scope)).to_list(1)
                    expected['revenue'] = round(revenue[0]['total'], 2) if revenue else 0
                    assert (result['totals'] if wid is None else result['companies'][wid]) == expected
                if selected is None:
                    for status in ('active', 'disabled', 'archived'):
                        assert result['statuses'].get(status, 0) == await db.workshops.count_documents({'status': status})
                if selected == []:
                    assert result['totals'] == dict(clients=0, vehicles=0, work_orders=0, users=0, revenue=0)
        finally:
            await db.close()

    asyncio.run(compare())
    companies = checked(platform_session.get(API+'/admin/workshops'))
    for company in companies:
        detail = checked(platform_session.get(API+'/admin/workshops/'+company['id']))
        assert company['metrics'] == detail['metrics']
    result = next(c for c in companies if c['id'] == ids[0])
    assert result['metrics']['revenue'] == round(baseline + order['total'], 2)


def test_metrics_list_keeps_search_status_and_admin_boundary(pg, platform_session, session_a):
    assert session_a['session'].get(API+'/admin/dashboard').status_code == 403
    assert session_a['session'].get(API+'/admin/workshops').status_code == 403
    companies = checked(platform_session.get(API+'/admin/workshops', params={'search': 'TEST_', 'status': 'active'}))
    assert companies
    assert all('test_' in c['name'].lower() and c['status'] == 'active' for c in companies)
    assert checked(platform_session.get(API+'/admin/workshops', params={'search': 'nonexistent-metrics-company-926394'})) == []

"""Independent review probes, disposable audit copy only."""
from datetime import date
from conftest import API, checked
from roadmesh.modules.administration.analytics import build_analytics


def test_invoice_must_not_expose_platform_contract(platform_session, session_a):
    s = session_a['session']; wid = session_a['user']['workshop_id']
    company = checked(platform_session.get(API+'/admin/workshops/'+wid))
    checked(platform_session.put(API+'/admin/workshops/'+wid, json={
        'name': company['name'], 'manager_name': company['manager_name'],
        'manager_email': company['manager_email'], 'billing_terms_version': 1,
        'monthly_fee': '300.00', 'payment_day': 5, 'support_hours': '10.00',
        'extra_hour_rate': '35.00'}))
    client = checked(s.get(API+'/clients'))[0]
    vehicle = checked(s.get(API+'/vehicles?client_id='+client['id']))[0]
    order = checked(s.post(API+'/work-orders', json={
        'client_id':client['id'], 'vehicle_id':vehicle['id'], 'status':'concluido',
        'items':[{'item_type':'mao_de_obra','description':'Audit','quantity':1,'unit_price':10}]}),201)
    invoice = checked(s.post(API+'/invoices',json={'work_order_id':order['id'],'document_type':'fatura'}),201)
    private = {'monthly_fee','support_hours','extra_hour_rate','payment_day','billing_cycle','billing_terms_version'}
    assert not private.intersection(invoice['snapshot']['workshop']), 'Contract fields leaked into invoice JSON'


def test_disabling_company_requires_reason_in_api(platform_session, workshop_factory):
    company = workshop_factory('TEST_AuditReason')
    wid = company['user']['workshop_id']
    response = platform_session.post(API+'/admin/workshops/'+wid+'/status', json={'status':'disabled'})
    assert response.status_code == 422, 'API accepted disabling without reason'


def test_previous_period_counts_only_companies_existing_then():
    companies=[{'id':'new','name':'New','status':'active','created_at':'2026-04-01','platform_service_months':{}}]
    result=build_analytics(companies,2026,4,date(2026,4,1))
    assert result['summary']['unrecorded']==1
    assert result['previous_month']['unrecorded']==0
    assert result['previous_year_month']['unrecorded']==0


def test_archive_date_preserves_company_eligibility_before_archive():
    companies=[{'id':'old','name':'Old','status':'archived','created_at':'2026-01-01',
                'archived_at':'2026-11-01','platform_service_months':{}}]
    result=build_analytics(companies,2026,11,date(2026,11,1))
    assert result['summary']['unrecorded']==0
    assert result['previous_month']['unrecorded']==1

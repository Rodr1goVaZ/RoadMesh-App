"""Company onboarding: full profiles, legacy edits and server-side validation."""
from uuid import uuid4

import pytest
from conftest import API, checked


def profile():
    return {
        'company_profile_version': 2, 'modules': ['workshop', 'stand'],
        'name': 'TEST_Perfil', 'legal_name': 'TEST_Perfil Lda.', 'nif': '500123456',
        'entity_type': 'company', 'company_people': ['Ana Teste', 'Rui Teste'], 'sole_trader_name': '', 'country': 'Portugal', 'district': 'Lisboa',
        'municipality': 'Sintra', 'address': 'Rua de Testes 1', 'postal_code': '2710-001',
        'phone': '+351 210 000 000', 'mobile': '+351 910 000 000',
        'email': 'geral@test.pt', 'billing_email': 'contas@test.pt',
        'website': 'https://example.com', 'activity_start_date': '2020-02-29',
        'description': 'Empresa de testes.', 'opening_hours': 'Seg. a sex. 09:00–18:00',
        'manager_name': 'Responsável Teste', 'manager_email': f'{uuid4().hex}@test.pt',
    }


def test_profile_survives_create_read_edit_and_legacy_update(platform_session):
    body = profile()
    created = checked(platform_session.post(API+'/admin/workshops', json=body), 201)
    url = API+'/admin/workshops/'+created['workshop']['id']
    stored = checked(platform_session.get(url))
    for key, value in body.items():
        assert stored[key] == value
    updated = {**body, 'legal_name': 'TEST_Atualizada Lda.', 'website': '', 'activity_start_date': None}
    checked(platform_session.put(url, json=updated))
    stored = checked(platform_session.get(url))
    assert stored['legal_name'] == updated['legal_name']
    assert stored['website'] == '' and stored['activity_start_date'] is None
    # An older API client must not erase new data or disable Stand.
    legacy = {key: body[key] for key in ('name', 'manager_name', 'manager_email')}
    checked(platform_session.put(url, json=legacy))
    stored = checked(platform_session.get(url))
    assert stored['legal_name'] == updated['legal_name']
    assert stored['phone'] == body['phone'] and stored['modules'] == body['modules']


@pytest.mark.parametrize('field,value', [
    ('legal_name', ''), ('entity_type', None), ('nif', '123'), ('country', ''),
    ('district', ''), ('municipality', ''), ('address', ''), ('postal_code', '123'),
    ('phone', 'telefone'), ('email', None), ('billing_email', 'invalido'),
    ('website', 'javascript:alert(1)'), ('activity_start_date', '2026-02-31'),
])
def test_full_profile_rejects_missing_and_invalid_fields(platform_session, field, value):
    body = {**profile(), field: value}
    assert platform_session.post(API+'/admin/workshops', json=body).status_code == 422


def test_profile_optional_fields_and_non_portuguese_postal_codes(platform_session):
    body = {**profile(), 'country': 'Reino Unido', 'nif': 'GB123456', 'postal_code': 'SW1A 1AA',
            'mobile': '', 'billing_email': None, 'website': '', 'activity_start_date': None,
            'opening_hours': '', 'description': ''}
    checked(platform_session.post(API+'/admin/workshops', json=body), 201)


def test_entity_people_are_optional_and_can_be_changed(platform_session):
    body = {**profile(), 'company_people': [], 'entity_type': 'sole_trader', 'sole_trader_name': 'Titular Teste'}
    created = checked(platform_session.post(API+'/admin/workshops', json=body), 201)
    url = API+'/admin/workshops/'+created['workshop']['id']
    assert checked(platform_session.get(url))['sole_trader_name'] == 'Titular Teste'
    checked(platform_session.put(url, json={**body, 'entity_type': 'company', 'sole_trader_name': '', 'company_people': ['Pessoa A', 'Pessoa B']}))
    stored = checked(platform_session.get(url))
    assert stored['sole_trader_name'] == '' and stored['company_people'] == ['Pessoa A', 'Pessoa B']


@pytest.mark.parametrize('field,value', [('company_people', ['A'] * 21), ('company_people', ['A' * 101]), ('sole_trader_name', 'A' * 101)])
def test_entity_people_limits(platform_session, field, value):
    assert platform_session.post(API+'/admin/workshops', json={**profile(), field: value}).status_code == 422

def test_company_state_reasons_are_stored(platform_session):
    body = profile()
    created = checked(platform_session.post(API+'/admin/workshops', json=body), 201)
    url = API+'/admin/workshops/'+created['workshop']['id']
    checked(platform_session.post(url+'/status', json={'status': 'disabled', 'reason': 'Suspensão por pedido do cliente'}))
    stored = checked(platform_session.get(url))
    assert stored['status'] == 'disabled' and stored['status_reason'] == 'Suspensão por pedido do cliente'
    checked(platform_session.post(url+'/status', json={'status': 'active', 'reason': 'Contrato retomado'}))
    assert platform_session.post(url+'/archive', json={'reason': '  '}).status_code == 422
    checked(platform_session.post(url+'/archive', json={'reason': 'Fim do contrato de assistência'}))
    stored = checked(platform_session.get(url))
    assert stored['status'] == 'archived' and stored['archive_reason'] == 'Fim do contrato de assistência'


def test_billing_terms_survive_creation_and_edit(platform_session):
    body = {**profile(), 'billing_terms_version': 1, 'monthly_fee': '300.00', 'billing_cycle': 'monthly', 'payment_day': 31, 'support_hours': '10.50', 'extra_hour_rate': '35.50'}
    created = checked(platform_session.post(API+'/admin/workshops', json=body), 201)
    url = API+'/admin/workshops/'+created['workshop']['id']
    stored = checked(platform_session.get(url))
    assert str(stored['monthly_fee']) == '300.00' and stored['payment_day'] == 31
    assert str(stored['support_hours']) == '10.50' and str(stored['extra_hour_rate']) == '35.50'
    checked(platform_session.put(url, json={**body, 'monthly_fee': '275.50', 'billing_cycle': 'quarterly', 'extra_hour_rate': None}))
    stored = checked(platform_session.get(url))
    assert str(stored['monthly_fee']) == '275.50' and stored['billing_cycle'] == 'quarterly' and stored['extra_hour_rate'] is None


@pytest.mark.parametrize('field,value', [('monthly_fee', '-1'), ('monthly_fee', '1.001'), ('support_hours', None), ('payment_day', 32), ('billing_cycle', 'weekly')])
def test_billing_terms_validation(platform_session, field, value):
    body = {**profile(), 'billing_terms_version': 1, 'monthly_fee': '200', 'billing_cycle': 'monthly', 'payment_day': 5, 'support_hours': '10', field: value}
    assert platform_session.post(API+'/admin/workshops', json=body).status_code == 422


@pytest.mark.parametrize('phone,mobile,expected', [('', '910000000', 201), ('210000000', '', 201), ('', '', 422), (' ', ' ', 422), ('bad', '910000000', 422)])
def test_company_requires_one_valid_phone_contact(platform_session, phone, mobile, expected):
    body = {**profile(), 'phone': phone, 'mobile': mobile}
    assert platform_session.post(API+'/admin/workshops', json=body).status_code == expected

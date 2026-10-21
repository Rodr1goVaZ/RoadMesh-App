"""Manager-only reopening/deletion must hold for direct API requests."""
import uuid

import pytest
import requests

from conftest import API, PASSWORD, checked


@pytest.fixture(scope='module')
def workforce(platform_session, workshop_factory):
    manager = workshop_factory('TEST_OrderPermissions')
    wid = manager['user']['workshop_id']
    provision = checked(platform_session.post(f'{API}/admin/workshops/{wid}/staff',
        json={'name':'Permission Test Staff','email':f'staff_{uuid.uuid4().hex}@test.pt'}),201)
    staff = requests.Session()
    login = checked(staff.post(API+'/auth/staff/login',json={
        'email':provision['credentials']['email'],'password':provision['credentials']['temporary_password']}))
    staff.headers['Authorization']='Bearer '+login['access_token']
    changed = checked(staff.post(API+'/auth/change-password',json={
        'current_password':provision['credentials']['temporary_password'],'new_password':PASSWORD}))
    staff.headers['Authorization']='Bearer '+changed['access_token']
    return {'manager':manager['session'],'staff':staff,'wid':wid,'staff_user':changed['user'],
        'other':workshop_factory('TEST_OrderPermissions_Other')['session']}


def payload(workforce, status='entrada'):
    vehicle = checked(workforce['manager'].get(API+'/vehicles'))[0]
    return {'client_id':vehicle['client_id'],'vehicle_id':vehicle['id'],'status':status,
        'items':[{'item_type':'mao_de_obra','description':'Permission test','quantity':1,'unit_price':10}]}


def test_capabilities_distinguish_manager_and_staff(workforce):
    assert checked(workforce['manager'].get(API+'/auth/me'))['can_manage_workshop'] is True
    assert checked(workforce['staff'].get(API+'/auth/me'))['can_manage_workshop'] is False


@pytest.mark.parametrize('target',['entrada','diagnostico','aguardando_pecas'])
def test_staff_cannot_reopen_even_with_forged_manager_fields(workforce, target):
    manager, staff = workforce['manager'], workforce['staff']
    body = payload(workforce,'concluido')
    wo = checked(manager.post(API+'/work-orders',json=body),201)
    body.update(status=target,is_manager=True,can_manage_workshop=True,role='admin')
    assert staff.put(f'{API}/work-orders/{wo["id"]}',json=body).status_code == 403
    saved = checked(manager.get(f'{API}/work-orders/{wo["id"]}'))
    assert saved['status'] == 'concluido'
    assert not saved.get('state_history')


@pytest.mark.parametrize('status',['diagnostico','aguardando_pecas','concluido'])
def test_staff_cannot_delete_outside_entry(workforce,status):
    manager, staff = workforce['manager'], workforce['staff']
    wo = checked(manager.post(API+'/work-orders',json=payload(workforce,status)),201)
    assert staff.delete(f'{API}/work-orders/{wo["id"]}').status_code == 403
    assert manager.get(f'{API}/work-orders/{wo["id"]}').status_code == 200


def test_staff_can_delete_entry_and_advance_status(workforce):
    manager, staff = workforce['manager'], workforce['staff']
    body = payload(workforce)
    wo = checked(manager.post(API+'/work-orders',json=body),201)
    checked(staff.delete(f'{API}/work-orders/{wo["id"]}'))
    assert manager.get(f'{API}/work-orders/{wo["id"]}').status_code == 404
    wo = checked(manager.post(API+'/work-orders',json=body),201)
    body['status']='diagnostico'
    checked(staff.put(f'{API}/work-orders/{wo["id"]}',json=body))
    saved = checked(manager.get(f'{API}/work-orders/{wo["id"]}'))
    event = saved['state_history'][-1]
    assert (event['from'],event['to'],event['actor_id']) == ('entrada','diagnostico',workforce['staff_user']['id'])


def test_manager_reopening_records_history_and_cannot_change_issued_order(workforce):
    manager = workforce['manager']
    body = payload(workforce,'concluido')
    wo = checked(manager.post(API+'/work-orders',json=body),201)
    body['status']='diagnostico'
    checked(manager.put(f'{API}/work-orders/{wo["id"]}',json=body))
    saved = checked(manager.get(f'{API}/work-orders/{wo["id"]}'))
    assert saved['completed_at'] is None
    assert saved['state_history'][-1]['from'] == 'concluido'
    body['status']='concluido'
    checked(manager.put(f'{API}/work-orders/{wo["id"]}',json=body))
    checked(manager.post(API+'/invoices',json={'work_order_id':wo['id'],'document_type':'fatura'}),201)
    body['status']='entrada'
    assert manager.put(f'{API}/work-orders/{wo["id"]}',json=body).status_code == 409
    assert manager.delete(f'{API}/work-orders/{wo["id"]}').status_code == 409


def test_other_workshop_manager_cannot_reopen_or_delete(workforce):
    body = payload(workforce,'concluido')
    wo = checked(workforce['manager'].post(API+'/work-orders',json=body),201)
    body['status']='entrada'
    assert workforce['other'].put(f'{API}/work-orders/{wo["id"]}',json=body).status_code == 404
    assert workforce['other'].delete(f'{API}/work-orders/{wo["id"]}').status_code == 404

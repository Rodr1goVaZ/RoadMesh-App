"""Business invariants across both disposable database backends."""
from uuid import uuid4

import pytest

from conftest import API, checked
from test_integrity import order_payload
from test_work_order_permissions import workforce as workforce  # noqa: F401


@pytest.fixture(scope='module')
def business(workshop_factory):
    return workshop_factory('TEST_Business')['session']


def catalog(s, **overrides):
    return checked(s.post(API+'/products',json={'reference':uuid4().hex,'name':'Test part',
        'supplier':'Supplier Test','stock':10,'purchase_price':5,'sale_price':10,'barcode':uuid4().hex,**overrides}),201)


def test_duplicate_identity_and_cross_tenant_scope(business, workshop_factory):
    s=business
    client=checked(s.post(API+'/clients',json={'name':'Duplicate Target','nif':'123 456 789'}),201)
    assert s.post(API+'/clients',json={'name':'Other Name','nif':'123456789'}).status_code==409
    assert s.put(API+'/clients/'+client['id'],json={'name':'Duplicate Target','nif':'123456789'}).status_code==200
    other=workshop_factory('TEST_DuplicatesOther')['session']
    checked(other.post(API+'/clients',json={'name':'Other Name','nif':'123456789'}),201)
    vehicle=checked(s.get(API+'/vehicles'))[0]
    assert s.post(API+'/vehicles',json={'client_id':vehicle['client_id'],'license_plate':vehicle['license_plate'].replace('-',' '),
        'make':'Different','model':'Different'}).status_code==409
    p=catalog(s,reference='NORMAL REF')
    assert s.post(API+'/products',json={'reference':'  normal   ref  ','name':'Other'}).status_code==409
    assert s.post(API+'/products',json={'reference':uuid4().hex,'name':'Other','barcode':p['barcode']}).status_code==409


def test_financial_ledger_payment_credit_reversal_and_retries(business):
    s=business
    wo=checked(s.post(API+'/work-orders',json=order_payload(s,status='concluido')),201)
    invoice=checked(s.post(API+'/invoices',json={'work_order_id':wo['id'],'document_type':'fatura'}),201)
    second=checked(s.post(API+'/invoices',json={'work_order_id':wo['id'],'document_type':'fatura_recibo'}),201)
    path=API+'/invoices/'+invoice['id']
    balance=checked(s.get(path+'/balance'))
    assert balance['pending']==12.3 and balance['available']==0 and len(balance['movements'])==1
    body={'kind':'payment','amount':'5.00','method':'transfer','reason':'Test payment','idempotency_key':uuid4().hex}
    payment=checked(s.post(path+'/movements',json=body),201)
    assert checked(s.post(path+'/movements',json=body),201)['id']==payment['id']
    assert s.post(path+'/movements',json={**body,'amount':'6.00'}).status_code==409
    assert s.post(path+'/movements',json={**body,'idempotency_key':uuid4().hex,'amount':'10.00'}).status_code==409
    checked(s.post(path+'/movements',json={'kind':'credit','amount':'3.00','reason':'Test correction','idempotency_key':uuid4().hex}),201)
    checked(s.post(path+'/movements',json={'kind':'payment_reversal','amount':'2.00','reason':'Test reversal',
        'reverses_id':payment['id'],'idempotency_key':uuid4().hex}),201)
    b=checked(s.get(API+'/invoices/'+second['id']+'/balance'))
    assert (b['invoiced'],b['credited'],b['available'],b['pending'])==(12.3,3,3,6.3)
    assert len(b['movements'])==4
    summary=checked(s.get(API+'/finance/summary'))
    assert summary['available']==3


def test_staff_cannot_change_prices_or_read_finance(workforce):
    manager,staff=workforce['manager'],workforce['staff']
    checked(manager.put(API+'/workshop/settings',json={'labor_hour_rate':'35.00','labor_vat_rate':23}))
    body=order_payload(manager)
    assert staff.post(API+'/work-orders',json=body).status_code==403
    body['items'][0]['unit_price']=35
    wo=checked(staff.post(API+'/work-orders',json=body),201)
    body['items'][0]['unit_price']=1
    assert staff.put(API+'/work-orders/'+wo['id'],json=body).status_code==403
    assert staff.post(API+'/products',json={'reference':'BAD','name':'Bad'}).status_code==403
    assert staff.get(API+'/finance/summary').status_code==403
    assert staff.put(API+'/workshop/settings',json={'labor_hour_rate':1}).status_code==403


def test_restock_draft_and_partial_barcode_receipts_are_idempotent(business):
    s=business
    p=catalog(s,stock=2,min_stock=2,restock_enabled=True)
    orders=checked(s.get(API+'/purchase-orders'))
    draft=next(d for d in orders if any(i['product_id']==p['id'] for i in d['items']))
    assert draft['status']=='por_validar'
    again=checked(s.post(API+'/products/'+p['id']+'/draft-order',json={}))
    assert again['id']==draft['id']
    assert len([i for i in again['items'] if i['product_id']==p['id']])==1
    path=API+'/purchase-orders/'+draft['id']
    assert s.post(path+'/receive').status_code==409
    checked(s.post(path+'/validate',json={}))
    body={'idempotency_key':uuid4().hex,'items':[{'product_id':p['id'],'quantity':1,'barcode':p['barcode']}]}
    assert s.post(path+'/receive',json={**body,'items':[{**body['items'][0],'barcode':'WRONG'}]}).status_code==422
    checked(s.post(path+'/receive',json=body))
    checked(s.post(path+'/receive',json=body))
    assert checked(s.get(API+'/products/'+p['id']))['stock']==3
    assert next(d for d in checked(s.get(API+'/purchase-orders')) if d['id']==draft['id'])['status']=='parcial'
    assert s.post(path+'/receive',json={**body,'idempotency_key':uuid4().hex,'items':[{**body['items'][0],'quantity':100}]}).status_code==409
    checked(s.post(path+'/receive',json={**body,'idempotency_key':uuid4().hex}))
    assert checked(s.get(API+'/products/'+p['id']))['stock']==4
    supplier=next(d for d in checked(s.get(API+'/suppliers')) if d['name']=='Supplier Test')
    own=checked(s.get(API+'/suppliers/'+supplier['id']+'/products'))
    assert any(d['id']==p['id'] for d in own)
    assert all(d['stock']>0 and d['supplier']=='Supplier Test' for d in own)


def test_margin_calculates_price_and_labor_snapshot_survives_rate_change(business):
    s=business
    p=catalog(s,purchase_price=80,profit_margin='20.00')
    assert p['sale_price']==100
    assert s.post(API+'/products',json={'reference':uuid4().hex,'name':'Bad margin','profit_margin':100}).status_code==422
    checked(s.put(API+'/workshop/settings',json={'labor_hour_rate':35,'labor_vat_rate':23}))
    body=order_payload(s,status='concluido')
    body['items']=[{'item_type':'mao_de_obra','quantity':2,'unit_price':35,'vat_rate':23}]
    wo=checked(s.post(API+'/work-orders',json=body),201)
    assert wo['items'][0]['description']=='Mão de obra' and wo['subtotal']==70
    invoice=checked(s.post(API+'/invoices',json={'work_order_id':wo['id'],'document_type':'fatura'}),201)
    checked(s.put(API+'/workshop/settings',json={'labor_hour_rate':99,'labor_vat_rate':23}))
    assert checked(s.get(API+'/work-orders/'+wo['id']))['items'][0]['unit_price']==35
    assert checked(s.get(API+'/invoices/'+invoice['id']+'/balance'))['invoiced']==86.1


def test_history_years_pagination_and_scope(business,workshop_factory):
    from datetime import datetime
    from zoneinfo import ZoneInfo
    s=business;p=catalog(s)
    current=datetime.now(ZoneInfo('Europe/Lisbon')).year
    assert current in checked(s.get(API+'/history/stock/years',params={'product_id':p['id']}))
    result=checked(s.get(API+'/history/stock',params={'product_id':p['id'],'year':current,'limit':1}))
    assert result['total']==1 and result['items'][0]['product_id']==p['id']
    assert checked(s.get(API+'/history/stock',params={'product_id':p['id'],'year':current-1}))['total']==0
    other=workshop_factory('TEST_HistoryIsolation')['session']
    assert checked(other.get(API+'/history/stock',params={'product_id':p['id']}))['total']==0
    assert s.get(API+'/history/stock',params={'limit':100000}).status_code==422
    assert s.get(API+'/history/stock',params={'year':1900}).status_code==422


def test_fractional_stock_consumption_has_no_residual(business):
    s=business;p=catalog(s,stock=1)
    for _ in range(10):
        body=order_payload(s,items=[{'item_type':'peca','description':'Fractional part','product_id':p['id'],
            'quantity':.1,'unit_price':10,'vat_rate':23}])
        checked(s.post(API+'/work-orders',json=body),201)
    assert checked(s.get(API+'/products/'+p['id']))['stock']==0
    assert s.post(API+'/work-orders',json=body).status_code==409


def test_parallel_draft_requests_share_one_order_and_product_line(business):
    from concurrent.futures import ThreadPoolExecutor
    import requests
    s=business
    p=catalog(s,supplier='Concurrent '+uuid4().hex,stock=2,min_stock=2,restock_enabled=True)
    def add(_):
        return requests.post(API+'/products/'+p['id']+'/draft-order',json={},headers=dict(s.headers),timeout=20)
    with ThreadPoolExecutor(max_workers=4) as pool:
        rows=[checked(r) for r in pool.map(add,range(4))]
    assert len({r['id'] for r in rows})==1
    assert all(len([i for i in r['items'] if i['product_id']==p['id']])==1 for r in rows)


def test_parallel_payment_retries_create_one_movement(business):
    from concurrent.futures import ThreadPoolExecutor
    import requests
    s=business
    wo=checked(s.post(API+'/work-orders',json=order_payload(s,status='concluido')),201)
    invoice=checked(s.post(API+'/invoices',json={'work_order_id':wo['id'],'document_type':'fatura'}),201)
    path=API+'/invoices/'+invoice['id']
    body={'kind':'payment','amount':'5.00','method':'cash','reason':'Concurrent retry','idempotency_key':uuid4().hex}
    def pay(_):
        return requests.post(path+'/movements',json=body,headers=dict(s.headers),timeout=20)
    with ThreadPoolExecutor(max_workers=4) as pool:
        rows=[checked(r,201) for r in pool.map(pay,range(4))]
    assert len({r['id'] for r in rows})==1
    balance=checked(s.get(path+'/balance'))
    assert balance['available']==5 and balance['pending']==7.3 and len(balance['movements'])==2


def test_cancel_partial_order_preserves_received_stock_and_history(business):
    s=business
    p=catalog(s,supplier='Cancellation '+uuid4().hex,stock=2,min_stock=2,restock_enabled=True)
    po=checked(s.post(API+'/products/'+p['id']+'/draft-order',json={}))
    path=API+'/purchase-orders/'+po['id']
    checked(s.post(path+'/validate',json={}))
    checked(s.post(path+'/receive',json={'idempotency_key':uuid4().hex,'items':[{'product_id':p['id'],'quantity':1,'barcode':p['barcode']}]}))
    assert s.put(API+'/products/'+p['id'],json={**p,'supplier':'Changed','stock':3}).status_code==409
    checked(s.post(path+'/cancel',json={}))
    checked(s.post(path+'/cancel',json={}))
    saved=checked(s.get(path))
    assert saved['status']=='cancelada' and len(saved['receipts'])==1
    assert checked(s.get(API+'/products/'+p['id']))['stock']==3
    checked(s.put(API+'/products/'+p['id'],json={**p,'supplier':'Changed','stock':3}))

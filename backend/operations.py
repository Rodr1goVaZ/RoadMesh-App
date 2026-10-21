"""Workshop settings, suppliers, orders and immutable financial movements."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Literal
from uuid import uuid4

from fastapi import Depends, HTTPException
from pydantic import Field

from access_control import StrictModel
from business_rules import fingerprint, identity, money, suggested_restock, text, year_scope
from database_integrity import transact


def stamp():
    return datetime.now(timezone.utc).isoformat()


def scoped(user, **values):
    return {'workshop_id':user['workshop_id'],**values}


class Settings(StrictModel):
    labor_hour_rate: Decimal = Field(ge=0,max_digits=12,decimal_places=2)
    labor_vat_rate: Decimal = Field(default=23,ge=0,le=100,max_digits=5,decimal_places=2)


class Supplier(StrictModel):
    name: str = Field(min_length=1,max_length=150)
    nif: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class DraftItem(StrictModel):
    product_id: str
    quantity: int = Field(default=1,gt=0,le=1000000)


class DraftUpdate(StrictModel):
    items: list[DraftItem] = Field(max_length=500)


class ReceiptLine(StrictModel):
    product_id: str
    quantity: Decimal = Field(gt=0,max_digits=16,decimal_places=4)
    barcode: str | None = None


class Receipt(StrictModel):
    idempotency_key: str = Field(min_length=8,max_length=150)
    items: list[ReceiptLine] = Field(min_length=1,max_length=500)


class Movement(StrictModel):
    kind: Literal['payment','payment_reversal','credit']
    amount: Decimal = Field(gt=0,max_digits=14,decimal_places=2)
    method: Literal['cash','card','transfer','other'] = 'transfer'
    reason: str = Field(min_length=3,max_length=1000)
    idempotency_key: str = Field(min_length=8,max_length=150)
    reverses_id: str | None = None


async def ensure_charge(db, invoice, user, session):
    if invoice['document_type'] not in ('fatura','fatura_recibo') or money(invoice['grand_total']) == 0:
        return
    scope = scoped(user,work_order_id=invoice['work_order_id'])
    # This parent write serializes initial charge/payment creation in MongoDB too.
    await db.work_orders.update_one({'id':invoice['work_order_id'],**scoped(user)},
        {'$inc':{'reference_revision':1}},session=session)
    existing = await db.financial_movements.find_one({**scope,'kind':'charge'},{'_id':0},session=session)
    if existing:
        if money(existing['amount']) != money(invoice['grand_total']):
            raise HTTPException(409,'Os documentos desta ordem têm valores diferentes. É necessária revisão financeira.')
        return existing
    order = await db.work_orders.find_one({'id':invoice['work_order_id'],**scoped(user)},{'_id':0},session=session)
    doc = {'id':str(uuid4()),**scope,'invoice_id':invoice['id'],'client_id':order['client_id'],
        'actor_id':user['id'],'actor_name':user['name'],'kind':'charge','amount':float(money(invoice['grand_total'])),
        'idempotency_key':'charge:'+invoice['work_order_id'],'request_hash':fingerprint([invoice['work_order_id'],str(money(invoice['grand_total']))]),
        'created_at':stamp(),'reason':'Documento emitido; pagamento por confirmar'}
    await db.financial_movements.insert_one(doc,session=session)
    return doc


def totals(rows):
    charge = sum((money(r['amount']) for r in rows if r['kind']=='charge'),Decimal(0))
    credit = sum((money(r['amount']) for r in rows if r['kind']=='credit'),Decimal(0))
    paid = sum((money(r['amount']) * (1 if r['kind']=='payment' else -1)
        for r in rows if r['kind'] in ('payment','payment_reversal')),Decimal(0))
    balance = charge-credit-paid
    return {'invoiced':float(charge),'credited':float(credit),'available':float(paid),
        'pending':float(max(balance,Decimal(0))),'refund_due':float(max(-balance,Decimal(0)))}


async def ensure_supplier(db,user,name,session):
    key = text(name)
    if not key:
        return
    await db.workshops.update_one({'id':user['workshop_id']},{'$inc':{'supplier_revision':1}},session=session)
    if not await db.suppliers.find_one(scoped(user,name_key=key),{'_id':0},session=session):
        await db.suppliers.insert_one({'id':str(uuid4()),**scoped(user),'name':name.strip(),'name_key':key,
            'created_at':stamp(),'updated_at':stamp()},session=session)


async def draft_product(db,user,product,session,automatic=False):
    supplier = (product.get('supplier') or '').strip()
    if not supplier:
        raise HTTPException(422,'Configure o fornecedor do produto antes de o adicionar à encomenda.')
    await db.workshops.update_one({'id':user['workshop_id']},{'$inc':{'draft_revision':1}},session=session)
    scope = scoped(user,supplier_key=text(supplier),status={'$in':['rascunho','por_validar']})
    doc = await db.purchase_orders.find_one(scope,{'_id':0},session=session)
    if not doc:
        doc = {'id':str(uuid4()),**scoped(user),'supplier':supplier,'supplier_key':text(supplier),
            'status':'por_validar' if automatic else 'rascunho','origin':'automatic' if automatic else 'manual',
            'items':[],'total':0,'created_at':stamp(),'updated_at':stamp()}
        await db.purchase_orders.insert_one(doc,session=session)
    items = doc['items']
    if not any(i['product_id']==product['id'] for i in items):
        items.append({'id':str(uuid4()),'product_id':product['id'],'product_name':product['name'],
            'quantity':suggested_restock(product) if automatic else 1,'unit_price':product['purchase_price'],
            'vat_rate':product['vat_rate'],'origin':'automatic' if automatic else 'manual'})
    await save_draft(db,user,doc,items,session)
    return await db.purchase_orders.find_one(scoped(user,id=doc['id']),{'_id':0},session=session)


async def save_draft(db,user,doc,items,session):
    subtotal = sum((money(Decimal(str(i['quantity']))*Decimal(str(i['unit_price']))) for i in items),Decimal(0))
    vat = sum((money(money(Decimal(str(i['quantity']))*Decimal(str(i['unit_price'])))*Decimal(str(i.get('vat_rate',23)))/100) for i in items),Decimal(0))
    removed = {i['product_id'] for i in doc.get('items',[])} - {i['product_id'] for i in items}
    for pid in removed:
        await db.reorder_needs.delete_many(scoped(user,purchase_order_id=doc['id'],product_id=pid),session=session)
    await db.purchase_orders.update_one(scoped(user,id=doc['id']),{'$set':{
        'items':items,'subtotal':float(subtotal),'vat':float(vat),'total':float(subtotal+vat),'updated_at':stamp()}},session=session)


async def consider_restock(db,user,product_id,session):
    product = await db.products.find_one(scoped(user,id=product_id),{'_id':0},session=session)
    if not product or not product.get('restock_enabled') or product['stock']>product['min_stock'] or not product.get('supplier'):
        return
    need = await db.reorder_needs.find_one(scoped(user,product_id=product_id),{'_id':0},session=session)
    if need:
        return
    # An already ordered product covers this need; do not add another proposal.
    existing = await db.purchase_orders.find_one({**scoped(user),'status':{'$in':['rascunho','por_validar','pendente','parcial']},
        'items.product_id':product_id},{'_id':0},session=session)
    doc = existing or await draft_product(db,user,product,session,automatic=True)
    await db.reorder_needs.insert_one({'id':str(uuid4()),**scoped(user),'product_id':product_id,
        'purchase_order_id':doc['id'],'created_at':stamp()},session=session)


async def receive_order(db,access,user,po_id,body,apply_delta):
    async def operation(session):
        await access.require_workshop_manager(user,session)
        po = await db.purchase_orders.find_one_and_update(scoped(user,id=po_id),{'$inc':{'receipt_revision':1}},
            return_document=True,session=session)
        if not po:
            raise HTTPException(404,'Encomenda não encontrada.')
        request = body.model_dump(mode='json') if body else {'legacy_full':po_id}
        key = body.idempotency_key if body else 'legacy-full:'+po_id
        digest = fingerprint(request)
        previous = await db.order_receipts.find_one(scoped(user,idempotency_key=key),{'_id':0},session=session)
        if previous:
            if previous['request_hash'] != digest or previous['purchase_order_id'] != po_id:
                raise HTTPException(409,'A referência de confirmação já foi usada para outra receção.')
            return {'ok':True,'already':True}
        if po['status']=='recebida' and body is None:
            return {'ok':True,'already':True}
        if po['status'] not in ('pendente','parcial'):
            raise HTTPException(409,'Valide a encomenda antes da receção.')
        quantities = {i['product_id']:i for i in po['items']}
        incoming = body.items if body else [ReceiptLine(product_id=k,quantity=Decimal(str(v['quantity']))-Decimal(str(v.get('received_quantity',0))))
            for k,v in quantities.items() if Decimal(str(v['quantity']))>Decimal(str(v.get('received_quantity',0)))]
        if len({i.product_id for i in incoming}) != len(incoming):
            raise HTTPException(422,'O mesmo produto aparece várias vezes na confirmação.')
        for line in incoming:
            item = quantities.get(line.product_id)
            if not item:
                raise HTTPException(422,'O produto não pertence à encomenda.')
            product = await db.products.find_one(scoped(user,id=line.product_id),{'_id':0},session=session)
            if not product:
                raise HTTPException(404,'Produto não encontrado.')
            if line.barcode and identity(product.get('barcode')) != identity(line.barcode):
                raise HTTPException(422,'O código de barras não corresponde ao produto.')
            received = Decimal(str(item.get('received_quantity',0)))+line.quantity
            if received>Decimal(str(item['quantity'])):
                raise HTTPException(409,'Quantidade superior à quantidade ainda por receber.')
            await apply_delta(user,line.product_id,float(line.quantity),'Entrada encomenda',session=session,
                purchase_order_id=po_id,receipt_key=key,actor_id=user['id'])
            item['received_quantity']=float(received)
        complete = all(Decimal(str(i.get('received_quantity',0)))==Decimal(str(i['quantity'])) for i in quantities.values())
        await db.purchase_orders.update_one(scoped(user,id=po_id),{'$set':{'items':list(quantities.values()),
            'status':'recebida' if complete else 'parcial','updated_at':stamp()}},session=session)
        await db.order_receipts.insert_one({'id':str(uuid4()),**scoped(user),'purchase_order_id':po_id,
            'actor_id':user['id'],'actor_name':user['name'],'idempotency_key':key,'request_hash':digest,'items':[i.model_dump(mode='json') for i in incoming],'created_at':stamp()},session=session)
        if complete:
            await db.reorder_needs.delete_many(scoped(user,purchase_order_id=po_id),session=session)
            for pid in quantities:
                await consider_restock(db,user,pid,session)
        await access.audit(user,'purchase_order.received',user['workshop_id'],po_id,details={'key':key,'complete':complete},session=session)
        return {'ok':True,'complete':complete}
    return await transact(db,operation)


def register_operations(api,db,access):
    @api.get('/workshop/settings')
    async def settings(user=Depends(access.workshop)):
        w = await db.workshops.find_one({'id':user['workshop_id']},{'_id':0})
        return {'labor_hour_rate':w.get('labor_hour_rate',0),'labor_vat_rate':w.get('labor_vat_rate',23),
            'configured':w.get('labor_hour_rate') is not None}

    @api.put('/workshop/settings')
    async def update_settings(body: Settings,user=Depends(access.workshop)):
        async def operation(session):
            await access.require_workshop_manager(user,session)
            await db.workshops.update_one({'id':user['workshop_id']},{'$set':{
                'labor_hour_rate':float(body.labor_hour_rate),'labor_vat_rate':float(body.labor_vat_rate),'updated_at':stamp()}},session=session)
            await access.audit(user,'workshop.pricing_changed',user['workshop_id'],details=body.model_dump(mode='json'),session=session)
            return {'ok':True}
        return await transact(db,operation)

    @api.get('/suppliers')
    async def suppliers(search: str='',skip: int=0,limit: int=100,user=Depends(access.workshop)):
        if skip<0 or not 1<=limit<=200:
            raise HTTPException(422,'Paginação inválida.')
        scope = scoped(user)
        if search:
            import re
            scope['name']={'$regex':re.escape(search),'$options':'i'}
        return await db.suppliers.find(scope,{'_id':0}).sort('name',1).skip(skip).limit(limit).to_list(limit)

    @api.post('/suppliers',status_code=201)
    async def add_supplier(body: Supplier,user=Depends(access.workshop)):
        async def operation(session):
            await access.require_workshop_manager(user,session)
            if await db.suppliers.find_one(scoped(user,name_key=text(body.name)),{'_id':0},session=session):
                raise HTTPException(409,'Este fornecedor já existe nesta oficina.')
            doc={'id':str(uuid4()),**scoped(user),**body.model_dump(),'name_key':text(body.name),'created_at':stamp(),'updated_at':stamp()}
            await db.workshops.update_one({'id':user['workshop_id']},{'$inc':{'supplier_revision':1}},session=session)
            await db.suppliers.insert_one(doc,session=session)
            doc.pop('_id',None)
            return doc
        return await transact(db,operation)

    @api.get('/suppliers/{sid}/products')
    async def supplier_products(sid: str,user=Depends(access.workshop)):
        supplier=await db.suppliers.find_one(scoped(user,id=sid),{'_id':0})
        if not supplier:
            raise HTTPException(404,'Fornecedor não encontrado.')
        return await db.products.find({**scoped(user),'supplier_key':supplier['name_key'],'stock':{'$gt':0}},{'_id':0}).sort('name',1).to_list(2000)

    @api.post('/products/{pid}/draft-order')
    async def add_to_draft(pid: str,user=Depends(access.workshop)):
        async def operation(session):
            product=await db.products.find_one_and_update(scoped(user,id=pid),{'$inc':{'reference_revision':1}},return_document=True,session=session)
            if not product:
                raise HTTPException(404,'Produto não encontrado.')
            return await draft_product(db,user,product,session)
        return await transact(db,operation)

    @api.get('/purchase-orders/{oid}')
    async def order_detail(oid: str,user=Depends(access.workshop)):
        order=await db.purchase_orders.find_one(scoped(user,id=oid),{'_id':0})
        if not order:
            raise HTTPException(404,'Encomenda não encontrada.')
        order['receipts']=await db.order_receipts.find(scoped(user,purchase_order_id=oid),{'_id':0}).sort('created_at',1).to_list(500)
        return order

    @api.put('/purchase-orders/{oid}/draft')
    async def edit_draft(oid: str,body: DraftUpdate,user=Depends(access.workshop)):
        async def operation(session):
            po=await db.purchase_orders.find_one_and_update(scoped(user,id=oid),{'$inc':{'draft_revision':1}},return_document=True,session=session)
            if not po:
                raise HTTPException(404,'Encomenda não encontrada.')
            if po['status'] not in ('rascunho','por_validar'):
                raise HTTPException(409,'A encomenda já foi validada.')
            if len({i.product_id for i in body.items}) != len(body.items):
                raise HTTPException(422,'Consolide as quantidades de cada produto numa linha.')
            items=[]
            for line in body.items:
                p=await db.products.find_one(scoped(user,id=line.product_id),{'_id':0},session=session)
                if not p or text(p.get('supplier'))!=text(po['supplier']):
                    raise HTTPException(422,'O produto não pertence ao fornecedor desta encomenda.')
                items.append({'id':str(uuid4()),'product_id':p['id'],'product_name':p['name'],'quantity':line.quantity,
                    'unit_price':p['purchase_price'],'vat_rate':p['vat_rate']})
            await save_draft(db,user,po,items,session)
            return {'ok':True}
        return await transact(db,operation)

    @api.post('/purchase-orders/{oid}/validate')
    async def validate_draft(oid: str,user=Depends(access.workshop)):
        async def operation(session):
            await access.require_workshop_manager(user,session)
            po=await db.purchase_orders.find_one(scoped(user,id=oid),{'_id':0},session=session)
            if not po:
                raise HTTPException(404,'Encomenda não encontrada.')
            if po['status']=='pendente':
                return {'ok':True,'already':True}
            if po['status'] not in ('rascunho','por_validar') or not po['items']:
                raise HTTPException(409,'O rascunho não pode ser validado neste estado.')
            await db.purchase_orders.update_one(scoped(user,id=oid),{'$set':{'status':'pendente','validated_by':user['id'],'updated_at':stamp()}},session=session)
            await access.audit(user,'purchase_order.validated',user['workshop_id'],oid,session=session)
            return {'ok':True}
        return await transact(db,operation)

    @api.post('/purchase-orders/{oid}/cancel')
    async def cancel_order(oid: str,user=Depends(access.workshop)):
        async def operation(session):
            await access.require_workshop_manager(user,session)
            po=await db.purchase_orders.find_one_and_update(scoped(user,id=oid),{'$inc':{'draft_revision':1}},return_document=True,session=session)
            if not po:
                raise HTTPException(404,'Encomenda não encontrada.')
            if po['status']=='cancelada':
                return {'ok':True,'already':True}
            if po['status']=='recebida':
                raise HTTPException(409,'Uma encomenda recebida mantém o histórico. Registe eventuais correções de stock separadamente.')
            await db.purchase_orders.update_one(scoped(user,id=oid),{'$set':{'status':'cancelada','updated_at':stamp(),'cancelled_by':user['id']}},session=session)
            await db.reorder_needs.delete_many(scoped(user,purchase_order_id=oid),session=session)
            await access.audit(user,'purchase_order.cancelled',user['workshop_id'],oid,details={'previous_status':po['status']},session=session)
            return {'ok':True}
        return await transact(db,operation)

    @api.get('/finance/summary')
    async def finance_summary(user=Depends(access.workshop)):
        await access.require_workshop_manager(user)
        if getattr(db,'is_postgres',False) is True:
            summary=await db.finance_summary(user['workshop_id'])
        else:
            rows=await db.financial_movements.find(scoped(user),{'_id':0}).to_list(None)
            grouped={}
            for row in rows: grouped.setdefault(row['work_order_id'],[]).append(row)
            summary={k:sum(totals(v)[k] for v in grouped.values()) for k in ('invoiced','credited','available','pending','refund_due')}
        return summary

    @api.get('/finance/movements')
    async def movements(year: int | None=None,skip: int=0,limit: int=100,user=Depends(access.workshop)):
        await access.require_workshop_manager(user)
        if skip<0 or not 1<=limit<=200:
            raise HTTPException(422,'Paginação inválida.')
        return await db.financial_movements.find({**scoped(user),**year_scope(year)},{'_id':0}).sort('created_at',-1).skip(skip).limit(limit).to_list(limit)

    @api.get('/invoices/{iid}/balance')
    async def balance(iid: str,user=Depends(access.workshop)):
        await access.require_workshop_manager(user)
        invoice=await db.invoices.find_one(scoped(user,id=iid),{'_id':0})
        if not invoice:
            raise HTTPException(404,'Documento não encontrado.')
        rows=await db.financial_movements.find(scoped(user,work_order_id=invoice['work_order_id']),{'_id':0}).sort('created_at',1).to_list(None)
        return {**totals(rows),'reconciled':any(r['kind']=='charge' for r in rows),'movements':rows}

    @api.post('/invoices/{iid}/reconcile')
    async def reconcile(iid: str,user=Depends(access.workshop)):
        async def operation(session):
            await access.require_workshop_manager(user,session)
            invoice=await db.invoices.find_one(scoped(user,id=iid),{'_id':0},session=session)
            if not invoice:
                raise HTTPException(404,'Documento não encontrado.')
            charge=await ensure_charge(db,invoice,user,session)
            if not charge:
                raise HTTPException(422,'Este documento não gera um valor a receber.')
            await access.audit(user,'finance.reconciled_as_pending',user['workshop_id'],iid,session=session)
            return {'ok':True}
        return await transact(db,operation)

    @api.post('/invoices/{iid}/movements',status_code=201)
    async def post_movement(iid: str,body: Movement,user=Depends(access.workshop)):
        async def operation(session):
            await access.require_workshop_manager(user,session)
            invoice=await db.invoices.find_one(scoped(user,id=iid),{'_id':0},session=session)
            if not invoice:
                raise HTTPException(404,'Documento não encontrado.')
            await db.work_orders.update_one(scoped(user,id=invoice['work_order_id']),{'$inc':{'reference_revision':1}},session=session)
            digest=fingerprint({'invoice_id':iid,**body.model_dump(mode='json')})
            previous=await db.financial_movements.find_one(scoped(user,idempotency_key=body.idempotency_key),{'_id':0},session=session)
            if previous:
                if previous['request_hash']!=digest:
                    raise HTTPException(409,'A referência de pagamento já foi usada com outros dados.')
                return previous
            rows=await db.financial_movements.find(scoped(user,work_order_id=invoice['work_order_id']),{'_id':0},session=session).to_list(None)
            if not any(r['kind']=='charge' for r in rows):
                raise HTTPException(409,'Reconcilie este documento antigo antes de registar pagamentos.')
            current=totals(rows)
            if body.kind=='payment' and body.amount>money(current['pending']):
                raise HTTPException(409,'O pagamento excede o valor pendente.')
            if body.kind=='credit' and body.amount>money(current['invoiced'])-money(current['credited']):
                raise HTTPException(409,'O ajuste excede o valor ainda não creditado.')
            if body.kind=='payment_reversal':
                original=next((r for r in rows if r['id']==body.reverses_id and r['kind']=='payment'),None)
                reversed_amount=sum((money(r['amount']) for r in rows if r.get('reverses_id')==body.reverses_id),Decimal(0))
                if not original or body.amount>money(original['amount'])-reversed_amount:
                    raise HTTPException(409,'A devolução excede o pagamento disponível para estorno.')
            elif body.reverses_id:
                raise HTTPException(422,'A referência de estorno só é válida numa devolução.')
            doc={'id':str(uuid4()),**scoped(user),'work_order_id':invoice['work_order_id'],'invoice_id':iid,
                'client_id':next(r['client_id'] for r in rows if r['kind']=='charge'),'actor_id':user['id'],'actor_name':user['name'],
                **body.model_dump(mode='json'),'amount':float(body.amount),'request_hash':digest,'created_at':stamp()}
            await db.financial_movements.insert_one(doc,session=session)
            doc.pop('_id',None)
            await access.audit(user,'finance.'+body.kind,user['workshop_id'],doc['id'],details={'invoice_id':iid,'amount':str(body.amount)},session=session)
            return doc
        return await transact(db,operation)

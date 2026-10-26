"""First stand module: scoped inventory, shared customers, leads and immutable sales."""
import re
from decimal import Decimal
from typing import Literal

from fastapi import Depends, HTTPException
from pydantic import Field

from roadmesh.core.access_control import StrictModel, identifier, timestamp
from roadmesh.domain.business_rules import fingerprint, identity, money, prevent_duplicate
from roadmesh.core.company_modules import require_module
from roadmesh.infrastructure.database.integrity import transact


class InventoryBody(StrictModel):
    license_plate: str = Field(min_length=1, max_length=30)
    make: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    year: int | None = Field(default=None, ge=1886, le=2100)
    vin: str | None = Field(default=None, max_length=50)
    mileage: int | None = Field(default=None, ge=0, le=10000000)
    fuel: str | None = Field(default=None, max_length=50)
    description: str = Field(default='', max_length=3000)
    purchase_price: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    asking_price: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    status: Literal['disponivel', 'reservado', 'retirado'] = 'disponivel'
    vehicle_id: str | None = None


class LeadBody(StrictModel):
    client_id: str
    inventory_id: str | None = None
    status: Literal['novo', 'contactado', 'interessado', 'fechado'] = 'novo'
    notes: str = Field(default='', max_length=3000)


class SaleBody(StrictModel):
    inventory_id: str
    client_id: str
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    idempotency_key: str = Field(min_length=8, max_length=150)
    notes: str = Field(default='', max_length=3000)


def register_stand_routes(api, db, access):
    def scope(user, **extra):
        return {'workshop_id': user['workshop_id'], **extra}

    async def manager(user, session=None):
        await require_module(db, user, 'stand', session)
        await access.require_workshop_manager(user, session)

    async def record(collection, user, rid, session=None):
        doc = await db[collection].find_one(scope(user, id=rid), {'_id': 0}, session=session)
        if not doc:
            raise HTTPException(404, 'Registo não encontrado nesta empresa.')
        return doc

    async def inventory_payload(body, user, session, exclude=None):
        doc = body.model_dump(mode='json')
        doc['license_plate'] = body.license_plate.upper()
        doc['plate_key'] = identity(body.license_plate)
        if not doc['plate_key']:
            raise HTTPException(422, 'Indique uma matrícula válida.')
        q = scope(user, plate_key=doc['plate_key'])
        if exclude:
            q['id'] = {'$ne': exclude}
        if await db.stand_inventory.find_one(q, {'_id': 0, 'id': 1}, session=session):
            raise HTTPException(409, 'Esta viatura já existe no inventário do Stand.')
        existing = await db.vehicles.find_one(scope(user, plate_key=doc['plate_key']), {'_id': 0}, session=session)
        if body.vehicle_id:
            linked = await record('vehicles', user, body.vehicle_id, session)
            if identity(linked['license_plate']) != doc['plate_key']:
                raise HTTPException(422, 'A matrícula não corresponde à viatura partilhada.')
            doc['vehicle_id'] = linked['id']
        elif existing:
            doc['vehicle_id'] = existing['id']
        return doc

    @api.get('/stand/dashboard')
    async def dashboard(user=Depends(access.stand)):
        result = {status: await db.stand_inventory.count_documents(scope(user, status=status))
                  for status in ('disponivel', 'reservado', 'vendido', 'retirado')}
        result['leads'] = await db.stand_leads.count_documents(scope(user, status={'$ne': 'fechado'}))
        result['can_manage'] = await access.is_workshop_manager(user)
        if result['can_manage']:
            rows = await db.stand_sales.find(scope(user), {'_id': 0, 'amount': 1, 'purchase_price': 1}).to_list(None)
            result['sales_total'] = float(sum((money(r['amount']) for r in rows), Decimal(0)))
            result['margin_total'] = float(sum((money(r['amount'])-money(r['purchase_price']) for r in rows), Decimal(0)))
        return result

    @api.get('/stand/inventory')
    async def inventory(search: str = '', status: str = '', limit: int = 1000, user=Depends(access.stand)):
        if not 1 <= limit <= 1000:
            raise HTTPException(422, 'Paginação inválida.')
        q = scope(user)
        if status:
            if status not in ('disponivel', 'reservado', 'vendido', 'retirado'):
                raise HTTPException(422, 'Estado inválido.')
            q['status'] = status
        if search.strip():
            rx = {'$regex': re.escape(search.strip()), '$options': 'i'}
            q['$or'] = [{key: rx} for key in ('license_plate', 'make', 'model')]
        fields = {'_id': 0} if await access.is_workshop_manager(user) else {'_id': 0, 'purchase_price': 0}
        return await db.stand_inventory.find(q, fields).sort('created_at', -1).to_list(limit)

    @api.get('/stand/inventory/{rid}')
    async def inventory_detail(rid: str, user=Depends(access.stand)):
        doc = await record('stand_inventory', user, rid)
        if not await access.is_workshop_manager(user):
            doc.pop('purchase_price', None)
        return doc

    @api.post('/stand/inventory', status_code=201)
    async def create_inventory(body: InventoryBody, user=Depends(access.stand)):
        async def operation(session):
            await manager(user, session)
            # Serialize identity insertion on MongoDB; SQL additionally has a unique key.
            await db.workshops.update_one({'id': user['workshop_id']}, {'$inc': {'stand_revision': 1}}, session=session)
            doc = {**scope(user), **await inventory_payload(body, user, session), 'id': identifier(), 'created_at': timestamp(), 'updated_at': timestamp()}
            await db.stand_inventory.insert_one(doc, session=session)
            await access.audit(user, 'stand.vehicle.created', user['workshop_id'], doc['id'], session=session)
            doc.pop('_id', None)
            return doc
        return await transact(db, operation)

    @api.put('/stand/inventory/{rid}')
    async def edit_inventory(rid: str, body: InventoryBody, user=Depends(access.stand)):
        async def operation(session):
            await manager(user, session)
            old = await record('stand_inventory', user, rid, session)
            if old['status'] == 'vendido':
                raise HTTPException(409, 'Uma venda registada não pode ser alterada através do inventário.')
            update = {**await inventory_payload(body, user, session, rid), 'updated_at': timestamp()}
            result = await db.stand_inventory.update_one(scope(user, id=rid, status={'$ne': 'vendido'}), {'$set': update}, session=session)
            if not result.matched_count:
                raise HTTPException(409, 'A viatura foi vendida entretanto. Atualize os dados.')
            await access.audit(user, 'stand.vehicle.updated', user['workshop_id'], rid,
                               details={'previous_status': old['status'], 'status': body.status}, session=session)
            return {'ok': True}
        return await transact(db, operation)

    @api.get('/stand/leads')
    async def leads(user=Depends(access.stand)):
        rows = await db.stand_leads.find(scope(user), {'_id': 0}).sort('created_at', -1).to_list(1000)
        clients = {c['id']: c['name'] for c in await db.clients.find(scope(user, id={'$in': [r['client_id'] for r in rows]}), {'_id': 0, 'id': 1, 'name': 1}).to_list(1000)}
        vehicles = {v['id']: v['license_plate'] for v in await db.stand_inventory.find(scope(user, id={'$in': [r.get('inventory_id') for r in rows if r.get('inventory_id')]}), {'_id': 0, 'id': 1, 'license_plate': 1}).to_list(1000)}
        return [{**r, 'client_name': clients.get(r['client_id']), 'license_plate': vehicles.get(r.get('inventory_id'))} for r in rows]

    async def save_lead(body, user, rid=None):
        async def operation(session):
            await require_module(db, user, 'stand', session)
            await record('clients', user, body.client_id, session)
            if body.inventory_id:
                await record('stand_inventory', user, body.inventory_id, session)
            if rid:
                await record('stand_leads', user, rid, session)
                await db.stand_leads.update_one(scope(user, id=rid), {'$set': {**body.model_dump(), 'updated_at': timestamp()}}, session=session)
                doc = {'id': rid}
            else:
                doc = {**scope(user), **body.model_dump(), 'id': identifier(), 'created_at': timestamp(), 'updated_at': timestamp()}
                await db.stand_leads.insert_one(doc, session=session)
                doc.pop('_id', None)
            await access.audit(user, 'stand.lead.updated' if rid else 'stand.lead.created', user['workshop_id'], doc['id'], session=session)
            return doc
        return await transact(db, operation)

    @api.post('/stand/leads', status_code=201)
    async def create_lead(body: LeadBody, user=Depends(access.stand)):
        return await save_lead(body, user)

    @api.put('/stand/leads/{rid}')
    async def edit_lead(rid: str, body: LeadBody, user=Depends(access.stand)):
        return await save_lead(body, user, rid)

    @api.get('/stand/sales')
    async def sales(user=Depends(access.stand)):
        await manager(user)
        return await db.stand_sales.find(scope(user), {'_id': 0}).sort('created_at', -1).to_list(1000)

    @api.post('/stand/sales', status_code=201)
    async def sell(body: SaleBody, user=Depends(access.stand)):
        async def operation(session):
            await manager(user, session)
            # Writes on the company serialize idempotency and shared vehicle identity.
            await db.workshops.update_one({'id': user['workshop_id']}, {'$inc': {'stand_revision': 1}}, session=session)
            request_hash = fingerprint(body.model_dump(mode='json'))
            previous = await db.stand_sales.find_one(scope(user, idempotency_key=body.idempotency_key), {'_id': 0}, session=session)
            if previous:
                if previous['request_hash'] != request_hash:
                    raise HTTPException(409, 'Este pedido já foi utilizado com outros dados.')
                return previous
            item = await record('stand_inventory', user, body.inventory_id, session)
            buyer = await record('clients', user, body.client_id, session)
            changed = await db.stand_inventory.update_one(scope(user, id=item['id'], status={'$in': ['disponivel', 'reservado']}),
                                                         {'$set': {'status': 'vendido', 'updated_at': timestamp()}}, session=session)
            if not changed.matched_count:
                raise HTTPException(409, 'A viatura já foi vendida ou não está disponível.')
            vehicle = await db.vehicles.find_one(scope(user, plate_key=item['plate_key']), {'_id': 0}, session=session)
            if vehicle:
                if vehicle['client_id'] != buyer['id']:
                    # Preserve history ownership rather than exposing the previous owner's records.
                    raise HTTPException(409, 'A viatura partilhada pertence a outro cliente. Reveja a titularidade antes da venda.')
                vid = vehicle['id']
            else:
                vehicle = {**scope(user), 'id': identifier(), 'client_id': buyer['id'],
                           **{key: item.get(key) for key in ('license_plate', 'make', 'model', 'year', 'vin', 'fuel', 'mileage')},
                           'created_at': timestamp(), 'updated_at': timestamp()}
                await prevent_duplicate(db, 'vehicles', vehicle, session)
                await db.vehicles.insert_one(vehicle, session=session)
                vid = vehicle['id']
            await db.stand_inventory.update_one(scope(user, id=item['id']), {'$set': {'vehicle_id': vid}}, session=session)
            doc = {**scope(user), **body.model_dump(mode='json'), 'id': identifier(), 'vehicle_id': vid,
                   'purchase_price': item['purchase_price'], 'actor_id': user['id'], 'created_at': timestamp(),
                   'request_hash': request_hash, 'snapshot': {'license_plate': item['license_plate'], 'make': item['make'], 'model': item['model'], 'client_name': buyer['name']}}
            await db.stand_sales.insert_one(doc, session=session)
            await db.stand_leads.update_many(scope(user, inventory_id=item['id'], client_id=buyer['id']), {'$set': {'status': 'fechado', 'updated_at': timestamp()}}, session=session)
            await access.audit(user, 'stand.sale.created', user['workshop_id'], doc['id'], details={'inventory_id': item['id'], 'vehicle_id': vid}, session=session)
            doc.pop('_id', None)
            return doc
        return await transact(db, operation)

    @api.get('/stand/history')
    async def history(user=Depends(access.stand)):
        await manager(user)
        return await db.admin_support_audit.find(scope(user, action={'$regex': '^stand\\.'}), {'_id': 0}).sort('created_at', -1).to_list(1000)

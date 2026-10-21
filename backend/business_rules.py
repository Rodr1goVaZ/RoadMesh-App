"""Shared normalization, money, permission and calendar rules."""
import hashlib
import json
import math
import re
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from fastapi import HTTPException


def text(value):
    return re.sub(r'\s+', ' ', str(value or '').strip()).lower()


def identity(value):
    return re.sub('[^A-Z0-9]', '', str(value or '').upper())


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, default=str).encode()).hexdigest()


def money(value):
    n = Decimal(str(value))
    if not n.is_finite():
        raise HTTPException(422, 'Valor monetário inválido.')
    return n.quantize(Decimal('.01'), rounding=ROUND_HALF_UP)


def year_scope(year, field='created_at'):
    if year is None:
        return {}
    if not 2000 <= year <= 2100:
        raise HTTPException(422, 'Ano inválido.')
    zone = ZoneInfo('Europe/Lisbon')
    return {field: {'$gte': datetime(year,1,1,tzinfo=zone).astimezone(ZoneInfo('UTC')).isoformat(),
        '$lt': datetime(year+1,1,1,tzinfo=zone).astimezone(ZoneInfo('UTC')).isoformat()}}


def normalized_keys(collection,doc):
    if collection == 'clients':
        return {'nif_key':identity(doc.get('nif')) or None,
            'identity_key':json.dumps([text(doc.get(k)) for k in ('name','nif','phone','email','address')],ensure_ascii=False)}
    if collection == 'vehicles':
        return {'plate_key':identity(doc.get('license_plate')) or None,'vin_key':identity(doc.get('vin')) or None}
    if collection == 'products':
        return {'reference_key':text(doc.get('reference')).upper() or None,'barcode_key':identity(doc.get('barcode')) or None}
    return {}


async def prevent_duplicate(db, collection, doc, session, exclude=None):
    tests = normalized_keys(collection,doc).items()
    scope = {'workshop_id':doc['workshop_id']}
    if exclude:
        scope['id'] = {'$ne':exclude}
    for key,value in tests:
        if not value:
            doc[key] = None
            continue
        doc[key] = value
        # Reads under the same transaction; unique indexes also protect concurrent writes.
        if await db[collection].find_one({**scope,key:value},{'_id':0,'id':1},session=session):
            raise HTTPException(409, 'Já existe um registo nesta oficina com este identificador ou com os mesmos dados.')


async def validate_prices(db, access, user, items, session, previous=()):
    if await access.is_workshop_manager(user,session):
        return
    def key(it):
        return (it.get('item_type'), it.get('product_id'), it.get('description'),
            Decimal(str(it.get('unit_price',0))), Decimal(str(it.get('vat_rate',23))))
    preserved = {key(it) for it in previous}
    workshop = await db.workshops.find_one({'id':user['workshop_id']},{'_id':0},session=session)
    for item in items:
        item = item.model_dump() if hasattr(item,'model_dump') else item
        if key(item) in preserved:
            continue
        if item.get('item_type') == 'mao_de_obra' and workshop.get('labor_hour_rate') is not None:
            price, vat = workshop['labor_hour_rate'], workshop.get('labor_vat_rate',23)
        elif item.get('item_type') == 'peca' and item.get('product_id'):
            product = await db.products.find_one({'id':item['product_id'],'workshop_id':user['workshop_id']},{'_id':0},session=session)
            if not product:
                raise HTTPException(404,'Produto não encontrado.')
            price, vat = product['sale_price'], product['vat_rate']
        else:
            raise HTTPException(403,'Só o responsável pode definir preços avulsos. Utilize o catálogo ou o preço/hora configurado.')
        if Decimal(str(item['unit_price'])) != Decimal(str(price)) or Decimal(str(item.get('vat_rate',23))) != Decimal(str(vat)):
            raise HTTPException(403,'O preço e o IVA devem corresponder aos valores autorizados pela oficina.')


def suggested_restock(product):
    return max(1, math.ceil(2 * float(product['min_stock']) - float(product['stock'])))


def sale_from_margin(cost, margin):
    """Gross margin is a percentage of sale price, rounded once to cents."""
    cost, margin = money(cost), Decimal(str(margin))
    if cost < 0 or not margin.is_finite() or not Decimal(0) <= margin < Decimal(100):
        raise HTTPException(422,'O custo deve ser positivo e a margem deve estar entre 0 e menos de 100%.')
    return money(cost / (Decimal(1)-margin/100))

"""Append-only platform receipts and assistance; monthly metadata is a projection."""
import hashlib
import json
from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import Depends, HTTPException
from pydantic import Field, model_validator

from roadmesh.core.access_control import StrictModel, identifier, timestamp
from roadmesh.infrastructure.database.integrity import transact

BUCKETS = ('billed', 'received', 'hours_used')


class MovementBody(StrictModel):
    kind: Literal['payment', 'payment_reversal', 'assistance', 'assistance_reversal']
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    occurred_on: date
    reference: str = Field(min_length=1, max_length=200)
    method: str = Field(default='', max_length=100)
    note: str = Field(min_length=5, max_length=1000)
    idempotency_key: str = Field(min_length=8, max_length=100, pattern=r'^[A-Za-z0-9_-]+$')
    reverses_id: UUID | None = None

    @model_validator(mode='after')
    def validate_details(self):
        if not self.reference.strip() or len(self.note.strip()) < 5:
            raise ValueError('Indique uma referência e uma descrição com pelo menos 5 caracteres.')
        if self.kind == 'payment' and not self.method.strip():
            raise ValueError('Indique o método do pagamento.')
        if self.kind.endswith('_reversal') != (self.reverses_id is not None):
            raise ValueError('Um estorno tem de indicar o movimento original.')
        return self


async def locked_company(db, wid, session):
    touched = await db.workshops.update_one({'id': wid}, {'$inc': {'platform_service_revision': 1}}, session=session)
    if not touched.matched_count:
        raise HTTPException(404, 'Empresa não encontrada.')
    company = await db.workshops.find_one({'id': wid}, {'_id': 0}, session=session)
    if company['status'] == 'archived':
        raise HTTPException(409, 'Uma empresa arquivada mantém os registos para consulta.')
    return company


async def ensure_period(db, company, key, account, session):
    """Import an old aggregate once; its payment/service dates remain unknown."""
    scope = {'workshop_id': company['id'], 'period': key}
    period = await db.platform_service_periods.find_one(scope, {'_id': 0}, session=session)
    if period:
        return period
    old = company.get('platform_service_months', {}).get(key)
    period = {'id': identifier(), **scope, 'created_at': timestamp()}
    await db.platform_service_periods.insert_one(period, session=session)
    if old:
        for bucket in BUCKETS:
            value = Decimal(str(old.get(bucket, 0)))
            if value:
                await append(db, period, account, session, bucket=bucket, amount=value,
                             kind='opening', note='Saldo anterior importado; data do movimento original desconhecida.',
                             idempotency_key=f'opening:{period["id"]}:{bucket}')
    return period


async def append(db, period, account, session, **values):
    movement = {'id': identifier(), 'workshop_id': period['workshop_id'], 'period_id': period['id'],
                'actor_id': account['id'], 'created_at': timestamp(), 'occurred_on': None,
                'reference': '', 'method': '', 'reverses_id': None, **values}
    movement['amount'] = str(movement['amount'])
    await db.platform_service_movements.insert_one(movement, session=session)
    movement.pop('_id', None)
    return movement


async def totals(db, period, session):
    entries = await db.platform_service_movements.find({'period_id': period['id'], 'workshop_id': period['workshop_id']}, {'_id': 0}, session=session).to_list(None)
    result = {key: Decimal(0) for key in BUCKETS}
    for entry in entries:
        result[entry['bucket']] += Decimal(str(entry['amount']))
    return result


async def project_month(db, company, period, record, session):
    values = await totals(db, period, session)
    if any(value < 0 for value in values.values()) or values['received'] > values['billed']:
        raise HTTPException(409, 'O movimento produz um saldo inválido ou excede o valor por receber.')
    record = {**record, **{key: str(value.quantize(Decimal('0.01'))) for key, value in values.items()}}
    entries = dict(company.get('platform_service_months', {}))
    entries[period['period']] = record
    await db.workshops.update_one({'id': company['id']}, {'$set': {'platform_service_months': entries}}, session=session)
    return record


async def save_month(db, access, wid, key, body, account):
    async def operation(session):
        company = await locked_company(db, wid, session)
        previous = company.get('platform_service_months', {}).get(key)
        if body.revision != (previous or {}).get('revision', 0):
            raise HTTPException(409, 'Este mês foi alterado por outro administrador. Atualize os dados antes de guardar.')
        period = await ensure_period(db, company, key, account, session)
        current = await totals(db, period, session)
        # Existing receipts/services must change through dated, individually identified movements.
        if previous and any(Decimal(str(getattr(body, k))) != current[k] for k in ('received', 'hours_used')):
            raise HTTPException(409, 'Registe um pagamento, assistência ou estorno no histórico; não substitua os totais.')
        if previous and (body.billed != current['billed'] or body.hours_included != Decimal(str(previous['hours_included']))) and len(body.note.strip()) < 5:
            raise HTTPException(422, 'Explique a alteração da faturação ou das horas incluídas nas notas, com pelo menos 5 caracteres.')
        for bucket in BUCKETS:
            difference = Decimal(str(getattr(body, bucket))) - current[bucket]
            if difference:
                await append(db, period, account, session, bucket=bucket, amount=difference,
                             kind='billing_adjustment' if bucket == 'billed' else 'opening',
                             note=body.note or ('Registo do valor faturado.' if bucket == 'billed' else 'Saldo inicial; data original desconhecida.'),
                             idempotency_key=f'month:{period["id"]}:{body.revision}:{bucket}')
        record = {**body.model_dump(mode='json', exclude={'revision'}), 'revision': body.revision + 1,
                  'updated_at': timestamp(), 'actor_id': account['id']}
        record = await project_month(db, company, period, record, session)
        await access.audit(account, 'platform.service_month.updated', wid, key, details={'before': previous, 'after': record}, session=session)
        return {'ok': True, 'record': record}
    return await transact(db, operation)


def register_ledger(api, db, access):
    @api.get('/admin/workshops/{wid}/service-months/{year}/{month}/movements')
    async def movements(wid: str, year: int, month: int, account=Depends(access.admin)):
        if not 2000 <= year <= 2100 or not 1 <= month <= 12:
            raise HTTPException(422, 'Período inválido.')
        company = await db.workshops.find_one({'id': wid}, {'_id': 0, 'platform_service_months': 1})
        if company is None:
            raise HTTPException(404, 'Empresa não encontrada.')
        key = f'{year:04d}-{month:02d}'
        period = await db.platform_service_periods.find_one({'workshop_id': wid, 'period': key}, {'_id': 0})
        entries = await db.platform_service_movements.find({'workshop_id': wid, 'period_id': period['id']}, {'_id': 0}).sort('created_at', 1).to_list(None) if period else []
        return {'movements': entries, 'legacy_unimported': bool(not period and company.get('platform_service_months', {}).get(key))}

    @api.post('/admin/workshops/{wid}/service-months/{year}/{month}/movements', status_code=201)
    async def create_movement(wid: str, year: int, month: int, body: MovementBody, account=Depends(access.admin)):
        if not 2000 <= year <= 2100 or not 1 <= month <= 12:
            raise HTTPException(422, 'Período inválido.')
        key = f'{year:04d}-{month:02d}'
        payload = body.model_dump(mode='json')
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        async def operation(session):
            company = await locked_company(db, wid, session)
            existing = await db.platform_service_movements.find_one({'workshop_id': wid, 'idempotency_key': str(body.idempotency_key)}, {'_id': 0}, session=session)
            if existing:
                if existing.get('request_hash') != digest or existing.get('period_key') != key:
                    raise HTTPException(409, 'Esta chave já foi usada para outro movimento.')
                return {'ok': True, 'movement': existing, 'record': company.get('platform_service_months', {}).get(key), 'replayed': True}
            previous = company.get('platform_service_months', {}).get(key)
            if not previous:
                raise HTTPException(409, 'Registe primeiro as condições deste mês.')
            period = await ensure_period(db, company, key, account, session)
            amount = body.amount
            bucket = 'received' if body.kind.startswith('payment') else 'hours_used'
            if body.reverses_id:
                original = await db.platform_service_movements.find_one({'id': str(body.reverses_id), 'workshop_id': wid, 'period_id': period['id']}, {'_id': 0}, session=session)
                if not original or original['bucket'] != bucket or original['kind'] not in (body.kind.removesuffix('_reversal'), 'opening') or Decimal(str(original['amount'])) != amount:
                    raise HTTPException(409, 'O estorno deve corresponder integralmente ao pagamento ou assistência original deste mês.')
                if await db.platform_service_movements.find_one({'workshop_id': wid, 'reverses_id': str(body.reverses_id)}, {'_id': 0, 'id': 1}, session=session):
                    raise HTTPException(409, 'Este movimento já foi estornado.')
                if original.get('occurred_on') and body.occurred_on.isoformat() < original['occurred_on']:
                    raise HTTPException(422, 'O estorno não pode anteceder o movimento original.')
                amount = -amount
            movement = await append(db, period, account, session, **{
                **payload, 'amount': amount, 'bucket': bucket, 'request_hash': digest, 'period_key': key})
            record = {**previous, 'revision': previous.get('revision', 0) + 1, 'updated_at': timestamp(), 'actor_id': account['id']}
            record = await project_month(db, company, period, record, session)
            await access.audit(account, 'platform.service_movement.created', wid, movement['id'], details={'period': key, 'movement': movement, 'before': previous, 'after': record}, session=session)
            return {'ok': True, 'movement': movement, 'record': record, 'replayed': False}
        return await transact(db, operation)

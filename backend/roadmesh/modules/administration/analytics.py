"""Internal RoadMesh retainers and assistance hours, separate from workshop sales."""
import calendar
from datetime import date
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import Depends, HTTPException, Query
from pydantic import Field, model_validator

from roadmesh.core.access_control import StrictModel, now, timestamp
from roadmesh.infrastructure.database.integrity import transact


class ServiceMonth(StrictModel):
    billed: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    received: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    hours_included: Decimal = Field(ge=0, max_digits=8, decimal_places=2)
    hours_used: Decimal = Field(ge=0, max_digits=8, decimal_places=2)
    due_date: date | None = None
    note: str = Field(default='', max_length=1000)
    revision: int = Field(default=0, ge=0)

    @model_validator(mode='after')
    def check_received(self):
        if self.received > self.billed:
            raise ValueError('O valor recebido não pode exceder o valor faturado.')
        return self


def period_key(year, month):
    return f'{year:04d}-{month:02d}'


def amount(value):
    return Decimal(str(value or 0))


def summary(records, eligible, today):
    if not records:
        return {'billed': None, 'received': None, 'pending': None, 'hours_included': None,
                'hours_used': None, 'hours_extra': None, 'paid': 0, 'pending_companies': 0,
                'overdue': 0, 'recorded': 0, 'unrecorded': len(eligible)}
    totals = {key: Decimal(0) for key in ('billed', 'received', 'hours_included', 'hours_used')}
    pending = extra = Decimal(0)
    paid, pending_ids, overdue, known = set(), set(), set(), set()
    for wid, record in records:
        known.add(wid)
        for key in totals:
            totals[key] += amount(record.get(key))
        balance = max(amount(record['billed']) - amount(record['received']), Decimal(0))
        pending += balance
        extra += max(amount(record['hours_used']) - amount(record['hours_included']), Decimal(0))
        if balance:
            pending_ids.add(wid)
            if record.get('due_date') and date.fromisoformat(record['due_date']) < today:
                overdue.add(wid)
        elif amount(record['billed']) > 0:
            paid.add(wid)
    return {**{key: float(value) for key, value in totals.items()}, 'pending': float(pending),
            'hours_extra': float(extra), 'paid': len(paid - pending_ids),
            'pending_companies': len(pending_ids), 'overdue': len(overdue),
            'recorded': len(known), 'unrecorded': len(set(eligible) - known)}


def build_analytics(companies, year, month, today):
    selected = period_key(year, month)
    def eligible_at(y, m):
        cutoff = date(y, m, calendar.monthrange(y, m)[1]).isoformat()
        return [c['id'] for c in companies if c['status'] != 'archived' and (c.get('created_at') or '')[:10] <= cutoff]
    eligible = eligible_at(year, month)

    def rows(periods):
        return [(c['id'], record) for c in companies for key, record in c.get('platform_service_months', {}).items() if key in periods]

    def for_period(key):
        return summary(rows({key}), eligible, today)

    months = []
    for number in range(1, 13):
        current = for_period(period_key(year, number))
        previous = for_period(period_key(year - 1, number))
        months.append({'month': number, 'billed': current['billed'], 'received': current['received'],
                       'hours_used': current['hours_used'], 'hours_included': current['hours_included'],
                       'previous_billed': previous['billed'], 'previous_hours_used': previous['hours_used']})
    company_rows = []
    for company in companies:
        record = company.get('platform_service_months', {}).get(selected)
        if company['id'] not in eligible and record is None:
            continue
        balance = max(amount(record['billed']) - amount(record['received']), Decimal(0)) if record else None
        state = 'unrecorded' if record is None else 'pending' if balance else 'paid' if amount(record['billed']) else 'free'
        company_rows.append({'id': company['id'], 'name': company['name'], 'company_status': company['status'],
                             'state': state, 'record': record, 'pending': float(balance) if balance is not None else None})
    previous_month = period_key(year, month - 1) if month > 1 else period_key(year - 1, 12)
    return {'year': year, 'month': month, 'period': selected,
            'summary': for_period(selected), 'previous_month': for_period(previous_month),
            'previous_year_month': for_period(period_key(year - 1, month)),
            'annual': summary(rows({period_key(year, m) for m in range(1, 13)}), eligible_at(year, 12), today),
            'previous_annual': summary(rows({period_key(year - 1, m) for m in range(1, 13)}), eligible_at(year - 1, 12), today),
            'months': months, 'companies': sorted(company_rows, key=lambda row: row['name'].casefold())}


def register_admin_analytics(api, db, access):
    @api.get('/admin/dashboard/analytics')
    async def analytics(year: int = Query(ge=2000, le=2100), month: int = Query(ge=1, le=12), account=Depends(access.admin)):
        companies = await db.workshops.find({}, {'_id': 0, 'id': 1, 'name': 1, 'status': 1,
                                                'created_at': 1, 'platform_service_months': 1}).to_list(None)
        return build_analytics(companies, year, month, now().astimezone(ZoneInfo('Europe/Lisbon')).date())

    @api.put('/admin/workshops/{wid}/service-months/{year}/{month}')
    async def save_month(wid: str, year: int, month: int, body: ServiceMonth, account=Depends(access.admin)):
        if not 2000 <= year <= 2100 or not 1 <= month <= 12:
            raise HTTPException(422, 'Selecione um mês e um ano válidos.')
        key = period_key(year, month)

        async def operation(session):
            # Touch the company before reading: concurrent edits retry with fresh state.
            touched = await db.workshops.update_one({'id': wid}, {'$inc': {'platform_service_revision': 1}}, session=session)
            if not touched.matched_count:
                raise HTTPException(404, 'Empresa não encontrada.')
            company = await db.workshops.find_one({'id': wid}, {'_id': 0}, session=session)
            entries = dict(company.get('platform_service_months', {}))
            previous = entries.get(key)
            if body.revision != (previous or {}).get('revision', 0):
                raise HTTPException(409, 'Este mês foi alterado por outro administrador. Atualize os dados antes de guardar.')
            if company['status'] == 'archived':
                raise HTTPException(409, 'Uma empresa arquivada mantém os registos para consulta.')
            record = {**body.model_dump(mode='json', exclude={'revision'}), 'revision': body.revision + 1,
                      'updated_at': timestamp(), 'actor_id': account['id']}
            entries[key] = record
            await db.workshops.update_one({'id': wid}, {'$set': {'platform_service_months': entries}}, session=session)
            await access.audit(account, 'platform.service_month.updated', wid, key,
                               details={'before': previous, 'after': record}, session=session)
            return {'ok': True, 'record': record}
        return await transact(db, operation)

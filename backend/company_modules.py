"""Company modules share the existing workshop tenant and identity."""
from fastapi import HTTPException


def active_modules(company):
    # An absent configuration is a pre-modular workshop. An invalid explicit
    # configuration must never silently grant access to an additional module.
    value = company.get('modules', ['workshop']) if company else []
    return [name for name in ('workshop', 'stand') if name in value] if isinstance(value, list) else []


async def require_module(db, account, name, session=None):
    company = await db.workshops.find_one({'id': account.get('workshop_id'), 'status': 'active'}, {'_id': 0}, session=session)
    if name not in active_modules(company):
        raise HTTPException(403, 'Este módulo não está ativo para a empresa.')
    return company

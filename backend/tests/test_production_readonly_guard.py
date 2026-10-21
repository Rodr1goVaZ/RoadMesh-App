"""The production inventory helper must force read-only settings and exact target."""
import sys
from pathlib import Path

import pytest
from psycopg.conninfo import conninfo_to_dict

sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
import check_production_readonly as guard  # noqa: E402


@pytest.fixture
def settings(monkeypatch):
    v={'PRODUCTION_PROJECT_REF':guard.PRODUCTION_REF,
        'PRODUCTION_DATABASE_URL':f'postgresql://postgres.{guard.PRODUCTION_REF}:test-password@aws-0-eu-west-1.pooler.supabase.com/postgres'}
    monkeypatch.setattr(guard,'dotenv_values',lambda path:v)
    return v


def test_production_inventory_forces_read_only_and_tls(settings):
    options=conninfo_to_dict(guard.connection())
    assert options['options']=='-c default_transaction_read_only=on'
    assert options['sslmode']=='require'


def test_stricter_certificate_validation_is_preserved(settings):
    settings['PRODUCTION_DATABASE_URL']+='?sslmode=verify-full'
    assert conninfo_to_dict(guard.connection())['sslmode']=='verify-full'


@pytest.mark.parametrize('url',[
    'postgresql://postgres.deozdqnodbmqehkytzms:test@aws-0-eu-west-1.pooler.supabase.com/postgres',
    f'postgresql://postgres.{guard.PRODUCTION_REF}:test@untrusted.example/postgres',
    f'postgresql://postgres.{guard.PRODUCTION_REF}:test@aws-0-eu-west-1.pooler.supabase.com/otherdb',
    '',
])
def test_unconfirmed_or_incomplete_target_is_rejected(settings,url):
    settings['PRODUCTION_DATABASE_URL']=url
    with pytest.raises(ValueError):guard.connection()

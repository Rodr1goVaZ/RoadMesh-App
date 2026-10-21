"""Staging tooling must not accept a production or unrelated database target."""
import sys
from pathlib import Path

import pytest
from psycopg.conninfo import conninfo_to_dict

sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
import check_staging_connection as guard  # noqa: E402


@pytest.fixture
def settings(monkeypatch):
    values={'STAGING_PROJECT_REF':guard.STAGING_REF,
        'STAGING_DATABASE_URL':f'postgresql://postgres.{guard.STAGING_REF}:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
        'STAGING_DATABASE_PASSWORD':'test@password:/?#%'}
    monkeypatch.setattr(guard,'dotenv_values',lambda path:values)
    return values


def test_special_characters_in_private_password_do_not_change_connection_target(settings):
    options=conninfo_to_dict(guard.staging_connection())
    assert options['password']==settings['STAGING_DATABASE_PASSWORD']
    assert options['user']=='postgres.'+guard.STAGING_REF
    assert options['host']=='aws-0-eu-west-1.pooler.supabase.com'
    assert options['sslmode']=='require'


@pytest.mark.parametrize('url',[
    f'postgresql://postgres.{guard.PRODUCTION_REF}:x@aws-0-eu-west-1.pooler.supabase.com/postgres',
    f'postgresql://postgres:x@db.{guard.PRODUCTION_REF}.supabase.co/postgres',
    'postgresql://postgres.other:x@aws-0-eu-west-1.pooler.supabase.com/postgres',
    f'postgresql://postgres.{guard.STAGING_REF}:x@untrusted.example/postgres',
    'postgresql://postgres:x@localhost/postgres',
    f'postgresql://postgres.{guard.STAGING_REF}:x@aws-0-eu-west-1.pooler.supabase.com/production',
])
def test_production_and_unconfirmed_targets_are_rejected(settings,url):
    settings['STAGING_DATABASE_URL']=url
    with pytest.raises(ValueError):guard.staging_connection(read_only=False)


def test_missing_private_password_stops_before_connecting(settings):
    settings['STAGING_DATABASE_PASSWORD']=''
    with pytest.raises(ValueError):guard.staging_connection()


def test_wrong_project_confirmation_is_rejected(settings):
    settings['STAGING_PROJECT_REF']=guard.PRODUCTION_REF
    with pytest.raises(ValueError):guard.staging_connection(read_only=False)

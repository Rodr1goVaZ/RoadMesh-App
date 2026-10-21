"""Read-only connectivity check for the separately identified staging project.

Loads backend/.env.staging.local, never backend/.env. Does not migrate, seed,
change passwords, or print credentials. Only the confirmed test project is allowed.
"""
from pathlib import Path
from urllib.parse import quote

import psycopg
from psycopg.conninfo import conninfo_to_dict, make_conninfo
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
STAGING_REF = 'deozdqnodbmqehkytzms'
PRODUCTION_REF = 'gpzrzmdjcpzhndvqreqa'


def staging_connection(*, read_only=True):
    values = dotenv_values(ROOT / 'backend/.env.staging.local')
    if values.get('STAGING_PROJECT_REF') != STAGING_REF:
        raise ValueError('O projeto de testes não corresponde ao projeto confirmado.')
    url = values.get('STAGING_DATABASE_URL') or ''
    password = values.get('STAGING_DATABASE_PASSWORD')
    if '[YOUR-PASSWORD]' in url:
        if not password:
            raise ValueError('Falta preencher STAGING_DATABASE_PASSWORD no ficheiro privado.')
        url = url.replace('[YOUR-PASSWORD]', quote(password, safe=''))
    if not url:
        raise ValueError('A ligação ainda não foi preenchida no ficheiro privado.')
    options = conninfo_to_dict(url)
    host = options.get('host', '')
    user = options.get('user', '')
    if PRODUCTION_REF in host or PRODUCTION_REF in user:
        raise ValueError('Ligação de produção recusada.')
    direct = host == f'db.{STAGING_REF}.supabase.co' and user == 'postgres'
    pooler = host.endswith('.pooler.supabase.com') and user == f'postgres.{STAGING_REF}'
    if not (direct or pooler):
        raise ValueError('A ligação não identifica inequivocamente o projeto de testes.')
    if options.get('dbname') != 'postgres':
        raise ValueError('Nome de base inesperado; rever a ligação no painel.')
    return make_conninfo(url, sslmode='require', connect_timeout=10,
        options='-c default_transaction_read_only=on' if read_only else '')


def main():
    try:
        url = staging_connection()
    except (ValueError, psycopg.ProgrammingError) as exc:
        # Only our allowlisted validation messages are suitable for output.
        if isinstance(exc, ValueError):
            print(str(exc))
        else:
            print('Formato da ligação inválido. Rever o ficheiro privado.')
        return 2
    try:
        with psycopg.connect(url, prepare_threshold=None) as conn:
            conn.execute('SET TRANSACTION READ ONLY')
            count = conn.execute("SELECT count(*) FROM pg_tables WHERE schemaname='roadmesh'").fetchone()[0]
            read_only = conn.execute('SHOW transaction_read_only').fetchone()[0]
            print(f'Ligação TLS ao projeto de testes confirmada. Tabelas RoadMesh: {count}. Apenas leitura: {read_only}.')
        return 0
    except psycopg.Error:
        print('Não foi possível ligar à base de testes. Verificar preparação do projeto, URI, palavra-passe e rede. Credenciais omitidas.')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())

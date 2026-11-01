"""Apply only migration 006 to the explicitly confirmed staging project.

Requires a private snapshot whose exact local restore + upgrade was verified.
Never reads a production connection. No grants of role membership or data deletion.
"""
import argparse
import hashlib
import json
from pathlib import Path

import psycopg
from psycopg import sql

from check_staging_connection import ROOT, staging_connection
from schema_tables import tables_for_version


def apply(backup, proof, *, execute=False):
    snapshot = json.loads(backup.read_text())
    verification = json.loads(proof.read_text())
    digest = hashlib.sha256(backup.read_bytes()).hexdigest()
    if verification.get('source_sha256') != digest or not verification.get('migration_006_verified_locally'):
        raise ValueError('Falta verificar o restauro e a migração deste backup exato.')
    if not verification.get('all_rows_compared') or not verification.get('constraints_checked'):
        raise ValueError('Backup sem verificação integral.')
    version = 'RoadMesh PostgreSQL schema version 5; private server access'
    if snapshot.get('schema_version') != version:
        raise ValueError('É necessário um backup do esquema 5.')
    tables = tables_for_version(version)
    if set(snapshot.get('tables', {})) != set(tables):
        raise ValueError('Backup incompleto.')
    migration = (ROOT/'backend/sql/006_platform_service_ledger.sql').read_text()
    migration = '\n'.join(line for line in migration.splitlines() if line.strip() not in ('BEGIN;', 'COMMIT;'))
    with psycopg.connect(staging_connection(read_only=not execute), prepare_threshold=None) as conn:
        conn.execute("SET LOCAL lock_timeout='10s'")
        if execute:
            for name in tables:
                conn.execute(sql.SQL('LOCK TABLE roadmesh.{} IN SHARE ROW EXCLUSIVE MODE').format(sql.Identifier(name)))
        actual = conn.execute("SELECT obj_description('roadmesh'::regnamespace,'pg_namespace')").fetchone()[0]
        if actual != version:
            raise ValueError('O esquema remoto não é 5; nenhuma migração aplicada.')
        for name in tables:
            same = conn.execute(sql.SQL("SELECT NOT EXISTS((SELECT to_jsonb(t) FROM roadmesh.{} t EXCEPT ALL SELECT value FROM jsonb_array_elements(%s::jsonb)) UNION ALL (SELECT value FROM jsonb_array_elements(%s::jsonb) EXCEPT ALL SELECT to_jsonb(t) FROM roadmesh.{} t))").format(sql.Identifier(name), sql.Identifier(name)), (json.dumps(snapshot['tables'][name]), json.dumps(snapshot['tables'][name]))).fetchone()[0]
            if not same:
                raise ValueError('Os dados mudaram desde o backup. Atualizar e verificar uma nova cópia.')
        if not execute:
            print('Pré-validação de staging concluída; nenhuma alteração remota.')
            return
        conn.execute(migration, prepare=False)
        if conn.execute("SELECT count(*) FROM pg_tables WHERE schemaname='roadmesh'").fetchone()[0] != 32:
            raise ValueError('Inventário inesperado após a migração; transação revertida.')
    print('Migração 006 gravada exclusivamente no projeto de testes confirmado; 32 tabelas.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=Path, required=True)
    parser.add_argument('--proof', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    try:
        apply(args.backup, args.proof, execute=args.apply)
    except Exception as error:
        print('Migração de staging não concluída: '+type(error).__name__+'. Credenciais e dados omitidos.')
        raise SystemExit(1) from None

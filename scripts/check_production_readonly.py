"""Read-only production inventory/backup, using only its explicit private config.

No migration, account operation, merge, DELETE, UPDATE, GRANT or schema changes.
"""
import argparse
import hashlib
from datetime import datetime,timezone
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict,make_conninfo
from dotenv import dotenv_values

ROOT=Path(__file__).resolve().parents[1]
PRODUCTION_REF='gpzrzmdjcpzhndvqreqa'
BASE='workshops clients users vehicles products appointments quotes work_orders work_order_items quote_items purchase_orders purchase_order_items stock_movements media photos damages invoices counters revoked_sessions login_limits support_sessions admin_support_audit'.split()
EXTRA='suppliers financial_movements order_receipts reorder_needs password_resets'.split()


def connection():
    values=dotenv_values(ROOT/'backend/.env.production.local')
    if values.get('PRODUCTION_PROJECT_REF')!=PRODUCTION_REF:raise ValueError('Projeto de produção não confirmado.')
    url=values.get('PRODUCTION_DATABASE_URL') or ''
    if not url:raise ValueError('Falta guardar PRODUCTION_DATABASE_URL no ficheiro privado.')
    options=conninfo_to_dict(url)
    host,user=options.get('host',''),options.get('user','')
    direct=host==f'db.{PRODUCTION_REF}.supabase.co' and user=='postgres'
    pooled=host.endswith('.pooler.supabase.com') and user==f'postgres.{PRODUCTION_REF}'
    if not (direct or pooled) or options.get('dbname')!='postgres':raise ValueError('Ligação não corresponde inequivocamente à produção confirmada.')
    ssl=options.get('sslmode') if options.get('sslmode') in ('verify-ca','verify-full') else 'require'
    return make_conninfo(url,sslmode=ssl,connect_timeout=10,options='-c default_transaction_read_only=on')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup',action='store_true',help='Save a consistent private snapshot; never changes remote data.')
    args=parser.parse_args()
    with psycopg.connect(connection(),prepare_threshold=None) as conn:
        conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY')
        assert conn.execute('SHOW transaction_read_only').fetchone()[0]=='on'
        version=conn.execute("SELECT obj_description('roadmesh'::regnamespace,'pg_namespace')").fetchone()[0]
        versions={'RoadMesh PostgreSQL schema version 2; private server access':BASE,
            'RoadMesh PostgreSQL schema version 3; private server access':BASE+EXTRA,
            'RoadMesh PostgreSQL schema version 5; private server access':BASE+EXTRA+'stand_inventory stand_leads stand_sales'.split()}
        if version not in versions:raise ValueError('Versão não suportada; nenhuma alteração executada.')
        tables=versions[version]
        actual={r[0] for r in conn.execute("SELECT tablename FROM pg_tables WHERE schemaname='roadmesh'")}
        if actual!=set(tables):raise ValueError('Lista de tabelas inesperada; backup incompleto recusado.')
        counts={t:conn.execute(sql.SQL('SELECT count(*) FROM {}').format(sql.Identifier('roadmesh',t))).fetchone()[0] for t in tables}
        print(f'Produção consultada apenas em leitura: {len(tables)} tabelas, {sum(counts.values())} registos.')
        if args.backup:
            pairs=[]
            for t in tables:
                pairs.extend([sql.Literal(t),sql.SQL("(SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM {} t)").format(sql.Identifier('roadmesh',t))])
            query=sql.SQL("""WITH snapshot AS (SELECT jsonb_build_object({}) AS tables)
              SELECT jsonb_build_object('format','roadmesh-snapshot-v1','created_at',clock_timestamp(),
              'timezone',current_setting('TimeZone'),'schema_version',obj_description('roadmesh'::regnamespace,'pg_namespace'),
              'counts',(SELECT jsonb_object_agg(key,jsonb_array_length(value)) FROM jsonb_each(tables)),
              'tables',tables)::text FROM snapshot""").format(sql.SQL(',').join(pairs))
            raw=conn.execute(query).fetchone()[0]
            folder=ROOT/'.demo/backups'/('production-readonly-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
            folder.mkdir(mode=0o700)
            p=folder/'snapshot.json';p.write_text(raw+'\n');p.chmod(0o600)
            checksum=hashlib.sha256(p.read_bytes()).hexdigest()
            proof=folder/'SHA256.txt';proof.write_text(checksum+'  snapshot.json\n');proof.chmod(0o600)
            print('Snapshot privado guardado em '+str(folder.relative_to(ROOT)))
    return 0


if __name__=='__main__':
    try:raise SystemExit(main())
    except ValueError as error:
        print(str(error));raise SystemExit(2) from None
    except Exception as error:
        print('Consulta de leitura não concluída: '+type(error).__name__+'. Credenciais omitidas.')
        raise SystemExit(1) from None

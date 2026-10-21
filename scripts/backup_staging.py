"""Consistent private backup of all 27 RoadMesh tables from confirmed staging."""
import hashlib
from datetime import datetime,timezone

import psycopg
from psycopg import sql

from check_staging_connection import ROOT,staging_connection

TABLES='workshops clients users vehicles products appointments quotes work_orders work_order_items quote_items purchase_orders purchase_order_items stock_movements media photos damages invoices counters revoked_sessions login_limits support_sessions admin_support_audit suppliers financial_movements order_receipts reorder_needs password_resets'.split()


def main():
    with psycopg.connect(staging_connection(),prepare_threshold=None) as conn:
        conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY')
        actual={r[0] for r in conn.execute("SELECT tablename FROM pg_tables WHERE schemaname='roadmesh'")}
        if actual!=set(TABLES):raise ValueError('Unexpected schema: incomplete backup refused')
        pairs=[]
        for name in TABLES:
            pairs.extend([sql.Literal(name),sql.SQL("(SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM {} t)").format(sql.Identifier('roadmesh',name))])
        query=sql.SQL("""WITH snapshot AS (SELECT jsonb_build_object({}) AS tables)
         SELECT jsonb_build_object('format','roadmesh-snapshot-v1','created_at',clock_timestamp(),
          'timezone',current_setting('TimeZone'),'schema_version',obj_description('roadmesh'::regnamespace,'pg_namespace'),
          'counts',(SELECT jsonb_object_agg(key,jsonb_array_length(value)) FROM jsonb_each(tables)),
          'tables',tables)::text FROM snapshot""").format(sql.SQL(',').join(pairs))
        raw=conn.execute(query).fetchone()[0]
    target=ROOT/'.demo/backups'/('staging-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    target.mkdir(mode=0o700)
    path=target/'snapshot.json'
    path.write_text(raw+'\n');path.chmod(0o600)
    checksum=hashlib.sha256(path.read_bytes()).hexdigest()
    (target/'SHA256.txt').write_text(checksum+'  snapshot.json\n')
    (target/'SHA256.txt').chmod(0o600)
    print('Snapshot consistente de 27 tabelas guardado em privado em '+str(target.relative_to(ROOT)))
    return path


if __name__=='__main__':
    try:main()
    except Exception as error:
        print('Backup não concluído: '+type(error).__name__+'. Credenciais e dados omitidos.')
        raise SystemExit(1) from None

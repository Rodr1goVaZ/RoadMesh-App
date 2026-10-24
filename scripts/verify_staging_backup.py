"""Restore a version-3 snapshot in a disposable local PGlite instance only.

No connection to Supabase, no modification of the source, no data printed.
"""
import argparse
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import psycopg
from psycopg import sql

from backup_staging import ROOT,TABLES
sys.path.insert(0,str(ROOT/'backend/tests'))
from run_local import available_port  # noqa: E402


def verify(snapshot_path,runtime,report_path=None):
    raw=snapshot_path.read_text()
    data=json.loads(raw)
    if data.get('format')!='roadmesh-snapshot-v1' or data.get('schema_version') not in ('RoadMesh PostgreSQL schema version 3; private server access','RoadMesh PostgreSQL schema version 5; private server access'):
        raise ValueError('Unrecognized snapshot version')
    tables = TABLES + ('stand_inventory stand_leads stand_sales'.split() if 'version 5;' in data['schema_version'] else [])
    if set(data.get('tables',{}))!=set(tables) or set(data.get('counts',{}))!=set(tables):
        raise ValueError('Incomplete table set')
    if any(len(data['tables'][t])!=data['counts'][t] for t in tables):
        raise ValueError('Incomplete snapshot')
    with tempfile.TemporaryDirectory(prefix='roadmesh-backup-check-',dir=None) as directory:
        temp=Path(directory);port=available_port()
        modules=runtime.resolve()/'node_modules/@electric-sql'
        script=temp/'embedded.mjs'
        script.write_text(f"import {{PGlite}} from '{(modules/'pglite/dist/index.js').as_uri()}';import {{PGLiteSocketServer}} from '{(modules/'pglite-socket/dist/index.js').as_uri()}';const db=await PGlite.create();const server=new PGLiteSocketServer({{db,host:'127.0.0.1',port:{port}}});await server.start();process.on('SIGTERM',async()=>{{await server.stop();await db.close();process.exit(0);}});")
        with (temp/'engine.log').open('w') as log:
            process=subprocess.Popen(['node',str(script)],stdout=log,stderr=subprocess.STDOUT)
            url=f'postgresql://postgres:postgres@127.0.0.1:{port}/postgres?sslmode=disable'
            try:
                ready=False
                for _ in range(100):
                    try:
                        with psycopg.connect(url,connect_timeout=1):ready=True
                        break
                    except psycopg.OperationalError:time.sleep(.1)
                if not ready:raise RuntimeError('Local verification engine unavailable')
                with psycopg.connect(url,autocommit=True,prepare_threshold=None,cursor_factory=psycopg.ClientCursor) as conn:
                    for role in ('anon','authenticated','service_role'):
                        conn.execute(sql.SQL('CREATE ROLE {} NOLOGIN').format(sql.Identifier(role)))
                    for name in ('001_initial.sql','002_backend_compatibility.sql','003_business_modules.sql','004_runtime_role.sql'):
                        conn.execute((ROOT/'backend/sql'/name).read_text(),prepare=False)
                    if 'version 5;' in data['schema_version']:
                        conn.execute((ROOT/'backend/sql/005_company_modules_stand.sql').read_text(),prepare=False)
                    with conn.transaction():
                        conn.execute("SELECT set_config('TimeZone',%s,true)",(data.get('timezone','UTC'),))
                        for name in tables:
                            table=sql.Identifier('roadmesh',name)
                            record=sql.SQL("value || '{\"logo_media_id\":null}'::jsonb") if name=='workshops' else sql.SQL('value')
                            conn.execute(sql.SQL("INSERT INTO {} SELECT (jsonb_populate_record(NULL::{},{})).* FROM jsonb_array_elements(%s::jsonb->'tables'->%s)").format(table,table,record),(raw,name))
                        conn.execute('SET CONSTRAINTS ALL IMMEDIATE')
                        conn.execute('ALTER TABLE roadmesh.workshops DISABLE TRIGGER touch_updated_at')
                        conn.execute("UPDATE roadmesh.workshops w SET logo_media_id=(v->>'logo_media_id')::uuid FROM jsonb_array_elements(%s::jsonb->'tables'->'workshops') v WHERE w.id=(v->>'id')::uuid",(raw,))
                        conn.execute('ALTER TABLE roadmesh.workshops ENABLE TRIGGER touch_updated_at')
                        conn.execute('SET CONSTRAINTS ALL IMMEDIATE')
                        for name in tables:
                            table=sql.Identifier('roadmesh',name)
                            same=conn.execute(sql.SQL("SELECT NOT EXISTS((SELECT to_jsonb(t) FROM {} t EXCEPT ALL SELECT value FROM jsonb_array_elements(%s::jsonb->'tables'->%s)) UNION ALL (SELECT value FROM jsonb_array_elements(%s::jsonb->'tables'->%s) EXCEPT ALL SELECT to_jsonb(t) FROM {} t))").format(table,table),(raw,name,raw,name)).fetchone()[0]
                            if not same:raise ValueError('Restored data does not match: '+name)
                report={'source':'private supplied snapshot','tables':len(tables),
                    'rows':sum(data['counts'].values()),'all_rows_compared':True,
                    'constraints_checked':True,'restore_engine':'disposable local PGlite',
                    'remote_source_modified':False,'media_bytes_included':False}
                target = report_path or ROOT/'docs/evidencias/restauro-staging.json'
                target.write_text(json.dumps(report,indent=2)+'\n')
                print(json.dumps(report,ensure_ascii=False))
                return 0
            finally:
                process.terminate()
                try:process.wait(timeout=10)
                except subprocess.TimeoutExpired:process.kill();process.wait()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot',type=Path)
    parser.add_argument('--pglite-runtime',type=Path,required=True)
    args=parser.parse_args()
    try:raise SystemExit(verify(args.snapshot,args.pglite_runtime))
    except Exception as error:
        print('Restauro não confirmado: '+type(error).__name__+'. Dados e credenciais omitidos.')
        raise SystemExit(1) from None

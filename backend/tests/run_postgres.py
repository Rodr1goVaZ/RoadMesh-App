"""Disposable real PostgreSQL + API regression suite. Never connects to Supabase.

Requires requirements-dev.txt plus pgserver==0.1.4 (bundled PostgreSQL binaries).
Usage: python tests/run_postgres.py [pytest arguments]
"""
import os
import argparse
import secrets
import subprocess
import sys
import tempfile
from pathlib import Path

import psycopg
import requests
from pgserver.postgres_server import POSTGRES_BIN_PATH

from run_local import ROOT, available_port, wait_for


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pglite-runtime', type=Path, help='Optional Node package directory for embedded PostgreSQL tests; not a multi-process concurrency proof.')
    args, pytest_args = parser.parse_known_args()
    process = None
    embedded = None
    with tempfile.TemporaryDirectory(prefix='roadmesh-pg-test-', dir='/tmp') as directory:
        temp = Path(directory)
        data = temp / 'postgres'
        if args.pglite_runtime:
            modules = args.pglite_runtime.resolve() / 'node_modules' / '@electric-sql'
            script = temp / 'embedded.mjs'
            pg_port = available_port()
            script.write_text(f"""import {{PGlite}} from '{(modules/'pglite/dist/index.js').as_uri()}';
import {{PGLiteSocketServer}} from '{(modules/'pglite-socket/dist/index.js').as_uri()}';
const db = await PGlite.create();
const server = new PGLiteSocketServer({{db, host:'127.0.0.1',port:{pg_port},maxConnections:100}});
await server.start();
process.on('SIGTERM', async()=>{{await server.stop(); await db.close(); process.exit(0);}});
""")
            embedded = subprocess.Popen(['node',str(script)], stdout=(temp/'postgres.log').open('w'), stderr=subprocess.STDOUT)
            base_url = f'postgresql://postgres:postgres@127.0.0.1:{pg_port}/postgres?sslmode=disable'
            def ready():
                try:
                    with psycopg.connect(base_url, connect_timeout=1):
                        return True
                except psycopg.OperationalError:
                    return False
            wait_for(ready, embedded, 'Embedded PostgreSQL')
        else:
            subprocess.run([str(POSTGRES_BIN_PATH/'initdb'), '-D',str(data), '-U','postgres', '-A','trust', '--no-locale', '-E','UTF8'], check=True)
            subprocess.run([str(POSTGRES_BIN_PATH/'pg_ctl'), '-D',str(data), '-l',str(temp/'postgres.log'), '-o',f"-k {temp} -h ''", '-w','start'], check=True)
            base_url = f'postgresql://postgres@/postgres?host={temp}'
        try:
            with psycopg.connect(base_url, autocommit=True) as conn:
                # Supabase's API roles are simulated only inside this isolated server.
                for name in ('anon', 'authenticated', 'service_role'):
                    conn.execute(f'CREATE ROLE {name} NOLOGIN')
                if not embedded:
                    conn.execute('CREATE DATABASE roadmesh_test')
            url = base_url if embedded else f'postgresql://postgres@/roadmesh_test?host={temp}'
            with psycopg.connect(url) as conn:
                for name in ('001_initial.sql', '002_backend_compatibility.sql', '003_business_modules.sql', '004_runtime_role.sql'):
                    conn.execute((ROOT / 'sql' / name).read_text(), prepare=False)
            env = {**os.environ, 'DATABASE_URL':url, 'DATABASE_POOL_SIZE':'4',
                'JWT_SECRET':secrets.token_urlsafe(48),
                'BOOTSTRAP_ADMIN_EMAIL':'admin@roadmesh-test.pt',
                'BOOTSTRAP_ADMIN_PASSWORD':secrets.token_urlsafe(24),
                'STORAGE_DRIVER':'local', 'LOCAL_MEDIA_ROOT':str(temp / 'media'),
                'ROADMESH_TEST_ALLOW_WRITE':'1', 'ROADMESH_TEST_POSTGRES_URL':url,
                'ROADMESH_TEST_EMBEDDED':'1' if embedded else '0',
                'ROADMESH_TEST_MONGO_URL':'', 'ROADMESH_TEST_DB_NAME':'',
                'EXPO_PUBLIC_BACKEND_URL':f'http://127.0.0.1:{available_port()}'}
            port = env['EXPO_PUBLIC_BACKEND_URL'].rsplit(':', 1)[1]
            with (temp / 'api.log').open('w') as log:
                process = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'embedded_api:app' if embedded else 'server:app',
                    '--app-dir',str(ROOT/'tests') if embedded else str(ROOT), '--host','127.0.0.1','--port',port,'--no-access-log'], cwd=ROOT, env=env,
                    stdout=log, stderr=subprocess.STDOUT)
                api = env['EXPO_PUBLIC_BACKEND_URL'] + '/api'
                wait_for(lambda: requests.get(api+'/', timeout=1).status_code == 200, process, 'PostgreSQL API')
                response = requests.post(api+'/auth/admin/login', json={'email':env['BOOTSTRAP_ADMIN_EMAIL'], 'password':env['BOOTSTRAP_ADMIN_PASSWORD']}, timeout=10)
                response.raise_for_status()
                password = secrets.token_urlsafe(24)
                response = requests.post(api+'/auth/change-password', headers={'Authorization':'Bearer '+response.json()['access_token']},
                    json={'current_password':env['BOOTSTRAP_ADMIN_PASSWORD'],'new_password':password}, timeout=10)
                response.raise_for_status()
                env.update(TEST_ADMIN_EMAIL=env['BOOTSTRAP_ADMIN_EMAIL'], TEST_ADMIN_PASSWORD=password)
                result = subprocess.call([sys.executable,'-m','pytest','tests',*pytest_args], cwd=ROOT, env=env)
                if result:
                    print((temp/'api.log').read_text()[-20000:], file=sys.stderr)
                return result
        except Exception:
            if (temp/'api.log').exists():
                print((temp/'api.log').read_text()[-10000:], file=sys.stderr)
            raise
        finally:
            if process:
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            if embedded:
                embedded.terminate()
                try:
                    embedded.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    embedded.kill()
                    embedded.wait()
            else:
                subprocess.run([str(POSTGRES_BIN_PATH/'pg_ctl'), '-D',str(data), '-m','immediate','-w','stop'], check=True, capture_output=True)


if __name__ == '__main__':
    raise SystemExit(main())

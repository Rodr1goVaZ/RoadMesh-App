"""Migrate the explicitly confirmed EMPTY staging project and run API tests.

Never uses backend/.env for its target. No DROP/TRUNCATE or production connection.
"""
import argparse
import os
import secrets
import subprocess
import sys
import tempfile
from pathlib import Path

import psycopg
import requests
from dotenv import dotenv_values

from check_staging_connection import ROOT, STAGING_REF, staging_connection
sys.path.insert(0, str(ROOT/'backend/tests'))
from run_local import available_port, wait_for  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--initialize-empty', action='store_true')
    parser.add_argument('--run-tests', action='store_true')
    parser.add_argument('--media-smoke', action='store_true', help='Run three media API tests with the explicitly approved private staging bucket.')
    parser.add_argument('--without-role-switch', action='store_true', help='Explicit owner decision: do not grant or assume the runtime role; report that test as deselected.')
    args = parser.parse_args()
    url = staging_connection(read_only=False)
    output = ROOT/'.demo/validation'
    output.mkdir(parents=True, exist_ok=True)
    with psycopg.connect(url, prepare_threshold=None) as conn:
        exists = conn.execute("SELECT to_regnamespace('roadmesh') IS NOT NULL").fetchone()[0]
        if args.initialize_empty:
            if exists:
                raise ValueError('O esquema já existe; não será substituído.')
            for filename in ('001_initial.sql','002_backend_compatibility.sql','003_business_modules.sql','004_runtime_role.sql'):
                migration = (ROOT/'backend/sql'/filename).read_text()
                migration = '\n'.join(line for line in migration.splitlines() if line.strip() not in ('BEGIN;','COMMIT;'))
                conn.execute(migration, prepare=False)
            print('Migrações 001–004 preparadas no projeto de testes.', flush=True)
        elif not exists:
            raise ValueError('Falta inicializar explicitamente a base vazia.')
        tables = conn.execute("SELECT count(*) FROM pg_tables WHERE schemaname='roadmesh'").fetchone()[0]
        if tables != 27:
            raise ValueError('Esquema inesperado; parar e rever migrações.')
    print('Esquema de 27 tabelas confirmado e transação gravada.',flush=True)
    if not args.run_tests:
        return 0
    credentials=ROOT/'.demo/staging-test-credentials.env'
    previous=dotenv_values(credentials) if credentials.exists() else {}
    port = available_port()
    with tempfile.TemporaryDirectory(prefix='roadmesh-staging-') as directory:
        temp = Path(directory)
        env = {**os.environ,'DATABASE_URL':url,'DATABASE_POOL_SIZE':'4',
            'JWT_SECRET':secrets.token_urlsafe(48),
            'BOOTSTRAP_ADMIN_EMAIL':'admin@roadmesh-test.pt',
            'BOOTSTRAP_ADMIN_PASSWORD':previous.get('TEST_ADMIN_PASSWORD') or secrets.token_urlsafe(24),
            'STORAGE_DRIVER':'local','LOCAL_MEDIA_ROOT':str(temp/'media'),
            'SMTP_HOST':'','SMTP_USERNAME':'','SMTP_PASSWORD':'','SMTP_FROM':'','PASSWORD_RESET_URL':'',
            'ROADMESH_TEST_ALLOW_WRITE':'1','ROADMESH_TEST_POSTGRES_URL':url,
            'ROADMESH_TEST_EMBEDDED':'0','ROADMESH_TEST_STAGING_PROJECT':STAGING_REF,
            'ROADMESH_TEST_MONGO_URL':'','ROADMESH_TEST_DB_NAME':'',
            'EXPO_PUBLIC_BACKEND_URL':f'http://127.0.0.1:{port}'}
        prefix='staging-media' if args.media_smoke else 'staging'
        if args.media_smoke:
            storage=dotenv_values(ROOT/'backend/.env.staging.local')
            if (storage.get('STAGING_SUPABASE_URL')!='https://deozdqnodbmqehkytzms.supabase.co'
                    or storage.get('STAGING_SUPABASE_STORAGE_BUCKET')!='roadmesh-media'
                    or not storage.get('STAGING_SUPABASE_SERVICE_ROLE_KEY')):
                raise ValueError('Falta a configuração privada do bucket de testes autorizado.')
            env.update(STORAGE_DRIVER='supabase',SUPABASE_URL=storage['STAGING_SUPABASE_URL'],
                SUPABASE_STORAGE_BUCKET=storage['STAGING_SUPABASE_STORAGE_BUCKET'],
                SUPABASE_SERVICE_ROLE_KEY=storage['STAGING_SUPABASE_SERVICE_ROLE_KEY'])
        with (output/(prefix+'-api.log')).open('w') as log:
            process = subprocess.Popen([sys.executable,'-m','uvicorn','server:app','--app-dir',str(ROOT/'backend'),
                '--host','127.0.0.1','--port',str(port),'--no-access-log'],cwd=ROOT/'backend',env=env,stdout=log,stderr=subprocess.STDOUT)
            try:
                api=env['EXPO_PUBLIC_BACKEND_URL']+'/api'
                wait_for(lambda: requests.get(api+'/',timeout=2).status_code==200,process,'Staging API')
                response=requests.post(api+'/auth/admin/login',json={'email':env['BOOTSTRAP_ADMIN_EMAIL'],'password':env['BOOTSTRAP_ADMIN_PASSWORD']},timeout=30)
                response.raise_for_status()
                password=secrets.token_urlsafe(24)
                response=requests.post(api+'/auth/change-password',headers={'Authorization':'Bearer '+response.json()['access_token']},
                    json={'current_password':env['BOOTSTRAP_ADMIN_PASSWORD'],'new_password':password},timeout=30)
                response.raise_for_status()
                env.update(TEST_ADMIN_EMAIL=env['BOOTSTRAP_ADMIN_EMAIL'],TEST_ADMIN_PASSWORD=password)
                credentials.write_text('TEST_ADMIN_EMAIL='+env['BOOTSTRAP_ADMIN_EMAIL']+'\nTEST_ADMIN_PASSWORD='+password+'\n')
                credentials.chmod(0o600)
                with (output/(prefix+'-tests.log')).open('w') as tests:
                    selected=['tests'] if not args.media_smoke else [
                        'tests/test_feature_regression.py::test_media_upload_and_binary_download',
                        'tests/test_feature_regression.py::test_media_tenant_isolation_and_invalid_file',
                        'tests/test_feature_regression.py::test_media_oversize_rejected']
                    command=[sys.executable,'-m','pytest',*selected,'-x','-q']
                    if args.without_role_switch:
                        command.extend(['-k','not test_runtime_role_cannot_rewrite_financial_or_audit_history'])
                    result=subprocess.call(command,cwd=ROOT/'backend',env=env,stdout=tests,stderr=subprocess.STDOUT)
                print(f'Testes remotos terminados: código {result}. Ver .demo/validation/{prefix}-tests.log.',flush=True)
                return result
            finally:
                process.terminate()
                try:process.wait(timeout=15)
                except subprocess.TimeoutExpired:process.kill();process.wait()


if __name__=='__main__':
    try:
        raise SystemExit(main())
    except (psycopg.Error,requests.RequestException,ValueError,RuntimeError) as error:
        print('A preparação parou. Tipo de falha: '+type(error).__name__+'. Rever diagnóstico privado sem publicar credenciais.')
        raise SystemExit(1) from None

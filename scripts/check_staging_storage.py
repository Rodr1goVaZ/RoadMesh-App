"""Private round-trip of one generated JPEG in the approved staging bucket.

No production target, no user photo, no secret output and no object deletion.
"""
import hashlib
import io
import json
import os
import sys
from pathlib import Path
from uuid import uuid4

import requests
from dotenv import dotenv_values
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
from media_storage import init_storage,storage_request  # noqa: E402


def main():
    values=dotenv_values(ROOT/'backend/.env.staging.local')
    expected='https://deozdqnodbmqehkytzms.supabase.co'
    if values.get('STAGING_SUPABASE_URL')!=expected or values.get('STAGING_SUPABASE_STORAGE_BUCKET')!='roadmesh-media':
        print('Configuração de armazenamento não corresponde ao projeto de testes autorizado.')
        return 2
    key=values.get('STAGING_SUPABASE_SERVICE_ROLE_KEY')
    if not key:
        print('Falta guardar STAGING_SUPABASE_SERVICE_ROLE_KEY no ficheiro privado.')
        return 2
    os.environ.update(STORAGE_DRIVER='supabase',SUPABASE_URL=expected,
        SUPABASE_STORAGE_BUCKET='roadmesh-media',SUPABASE_SERVICE_ROLE_KEY=key)
    init_storage()
    buffer=io.BytesIO()
    Image.new('RGB',(16,16),(122,30,43)).save(buffer,format='JPEG')
    content=buffer.getvalue()
    path='roadmesh/uploads/staging-check/'+str(uuid4())+'.jpg'
    result=storage_request('PUT',path,data=content)
    assert result.json()['path']==path
    fetched=storage_request('GET',path).content
    assert hashlib.sha256(fetched).digest()==hashlib.sha256(content).digest()
    public=requests.get(expected+'/storage/v1/object/public/roadmesh-media/'+path,timeout=20)
    assert public.status_code in (400,401,403,404), 'Public object access unexpectedly succeeded'
    report={'project':'RoadMesh-Testes','bucket':'roadmesh-media','synthetic_image':True,
        'image_bytes':len(content),'authenticated_upload':True,'authenticated_read_identical':True,
        'unauthenticated_public_read_status':public.status_code,'object_retained_privately':True,
        'production_modified':False}
    (ROOT/'docs/evidencias/storage-staging-roundtrip.json').write_text(json.dumps(report,indent=2)+'\n')
    (ROOT/'.demo/validation/staging-image-path.txt').write_text(path+'\n')
    print('Imagem fictícia enviada e lida integralmente. Acesso público recusado. Produção intacta.')
    return 0


if __name__=='__main__':
    try:raise SystemExit(main())
    except Exception as error:
        print('Teste de imagem não concluído: '+type(error).__name__+'. Credenciais omitidas.')
        raise SystemExit(1) from None

"""Private image storage; ownership checks are shared by managed and local drivers."""
import io
import logging
import os
import threading
import uuid
import tempfile
from urllib.parse import quote, urlsplit
from pathlib import Path
from datetime import datetime, timezone

import requests
from fastapi import Depends, File, HTTPException, Response, UploadFile
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
_key = None
_lock = threading.Lock()
MAX_UPLOAD = 10 * 1024 * 1024


def local_root():
    return Path(os.environ.get("LOCAL_MEDIA_ROOT", Path(__file__).parent / ".local-media")).resolve()


def storage_configuration(driver=None):
    driver = driver or os.environ.get("STORAGE_DRIVER","managed")
    if driver == "local":
        local_root().mkdir(parents=True,exist_ok=True)
    elif driver == "supabase":
        url = os.environ.get("SUPABASE_URL","").rstrip("/")
        parsed = urlsplit(url)
        if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.query or parsed.fragment:
            raise RuntimeError("Configure a valid HTTPS SUPABASE_URL")
        if not os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or not os.environ.get("SUPABASE_STORAGE_BUCKET"):
            raise RuntimeError("Configure private Supabase Storage credentials and bucket")
    elif driver != "managed":
        raise RuntimeError("STORAGE_DRIVER must be managed, supabase or local")
    return driver


def init_storage():
    if os.environ.get("STORAGE_DRIVER", "managed") == "local":
        local_root().mkdir(parents=True, exist_ok=True)
        return "local"
    if storage_configuration() == "supabase":
        return "supabase"
    if os.environ.get("STORAGE_DRIVER", "managed") != "managed":
        raise RuntimeError("STORAGE_DRIVER must be managed or local")
    return managed_storage_key()


def managed_storage_key():
    global _key
    with _lock:
        if not _key:
            response = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY")}, timeout=30)
            response.raise_for_status()
            _key = response.json()["storage_key"]
    return _key


def storage_request(method, path, content_type="image/jpeg", provider=None, **kwargs):
    provider = provider or os.environ.get("STORAGE_DRIVER","managed")
    if provider == "supabase":
        return supabase_request(method,path,content_type,**kwargs)
    if provider == "local":
        return local_request(method, path, content_type, **kwargs)
    global _key
    for attempt in range(2):
        response = requests.request(method, f"{STORAGE_URL}/objects/{path}",
                                    headers={"X-Storage-Key": managed_storage_key(), "Content-Type": content_type},
                                    timeout=60, **kwargs)
        if response.status_code == 503 and attempt == 0:
            _key = None
            continue
        response.raise_for_status()
        return response


def supabase_request(method,path,content_type="image/jpeg",**kwargs):
    if not path or path.startswith('/') or any(p in ('','..','.') for p in path.split('/')):
        raise HTTPException(422,"Caminho de fotografia inválido.")
    storage_configuration("supabase")
    base=os.environ['SUPABASE_URL'].rstrip('/')+'/storage/v1/object/'
    bucket=quote(os.environ['SUPABASE_STORAGE_BUCKET'],safe='')
    key=os.environ['SUPABASE_SERVICE_ROLE_KEY']
    headers={'Authorization':'Bearer '+key,'apikey':key,'Content-Type':content_type}
    response=requests.request('POST' if method=='PUT' else method,
        base+bucket+'/'+quote(path,safe='/'),headers=headers,timeout=30,**kwargs)
    response.raise_for_status()
    if method=='PUT':
        # Normalize provider responses; never send its bucket URL or credentials to clients.
        import json
        result=requests.Response();result.status_code=200;result._content=json.dumps({'path':path}).encode()
        return result
    return response


def local_request(method, path, content_type="image/jpeg", **kwargs):
    """Keep the existing storage interface; files never have a public static route."""
    root = local_root()
    destination = (root / path).resolve()
    if not path or destination == root or not destination.is_relative_to(root):
        raise HTTPException(422, "Caminho de fotografia inválido.")
    response = requests.Response()
    response.status_code = 200
    response.headers["Content-Type"] = content_type
    if method == "PUT":
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as handle:
                temporary = Path(handle.name)
                handle.write(kwargs["data"])
            temporary.replace(destination)
        finally:
            if temporary and temporary.exists():
                temporary.unlink()
        import json
        response._content = json.dumps({"path": path}).encode()
    elif method == "GET":
        try:
            response._content = destination.read_bytes()
        except FileNotFoundError as exc:
            raise HTTPException(404, "Fotografia não encontrada.") from exc
    else:
        raise ValueError("Unsupported local storage operation")
    return response


def prepare_image(data):
    try:
        image = Image.open(io.BytesIO(data))
        if image.width * image.height > 40_000_000:
            raise ValueError("Image too large")
        from PIL import ImageOps
        image = ImageOps.exif_transpose(image)
        image.thumbnail((1800, 1800))
        image = image.convert("RGB")
        output = io.BytesIO()
        image.save(output, "JPEG", quality=82, optimize=True)
        return output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(422, "Fotografia inválida. Escolha uma imagem JPEG, PNG ou WebP.") from exc


def storage_failure(exc):
    logging.getLogger("roadmesh").error("Photo storage failed: %s", type(exc).__name__)
    code = exc.response.status_code if isinstance(exc, requests.HTTPError) and exc.response is not None else 503
    if code == 402:
        return HTTPException(402, "Não foi possível guardar a foto: armazenamento temporariamente indisponível.")
    return HTTPException(503, "Não foi possível aceder à fotografia. Tente novamente mais tarde.")


def register_media_routes(api, db, access):
    @api.post("/media", status_code=201)
    async def upload_media(file: UploadFile = File(...), user=Depends(access.media_actor)):
        if user["role"] == "client":
            raise HTTPException(403, "Apenas a oficina pode carregar fotografias.")
        raw = await file.read(MAX_UPLOAD + 1)
        await file.close()
        if len(raw) > MAX_UPLOAD:
            raise HTTPException(413, "A fotografia não pode exceder 10 MB.")
        image = await run_in_threadpool(prepare_image, raw)
        media_id = str(uuid.uuid4())
        path = f"roadmesh/uploads/{user['id']}/{media_id}.jpg"
        try:
            result = await run_in_threadpool(storage_request, "PUT", path, data=image)
        except (requests.RequestException, OSError) as exc:
            raise storage_failure(exc) from exc
        doc = {"id": media_id, "workshop_id": user["workshop_id"], "owner_id": user["id"],
               "storage_path": result.json()["path"], "content_type": "image/jpeg",
               "storage_provider":os.environ.get("STORAGE_DRIVER","managed"), "size": len(image), "created_at": datetime.now(timezone.utc).isoformat()}
        await db.media.insert_one(doc)
        return {"id": media_id, "size": len(image)}

    @api.get("/media/{media_id}")
    async def download_media(media_id: str, user=Depends(access.media_actor)):
        scope = {"id": media_id}
        if user["role"] != "admin":
            scope["workshop_id"] = user["workshop_id"]
        doc = await db.media.find_one(scope, {"_id": 0})
        if user["role"] == "client":
            vehicles = await db.vehicles.find({"client_id": user["client_id"], "workshop_id": user["workshop_id"]}, {"_id": 0, "id": 1}).to_list(1000)
            relation = {"workshop_id": user["workshop_id"], "vehicle_id": {"$in": [v["id"] for v in vehicles]}, "media_id": media_id}
            allowed = await db.photos.find_one(relation, {"_id": 0, "id": 1}) or await db.damages.find_one(relation, {"_id": 0, "id": 1})
            logo = await db.workshops.find_one({"id": user["workshop_id"], "logo_media_id": media_id}, {"_id": 0, "id": 1})
            if logo:
                doc = await db.media.find_one({"id": media_id}, {"_id": 0})
            if not allowed and not logo:
                raise HTTPException(404, "Fotografia não encontrada")
        if not doc:
            raise HTTPException(404, "Fotografia não encontrada")
        try:
            response = await run_in_threadpool(storage_request, "GET", doc["storage_path"], provider=doc.get("storage_provider"))
        except (requests.RequestException, OSError) as exc:
            raise storage_failure(exc) from exc
        return Response(response.content, media_type=doc["content_type"],
                        headers={"Cache-Control": "private, max-age=3600", "Vary": "Authorization", "X-Content-Type-Options": "nosniff"})
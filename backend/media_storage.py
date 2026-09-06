"""Private managed object storage; MongoDB only holds ownership and metadata."""
import io
import logging
import os
import threading
import uuid
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


def init_storage():
    global _key
    with _lock:
        if not _key:
            response = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY")}, timeout=30)
            response.raise_for_status()
            _key = response.json()["storage_key"]
    return _key


def storage_request(method, path, content_type="image/jpeg", **kwargs):
    global _key
    for attempt in range(2):
        response = requests.request(method, f"{STORAGE_URL}/objects/{path}",
                                    headers={"X-Storage-Key": init_storage(), "Content-Type": content_type},
                                    timeout=60, **kwargs)
        if response.status_code == 503 and attempt == 0:
            _key = None
            continue
        response.raise_for_status()
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


def register_media_routes(api, db, current_user):
    @api.post("/media", status_code=201)
    async def upload_media(file: UploadFile = File(...), user=Depends(current_user)):
        raw = await file.read(MAX_UPLOAD + 1)
        await file.close()
        if len(raw) > MAX_UPLOAD:
            raise HTTPException(413, "A fotografia não pode exceder 10 MB.")
        image = await run_in_threadpool(prepare_image, raw)
        media_id = str(uuid.uuid4())
        path = f"roadmesh/uploads/{user['id']}/{media_id}.jpg"
        try:
            result = await run_in_threadpool(storage_request, "PUT", path, data=image)
        except requests.RequestException as exc:
            raise storage_failure(exc) from exc
        doc = {"id": media_id, "workshop_id": user["workshop_id"], "owner_id": user["id"],
               "storage_path": result.json()["path"], "content_type": "image/jpeg",
               "size": len(image), "created_at": datetime.now(timezone.utc).isoformat()}
        await db.media.insert_one(doc)
        return {"id": media_id, "size": len(image)}

    @api.get("/media/{media_id}")
    async def download_media(media_id: str, user=Depends(current_user)):
        doc = await db.media.find_one({"id": media_id, "workshop_id": user["workshop_id"]}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Fotografia não encontrada")
        try:
            response = await run_in_threadpool(storage_request, "GET", doc["storage_path"])
        except requests.RequestException as exc:
            raise storage_failure(exc) from exc
        return Response(response.content, media_type=doc["content_type"],
                        headers={"Cache-Control": "private, max-age=3600", "Vary": "Authorization", "X-Content-Type-Options": "nosniff"})
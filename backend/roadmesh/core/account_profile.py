"""Personal account settings, independent of company and customer contact records."""
import base64
import warnings
from io import BytesIO

from fastapi import Depends, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import Field
from pymongo import ReturnDocument
from starlette.concurrency import run_in_threadpool

from roadmesh.core.identifiers import timestamp

MAX_AVATAR_BYTES = 5 * 1024 * 1024


def avatar_data_url(data):
    """Store a small, re-encoded portrait without EXIF or executable content."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as source:
                if source.format not in {"JPEG", "PNG", "WEBP"}:
                    raise ValueError("unsupported image")
                if source.width * source.height > 20_000_000:
                    raise ValueError("image too large")
                portrait = ImageOps.exif_transpose(source)
                portrait = ImageOps.fit(portrait, (256, 256)).convert("RGBA")
                background = Image.new("RGB", portrait.size, "white")
                background.paste(portrait, mask=portrait.getchannel("A"))
                output = BytesIO()
                background.save(output, format="JPEG", quality=85, optimize=True)
        return "data:image/jpeg;base64," + base64.b64encode(output.getvalue()).decode("ascii")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise HTTPException(422, "Escolha uma fotografia JPEG, PNG ou WebP válida, com até 20 megapíxeis.") from exc


def register_account_routes(api, access):
    # Imported here to keep access_control's route registration free of a cycle.
    from roadmesh.core.access_control import StrictModel

    class ProfileBody(StrictModel):
        name: str = Field(min_length=1, max_length=120)

    current_account = Depends(access.identity)

    async def save(account, changes):
        await access.ready(account)
        updated = await access.db.users.find_one_and_update(
            {"id": account["id"], "session_version": account.get("session_version", 0)},
            {"$set": {**changes, "updated_at": timestamp()}},
            projection={"_id": 0}, return_document=ReturnDocument.AFTER,
        )
        if not updated:
            raise HTTPException(401, "Sessão alterada. Entre novamente.")
        return await access.public(updated)

    @api.put("/auth/me")
    async def update_profile(body: ProfileBody, account=current_account):
        return await save(account, {"name": body.name})

    @api.post("/auth/me/avatar")
    async def upload_avatar(file: UploadFile, account=current_account):
        await access.ready(account)
        try:
            data = await file.read(MAX_AVATAR_BYTES + 1)
        finally:
            await file.close()
        if len(data) > MAX_AVATAR_BYTES:
            raise HTTPException(413, "A fotografia não pode exceder 5 MB.")
        avatar = await run_in_threadpool(avatar_data_url, data)
        return await save(account, {"avatar_url": avatar})

    @api.delete("/auth/me/avatar")
    async def remove_avatar(account=current_account):
        return await save(account, {"avatar_url": None})

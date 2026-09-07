"""Platform administration and staff-managed end-customer accounts."""
import hashlib
import secrets
from datetime import timedelta
from typing import Literal, Optional

from fastapi import Depends, HTTPException
from pydantic import EmailStr, Field
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool
from access_control import StrictModel, identifier, now, password_hash, timestamp


class WorkshopBody(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    nif: str = Field(default="", max_length=30)
    address: str = Field(default="", max_length=300)
    email: Optional[EmailStr] = None
    manager_name: str = Field(min_length=2, max_length=100)
    manager_email: EmailStr
    logo_media_id: Optional[str] = None


class UserBody(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    is_active: bool = True


class StatusBody(StrictModel):
    status: Literal["active", "disabled"]


class SupportBody(StrictModel):
    reason: str = Field(min_length=5, max_length=300)


def register_admin_routes(api, db, access):
    async def workshop_doc(wid):
        doc = await db.workshops.find_one({"id": wid}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Oficina não encontrada")
        return doc

    async def metrics(wid=None):
        scope = {"workshop_id": wid} if wid else {}
        result = {name: await db[collection].count_documents(scope) for name, collection in
                  [("clients", "clients"), ("vehicles", "vehicles"), ("work_orders", "work_orders"), ("users", "users")]}
        grouped = await db.invoices.aggregate([{"$match": {**scope, "document_type": {"$in": ["fatura", "fatura_recibo"]}}}, {"$group": {"_id": None, "total": {"$sum": "$grand_total"}}}, {"$project": {"_id": 0, "total": 1}}]).to_list(1)
        result["revenue"] = round(grouped[0]["total"], 2) if grouped else 0
        return result

    async def check_logo(mid, account, wid=None):
        if mid and not await db.media.find_one({"id": mid, "$or": [{"owner_id": account["id"]}, {"workshop_id": wid}]}, {"_id": 0, "id": 1}):
            raise HTTPException(404, "Logótipo não encontrado")

    @api.get("/admin/dashboard")
    async def dashboard(account=Depends(access.admin)):
        result = await metrics()
        result.update({"workshops": await db.workshops.count_documents({}), "active": await db.workshops.count_documents({"status": "active"}),
                       "disabled": await db.workshops.count_documents({"status": "disabled"}), "archived": await db.workshops.count_documents({"status": "archived"})})
        return result

    @api.get("/admin/workshops")
    async def workshops(search: str = "", status: str = "all", account=Depends(access.admin)):
        import re
        scope = {}
        if status in {"active", "disabled", "archived"}:
            scope["status"] = status
        if search.strip():
            match = {"$regex": re.escape(search.strip()), "$options": "i"}
            scope["$or"] = [{key: match} for key in ["name", "email", "nif", "manager_name", "manager_email"]]
        docs = await db.workshops.find(scope, {"_id": 0}).sort("name", 1).to_list(2000)
        for doc in docs:
            doc["metrics"] = await metrics(doc["id"])
        return docs

    @api.get("/admin/workshops/{wid}")
    async def workshop_detail(wid: str, account=Depends(access.admin)):
        doc = await workshop_doc(wid)
        doc["metrics"] = await metrics(wid)
        users = await db.users.find({"workshop_id": wid}, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(2000)
        doc["users"] = [{key: user.get(key) for key in ["id", "name", "email", "role", "client_id", "is_active", "is_manager", "password_change_required"]} for user in users]
        return doc

    @api.post("/admin/workshops", status_code=201)
    async def create_workshop(body: WorkshopBody, account=Depends(access.admin)):
        await check_logo(body.logo_media_id, account)
        if await db.users.find_one({"email": str(body.manager_email).lower()}, {"_id": 0, "id": 1}):
            raise HTTPException(409, "O email do gerente já tem uma conta.")
        wid = identifier()
        manager, credentials = await access.create_account(body.manager_name, str(body.manager_email), "workshop_staff", wid, manager=True)
        doc = {"id": wid, **body.model_dump(), "manager_id": manager["id"], "status": "active", "created_at": timestamp(), "updated_at": timestamp()}
        try:
            await db.workshops.insert_one(doc)
        except Exception:
            await db.users.delete_one({"id": manager["id"], "workshop_id": wid})
            raise
        doc.pop("_id", None)
        await access.audit(account, "create_workshop", wid)
        return {"workshop": doc, "credentials": credentials}

    @api.put("/admin/workshops/{wid}")
    async def edit_workshop(wid: str, body: WorkshopBody, account=Depends(access.admin)):
        workshop = await workshop_doc(wid)
        await check_logo(body.logo_media_id, account, wid)
        manager = await db.users.find_one({"workshop_id": wid, "role": "workshop_staff", "$or": [{"id": workshop.get("manager_id")}, {"is_manager": True}]}, {"_id": 0})
        if not manager:
            manager = await db.users.find_one({"workshop_id": wid, "role": "workshop_staff"}, {"_id": 0})
        if manager:
            try:
                await db.users.update_one({"id": manager["id"], "workshop_id": wid}, {"$set": {"name": body.manager_name, "email": str(body.manager_email).lower(), "is_manager": True, "updated_at": timestamp()}})
            except DuplicateKeyError as exc:
                raise HTTPException(409, "O email do gerente já está em uso.") from exc
        update = {**body.model_dump(), "updated_at": timestamp()}
        if manager:
            update["manager_id"] = manager["id"]
        await db.workshops.update_one({"id": wid}, {"$set": update})
        await access.audit(account, "edit_workshop", wid)
        return {"ok": True}

    @api.post("/admin/workshops/{wid}/status")
    async def change_status(wid: str, body: StatusBody, account=Depends(access.admin)):
        workshop = await workshop_doc(wid)
        if workshop["status"] == "archived":
            raise HTTPException(409, "Uma oficina arquivada não pode ser reativada.")
        await db.workshops.update_one({"id": wid}, {"$set": {"status": body.status, "updated_at": timestamp()}})
        if body.status == "disabled":
            await db.users.update_many({"workshop_id": wid}, {"$inc": {"session_version": 1}})
        await access.audit(account, f"workshop:{body.status}", wid)
        return {"ok": True}

    @api.delete("/admin/workshops/{wid}")
    async def archive_workshop(wid: str, account=Depends(access.admin)):
        await workshop_doc(wid)
        await db.workshops.update_one({"id": wid}, {"$set": {"status": "archived", "archived_at": timestamp(), "updated_at": timestamp()}})
        await db.users.update_many({"workshop_id": wid}, {"$inc": {"session_version": 1}})
        await access.audit(account, "archive_workshop", wid)
        return {"ok": True, "archived": True}

    @api.post("/admin/workshops/{wid}/staff", status_code=201)
    async def add_staff(wid: str, body: UserBody, account=Depends(access.admin)):
        workshop = await workshop_doc(wid)
        if workshop["status"] == "archived":
            raise HTTPException(409, "Oficina arquivada")
        user, credentials = await access.create_account(body.name, str(body.email), "workshop_staff", wid)
        await access.audit(account, "create_staff", wid, user["id"])
        return {"user": await access.public(user), "credentials": credentials}

    @api.put("/admin/users/{uid}")
    async def edit_user(uid: str, body: UserBody, account=Depends(access.admin)):
        user = await db.users.find_one({"id": uid, "role": {"$in": ["workshop_staff", "client"]}}, {"_id": 0})
        if not user:
            raise HTTPException(404, "Utilizador não encontrado")
        try:
            await db.users.update_one({"id": uid}, {"$set": {"name": body.name, "email": str(body.email).lower(), "is_active": body.is_active, "updated_at": timestamp()}, "$inc": {"session_version": 1}})
        except DuplicateKeyError as exc:
            raise HTTPException(409, "Este email já tem uma conta.") from exc
        await access.audit(account, "edit_user", user["workshop_id"], uid)
        return {"ok": True}

    @api.post("/admin/users/{uid}/reset-password")
    async def reset_password(uid: str, account=Depends(access.admin)):
        user = await db.users.find_one({"id": uid, "role": {"$in": ["workshop_staff", "client"]}}, {"_id": 0})
        if not user:
            raise HTTPException(404, "Utilizador não encontrado")
        secret = secrets.token_urlsafe(18)
        await db.users.update_one({"id": uid}, {"$set": {"password_hash": await run_in_threadpool(password_hash, secret), "password_change_required": True}, "$inc": {"session_version": 1}})
        await access.audit(account, "reset_user_password", user["workshop_id"], uid)
        return {"credentials": {"email": user["email"], "temporary_password": secret, "password_change_required": True}}

    @api.post("/admin/workshops/{wid}/support")
    async def begin_support(wid: str, body: SupportBody, account=Depends(access.admin)):
        workshop = await workshop_doc(wid)
        secret = secrets.token_urlsafe(32)
        await db.support_sessions.delete_many({"actor_id": account["id"]})
        await db.support_sessions.insert_one({"id": identifier(), "actor_id": account["id"], "workshop_id": wid, "reason": body.reason,
                                              "digest": hashlib.sha256(secret.encode()).hexdigest(), "expires_at": now() + timedelta(hours=1)})
        await access.audit(account, "begin_support", wid, body.reason)
        return {"support_token": secret, "workshop": {"id": wid, "name": workshop["name"], "status": workshop["status"]}}

    @api.delete("/admin/support")
    async def end_support(account=Depends(access.admin)):
        await db.support_sessions.delete_many({"actor_id": account["id"]})
        await access.audit(account, "end_support")
        return {"ok": True}

    @api.get("/clients/{cid}/account")
    async def client_account(cid: str, account=Depends(access.workshop)):
        client = await db.clients.find_one({"id": cid, "workshop_id": account["workshop_id"]}, {"_id": 0})
        if not client:
            raise HTTPException(404, "Cliente não encontrado")
        user = await db.users.find_one({"client_id": cid, "workshop_id": account["workshop_id"], "role": "client"}, {"_id": 0})
        return await access.public(user) if user else None

    @api.post("/clients/{cid}/account", status_code=201)
    async def provision_client(cid: str, body: UserBody, account=Depends(access.workshop)):
        client = await db.clients.find_one({"id": cid, "workshop_id": account["workshop_id"]}, {"_id": 0})
        if not client:
            raise HTTPException(404, "Cliente não encontrado")
        user, credentials = await access.create_account(body.name, str(body.email), "client", account["workshop_id"], cid)
        await db.clients.update_one({"id": cid, "workshop_id": account["workshop_id"]}, {"$set": {"user_id": user["id"], "email": user["email"], "updated_at": timestamp()}})
        return {"user": await access.public(user), "credentials": credentials}
"""Platform administration and staff-managed end-customer accounts."""
import hashlib
import re
import secrets
from datetime import date, timedelta
from decimal import Decimal
from typing import Annotated, Literal
from urllib.parse import urlsplit
from uuid import UUID

from fastapi import Depends, HTTPException
from pydantic import EmailStr, Field, field_validator, model_validator
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool

from roadmesh.core.access_control import (
    StrictModel,
    identifier,
    now,
    password_hash,
    timestamp,
)
from roadmesh.core.company_modules import active_modules
from roadmesh.infrastructure.database.integrity import revenue_pipeline, transact
from roadmesh.modules.administration.analytics import register_admin_analytics


class WorkshopBody(StrictModel):
    modules: list[Literal["workshop","stand"]] = Field(default_factory=lambda: ["workshop"], min_length=1, max_length=2)

    @field_validator("modules")
    @classmethod
    def validate_modules(cls, value):
        if len(set(value)) != len(value):
            raise ValueError("Escolha cada módulo apenas uma vez.")
        return [name for name in ("workshop","stand") if name in value]

    name: str = Field(min_length=2, max_length=100)
    nif: str = Field(default="", max_length=30)
    address: str = Field(default="", max_length=300)
    email: EmailStr | None = None
    manager_name: str = Field(min_length=2, max_length=100)
    manager_email: EmailStr
    logo_media_id: str | None = None
    company_profile_version: Literal[2] | None = None
    legal_name: str = Field(default="", max_length=200)
    entity_type: Literal["sole_trader", "company"] | None = None
    sole_trader_name: str = Field(default="", max_length=100)
    company_people: list[Annotated[str, Field(max_length=100, strip_whitespace=True)]] = Field(default_factory=list, max_length=20)
    country: str = Field(default="Portugal", max_length=100)
    district: str = Field(default="", max_length=100)
    municipality: str = Field(default="", max_length=100)
    postal_code: str = Field(default="", max_length=20)
    phone: str = Field(default="", max_length=30)
    mobile: str = Field(default="", max_length=30)
    billing_email: EmailStr | None = None
    activity_start_date: date | None = None
    website: str = Field(default="", max_length=300)
    description: str = Field(default="", max_length=2000)
    opening_hours: str = Field(default="", max_length=1000)

    billing_terms_version: Literal[1] | None = None
    monthly_fee: Decimal | None = Field(default=None, ge=0, max_digits=11, decimal_places=2)
    billing_cycle: Literal["monthly", "quarterly", "yearly"] = "monthly"
    payment_day: int | None = Field(default=None, ge=1, le=31)
    support_hours: Decimal | None = Field(default=None, ge=0, max_digits=8, decimal_places=2)
    extra_hour_rate: Decimal | None = Field(default=None, ge=0, max_digits=11, decimal_places=2)

    @model_validator(mode="after")
    def validate_billing_terms(self):
        if self.billing_terms_version == 1 and any(value is None for value in (self.monthly_fee, self.payment_day, self.support_hours)):
            raise ValueError("Preencha o valor mensal, o dia de pagamento e as horas incluídas.")
        return self

    @field_validator("website")
    @classmethod
    def validate_website(cls, value):
        if not value:
            return value
        parsed = urlsplit(value)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Indique um website válido, começando por https:// ou http://.")
        return value

    @model_validator(mode="after")
    def validate_company_profile(self):
        # Older clients can still edit legacy companies without erasing new fields.
        if self.company_profile_version != 2:
            return self
        for field, label in (("legal_name", "Denominação social"), ("nif", "NIF/NIPC"),
                             ("country", "País"), ("district", "Distrito / região"),
                             ("municipality", "Concelho / município"), ("address", "Morada"),
                             ("postal_code", "Código postal")):
            if not getattr(self, field).strip():
                raise ValueError(f"Preencha o campo {label}.")
        if not self.entity_type or not self.email:
            raise ValueError("Selecione o tipo de entidade e preencha o email geral.")
        if self.country.casefold() in ("portugal", "pt"):
            if not re.fullmatch(r"\d{9}", self.nif):
                raise ValueError("O NIF/NIPC deve ter 9 algarismos.")
            if not re.fullmatch(r"\d{4}-\d{3}", self.postal_code):
                raise ValueError("Use o formato 0000-000 no código postal.")
        if not self.phone.strip() and not self.mobile.strip():
            raise ValueError("Preencha o telemóvel ou o telefone.")
        for number in (self.phone, self.mobile):
            if number and (not re.fullmatch(r"\+?[\d\s().-]+", number) or not 6 <= len(re.sub(r"\D", "", number)) <= 15):
                raise ValueError("Indique um contacto telefónico válido.")
        return self


class CompanyDraftForm(StrictModel):
    modules: list[Literal["workshop", "stand"]] = Field(default_factory=lambda: ["workshop"], min_length=1, max_length=2)
    name: str = Field(default="", max_length=100)
    legal_name: str = Field(default="", max_length=200)
    nif: str = Field(default="", max_length=30)
    entity_type: Literal["", "sole_trader", "company"] = ""
    sole_trader_name: str = Field(default="", max_length=100)
    company_people: list[Annotated[str, Field(max_length=100)]] = Field(default_factory=list, max_length=20)
    country: str = Field(default="Portugal", max_length=100)
    district: str = Field(default="", max_length=100)
    municipality: str = Field(default="", max_length=100)
    address: str = Field(default="", max_length=300)
    postal_code: str = Field(default="", max_length=20)
    phone: str = Field(default="", max_length=30)
    mobile: str = Field(default="", max_length=30)
    email: str = Field(default="", max_length=254)
    billing_email: str = Field(default="", max_length=254)
    manager_name: str = Field(default="", max_length=100)
    manager_email: str = Field(default="", max_length=254)
    website: str = Field(default="", max_length=300)
    activity_start_date: str = Field(default="", max_length=10)
    description: str = Field(default="", max_length=2000)
    opening_hours: str = Field(default="", max_length=1000)
    monthly_fee: str = Field(default="200", max_length=16)
    billing_cycle: str = Field(default="monthly", max_length=20)
    payment_day: str = Field(default="", max_length=2)
    support_hours: str = Field(default="", max_length=16)
    extra_hour_rate: str = Field(default="", max_length=16)
    logo_media_id: str | None = Field(default=None, max_length=100)


class CompanyDraftBody(StrictModel):
    form: CompanyDraftForm
    step: int = Field(ge=0, le=4)


class UserBody(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    is_active: bool = True


class StatusBody(StrictModel):
    status: Literal["active", "disabled"]
    reason: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def require_reason(self):
        if self.status == "disabled" and len(self.reason.strip()) < 5:
            raise ValueError("Indique o motivo da desativação, com pelo menos 5 caracteres.")
        return self


class ArchiveCompanyBody(StrictModel):
    reason: str = Field(min_length=5, max_length=500)


class SupportBody(StrictModel):
    reason: str = Field(min_length=5, max_length=300)


def register_admin_routes(api, db, access):
    register_admin_analytics(api, db, access)
    async def workshop_doc(wid):
        doc = await db.workshops.find_one({"id": wid}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Oficina não encontrada")
        return doc

    async def metrics(wid=None):
        scope = {"workshop_id": wid} if wid else {}
        result = {name: await db[collection].count_documents(scope) for name, collection in
                  [("clients", "clients"), ("vehicles", "vehicles"), ("work_orders", "work_orders"), ("users", "users")]}
        grouped = await db.invoices.aggregate(revenue_pipeline(scope)).to_list(1)
        result["revenue"] = round(grouped[0]["total"], 2) if grouped else 0
        return result

    async def check_logo(mid, account, wid=None):
        if mid and not await db.media.find_one({"id": mid, "$or": [{"owner_id": account["id"]}, {"workshop_id": wid}]}, {"_id": 0, "id": 1}):
            raise HTTPException(404, "Logótipo não encontrado")

    def draft_field(key):
        if key != "new":
            try:
                key = str(UUID(key))
            except ValueError as exc:
                raise HTTPException(422, "Rascunho inválido.") from exc
        return "company_draft_" + key

    @api.get("/admin/company-drafts/{key}")
    async def read_company_draft(key: str, account=Depends(access.admin)):
        field = draft_field(key)
        owner = await db.users.find_one({"id": account["id"]}, {"_id": 0, field: 1})
        return owner.get(field) if owner else None

    @api.put("/admin/company-drafts/{key}")
    async def save_company_draft(key: str, body: CompanyDraftBody, account=Depends(access.admin)):
        field = draft_field(key)
        if key != "new":
            await workshop_doc(str(UUID(key)))
        await check_logo(body.form.logo_media_id, account, None if key == "new" else str(UUID(key)))
        value = {"version": 2, "form": body.form.model_dump(mode="json"), "step": body.step, "savedAt": timestamp()}
        # Private administrator metadata works with MongoDB and PostgreSQL's JSON metadata.
        await db.users.update_one({"id": account["id"]}, {"$set": {field: value}})
        return value

    @api.delete("/admin/company-drafts/{key}")
    async def clear_company_draft(key: str, account=Depends(access.admin)):
        await db.users.update_one({"id": account["id"]}, {"$set": {draft_field(key): None}})
        return {"ok": True}

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
            doc["modules"] = active_modules(doc)
            doc["metrics"] = await metrics(doc["id"])
        return docs

    @api.get("/admin/workshops/{wid}")
    async def workshop_detail(wid: str, account=Depends(access.admin)):
        doc = await workshop_doc(wid)
        doc["modules"] = active_modules(doc)
        doc["metrics"] = await metrics(wid)
        users = await db.users.find({"workshop_id": wid}, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(2000)
        doc["users"] = [{key: user.get(key) for key in ["id", "name", "email", "role", "client_id", "is_active", "is_manager", "password_change_required"]} for user in users]
        return doc

    @api.post("/admin/workshops", status_code=201)
    async def create_workshop(body: WorkshopBody, account=Depends(access.admin)):
        await check_logo(body.logo_media_id, account)
        if await db.users.find_one({"email": str(body.manager_email).lower()}, {"_id": 0, "id": 1}):
            raise HTTPException(409, "O email do responsável já tem uma conta.")
        wid = identifier()
        async def operation(session):
            manager, credentials = await access.create_account(body.manager_name, str(body.manager_email), "workshop_staff", wid, manager=True, session=session)
            doc = {"id": wid, **body.model_dump(mode="json"), "manager_id": manager["id"], "status": "active", "created_at": timestamp(), "updated_at": timestamp()}
            await db.workshops.insert_one(doc, session=session)
            return doc, credentials

        doc, credentials = await transact(db, operation)
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
                raise HTTPException(409, "O email do responsável já está em uso.") from exc
        update = {**body.model_dump(mode="json", exclude_unset=True), "updated_at": timestamp()}
        if "modules" not in body.model_fields_set:
            update.pop("modules", None)
        if manager:
            update["manager_id"] = manager["id"]
        await db.workshops.update_one({"id": wid}, {"$set": update})
        await access.audit(account, "edit_workshop", wid)
        return {"ok": True}

    @api.post("/admin/workshops/{wid}/status")
    async def change_status(wid: str, body: StatusBody, account=Depends(access.admin)):
        async def operation(session):
            await db.workshops.update_one({"id": wid}, {"$inc": {"state_revision": 1}}, session=session)
            workshop = await db.workshops.find_one({"id": wid}, {"_id": 0}, session=session)
            if not workshop:
                raise HTTPException(404, "Empresa não encontrada.")
            if workshop["status"] == "archived":
                raise HTTPException(409, "Uma empresa arquivada não pode ser reativada.")
            await db.workshops.update_one({"id": wid}, {"$set": {"status": body.status, "status_reason": body.reason, "updated_at": timestamp()}}, session=session)
            if body.status == "disabled":
                await db.users.update_many({"workshop_id": wid}, {"$inc": {"session_version": 1}}, session=session)
            await access.audit(account, f"workshop:{body.status}", wid, body.reason, session=session)
            return {"ok": True}
        return await transact(db, operation)

    async def archive_company(wid, account, reason):
        async def operation(session):
            touched = await db.workshops.update_one({"id": wid}, {"$inc": {"state_revision": 1}}, session=session)
            if not touched.matched_count:
                raise HTTPException(404, "Empresa não encontrada.")
            await db.workshops.update_one({"id": wid}, {"$set": {"status": "archived", "archived_at": timestamp(), "archive_reason": reason, "updated_at": timestamp()}}, session=session)
            await db.users.update_many({"workshop_id": wid}, {"$inc": {"session_version": 1}}, session=session)
            await access.audit(account, "archive_workshop", wid, reason, session=session)
            return {"ok": True, "archived": True}
        return await transact(db, operation)

    @api.post("/admin/workshops/{wid}/archive")
    async def archive_with_reason(wid: str, body: ArchiveCompanyBody, account=Depends(access.admin)):
        return await archive_company(wid, account, body.reason)

    @api.delete("/admin/workshops/{wid}")
    async def archive_workshop(wid: str, body: ArchiveCompanyBody, account=Depends(access.admin)):
        return await archive_company(wid, account, body.reason)

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
        return {"support_token": secret, "workshop": {"id": wid, "name": workshop["name"], "status": workshop["status"], "modules": active_modules(workshop)}}

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

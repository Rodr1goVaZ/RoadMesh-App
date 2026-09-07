"""Database-backed roles, scoped support sessions and account provisioning."""
import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool

bearer = OAuth2PasswordBearer(tokenUrl="/api/auth/staff/login", auto_error=False)
ROLES = {"admin", "workshop_staff", "client"}
DUMMY_HASH = bcrypt.hashpw(b"not-a-real-password", bcrypt.gensalt())


def now():
    return datetime.now(timezone.utc)


def timestamp():
    return now().isoformat()


def identifier():
    return str(uuid.uuid4())


def password_hash(password):
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(422, "A palavra-passe é demasiado longa.")
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password, hashed):
    try:
        if len(password.encode()) > 72:
            return False
        return bcrypt.checkpw(password.encode(), hashed.encode() if isinstance(hashed, str) else hashed)
    except (ValueError, TypeError):
        return False


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class PasswordBody(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12, max_length=72)


class Access:
    def __init__(self, db):
        self.db = db
        self.secret = os.environ["JWT_SECRET"]
        if len(self.secret) < 32:
            raise RuntimeError("JWT_SECRET must contain at least 32 characters")

    async def initialize(self):
        # Preserve migration information; never infer platform privileges from an email.
        legacy = await self.db.users.find({"role": "admin", "workshop_id": {"$nin": [None, ""]}}, {"_id": 0, "id": 1, "role": 1, "workshop_id": 1}).to_list(None)
        for account in legacy:
            await self.db.role_migration_backup.update_one({"user_id": account["id"]}, {"$setOnInsert": {"user_id": account["id"], "previous_role": account["role"], "workshop_id": account["workshop_id"], "created_at": timestamp()}}, upsert=True)
        await self.db.users.update_many({"role": "admin", "workshop_id": {"$nin": [None, ""]}}, {"$set": {"role": "workshop_staff"}})
        for key, value in {"is_active": True, "password_change_required": False, "session_version": 0}.items():
            await self.db.users.update_many({key: {"$exists": False}}, {"$set": {key: value}})
        await self.db.workshops.update_many({"status": {"$exists": False}}, {"$set": {"status": "active"}})
        await self.db.users.create_index("email", unique=True)
        await self.db.users.create_index([("workshop_id", 1), ("role", 1)])
        await self.db.users.create_index([("workshop_id", 1), ("client_id", 1)], unique=True, partialFilterExpression={"role": "client"})
        await self.db.revoked_sessions.create_index("expires_at", expireAfterSeconds=0)
        await self.db.support_sessions.create_index("expires_at", expireAfterSeconds=0)
        await self.db.login_limits.create_index("expires_at", expireAfterSeconds=0)
        await self.db.vehicles.create_index([("workshop_id", 1), ("client_id", 1)])
        await self.db.appointments.create_index([("workshop_id", 1), ("client_id", 1), ("scheduled_at", 1)])
        email = os.environ["BOOTSTRAP_ADMIN_EMAIL"].strip().lower()
        existing = await self.db.users.find_one({"email": email}, {"_id": 0})
        if existing:
            if existing["role"] != "admin" or existing.get("workshop_id"):
                raise RuntimeError("Bootstrap email is already assigned to a non-platform account")
            return
        password = os.environ["BOOTSTRAP_ADMIN_PASSWORD"]
        if len(password) < 12:
            raise RuntimeError("Bootstrap password must be at least 12 characters")
        try:
            await self.create_account("RoadMesh Admin", email, "admin", password=password)
        except DuplicateKeyError:
            pass

    async def create_account(self, name, email, role, workshop_id=None, client_id=None, password=None, manager=False):
        secret = password or secrets.token_urlsafe(18)
        account = {"id": identifier(), "name": name.strip(), "email": email.strip().lower(), "role": role,
                   "workshop_id": workshop_id, "client_id": client_id, "is_manager": manager,
                   "is_active": True, "password_change_required": True, "session_version": 0,
                   "password_hash": await run_in_threadpool(password_hash, secret), "created_at": timestamp(), "updated_at": timestamp()}
        try:
            await self.db.users.insert_one(account)
        except DuplicateKeyError as exc:
            raise HTTPException(409, "Já existe uma conta para este email ou cliente.") from exc
        account.pop("_id", None)
        # Only provisioning/reset responses expose this once, to the authorized operator.
        return account, {"email": account["email"], "temporary_password": secret, "password_change_required": True}

    def token(self, account):
        return jwt.encode({"sub": account["id"], "iss": "roadmesh-api", "aud": account["role"], "jti": identifier(),
                           "sv": account.get("session_version", 0), "iat": now(), "exp": now() + timedelta(minutes=15)}, self.secret, algorithm="HS256")

    async def public(self, account):
        result = {key: account.get(key) for key in ["id", "name", "email", "role", "workshop_id", "client_id", "is_manager", "is_active", "password_change_required"]}
        workshop = await self.db.workshops.find_one({"id": account.get("workshop_id")}, {"_id": 0, "name": 1}) if account.get("workshop_id") else None
        result["workshop_name"] = workshop["name"] if workshop else "RoadMesh"
        return result

    async def check_account(self, account):
        if not account or not account.get("is_active", False) or account.get("role") not in ROLES:
            raise HTTPException(401, "Acesso indisponível. Contacte o responsável.")
        if account["role"] != "admin":
            workshop = await self.db.workshops.find_one({"id": account.get("workshop_id"), "status": "active"}, {"_id": 0, "id": 1})
            if not workshop:
                raise HTTPException(401, "Esta oficina está inativa. Contacte a RoadMesh.")
        if account["role"] == "client":
            owner = await self.db.clients.find_one({"id": account.get("client_id"), "workshop_id": account["workshop_id"], "user_id": account["id"]}, {"_id": 0, "id": 1})
            if not owner:
                raise HTTPException(401, "Acesso de cliente indisponível.")

    async def identity(self, token: str = Depends(bearer)):
        try:
            claims = jwt.decode(token or "", self.secret, algorithms=["HS256"], issuer="roadmesh-api", audience=list(ROLES), options={"require": ["sub", "exp", "iat", "jti", "aud", "iss", "sv"]})
        except jwt.PyJWTError as exc:
            raise HTTPException(401, "Sessão inválida ou expirada. Entre novamente.") from exc
        account = await self.db.users.find_one({"id": claims["sub"]}, {"_id": 0})
        await self.check_account(account)
        if account["role"] != claims["aud"] or account.get("session_version", 0) != claims["sv"]:
            raise HTTPException(401, "A sessão foi terminada. Entre novamente.")
        if await self.db.revoked_sessions.find_one({"jti": claims["jti"]}, {"_id": 0, "jti": 1}):
            raise HTTPException(401, "Sessão terminada")
        account["_jti"], account["_exp"] = claims["jti"], claims["exp"]
        return account

    async def ready(self, account):
        if account.get("password_change_required"):
            raise HTTPException(428, "Altere a palavra-passe temporária para continuar.")
        return account

    async def audit(self, account, action, workshop_id=None, resource=None):
        await self.db.admin_support_audit.insert_one({"id": identifier(), "actor_id": account["id"], "action": action,
                                                     "workshop_id": workshop_id, "resource": resource, "created_at": timestamp()})

    async def admin(self, token: str = Depends(bearer)):
        account = await self.ready(await self.identity(token))
        if account["role"] != "admin":
            raise HTTPException(403, "Acesso exclusivo da administração RoadMesh.")
        return account

    async def client(self, token: str = Depends(bearer)):
        account = await self.ready(await self.identity(token))
        if account["role"] != "client":
            raise HTTPException(403, "Acesso exclusivo da área de cliente.")
        return account

    async def workshop(self, request: Request, token: str = Depends(bearer)):
        account = await self.ready(await self.identity(token))
        if account["role"] == "workshop_staff":
            if request.headers.get("X-Support-Token"):
                raise HTTPException(403, "Modo de suporte indisponível.")
            return account
        if account["role"] != "admin":
            raise HTTPException(403, "Não tem acesso à área da oficina.")
        support = request.headers.get("X-Support-Token", "")
        context = await self.db.support_sessions.find_one({"digest": hashlib.sha256(support.encode()).hexdigest(), "actor_id": account["id"], "expires_at": {"$gt": now()}}, {"_id": 0})
        if not context:
            raise HTTPException(403, "Selecione uma oficina no painel de administração.")
        workshop = await self.db.workshops.find_one({"id": context["workshop_id"]}, {"_id": 0, "id": 1})
        if not workshop:
            raise HTTPException(404, "Oficina não encontrada")
        await self.audit(account, f"support:{request.method}", workshop["id"], request.url.path)
        return {**account, "workshop_id": workshop["id"], "support_mode": True}

    async def media_actor(self, request: Request, token: str = Depends(bearer)):
        account = await self.ready(await self.identity(token))
        if account["role"] == "admin" and request.headers.get("X-Support-Token"):
            return await self.workshop(request, token)
        return account


def register_auth_routes(api, access):
    async def login_role(kind, body, request):
        expected = {"staff": "workshop_staff", "client": "client", "admin": "admin"}.get(kind)
        if not expected:
            raise HTTPException(404, "Tipo de acesso inválido")
        email = str(body.email).lower().strip()
        # Persistent, bounded attempts per email/IP/window, across restarts/workers.
        bucket = int(now().timestamp()) // 300
        digest = hashlib.sha256(f"{email}:{request.client.host if request.client else ''}:{bucket}".encode()).hexdigest()
        limit = await access.db.login_limits.find_one_and_update({"key": digest}, {"$inc": {"attempts": 1}, "$setOnInsert": {"expires_at": now() + timedelta(minutes=6)}}, upsert=True, return_document=ReturnDocument.AFTER, projection={"_id": 0})
        if limit["attempts"] > 12:
            raise HTTPException(429, "Demasiadas tentativas. Aguarde alguns minutos.")
        account = await access.db.users.find_one({"email": email}, {"_id": 0})
        valid = await run_in_threadpool(verify_password, body.password, account["password_hash"] if account else DUMMY_HASH)
        if not valid or not account or account["role"] != expected:
            raise HTTPException(401, "Email ou palavra-passe inválidos para esta área.")
        await access.check_account(account)
        await access.db.login_limits.delete_one({"key": digest})
        return {"access_token": access.token(account), "token_type": "bearer", "user": await access.public(account)}

    @api.post("/auth/{kind}/login")
    async def role_login(kind: str, body: LoginBody, request: Request):
        return await login_role(kind, body, request)

    @api.post("/auth/login")
    async def legacy_staff_login(body: LoginBody, request: Request):
        return await login_role("staff", body, request)

    @api.post("/auth/register")
    async def disabled_registration():
        raise HTTPException(403, "As contas de oficina são criadas pela administração RoadMesh.")

    @api.get("/auth/me")
    async def me(account=Depends(access.identity)):
        return await access.public(account)

    @api.post("/auth/change-password")
    async def change_password(body: PasswordBody, account=Depends(access.identity)):
        if not await run_in_threadpool(verify_password, body.current_password, account["password_hash"]):
            raise HTTPException(400, "A palavra-passe atual não está correta.")
        if body.current_password == body.new_password:
            raise HTTPException(422, "Escolha uma palavra-passe diferente da atual.")
        hashed = await run_in_threadpool(password_hash, body.new_password)
        account = await access.db.users.find_one_and_update({"id": account["id"], "session_version": account.get("session_version", 0)}, {"$set": {"password_hash": hashed, "password_change_required": False, "updated_at": timestamp()}, "$inc": {"session_version": 1}}, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
        if not account:
            raise HTTPException(401, "Sessão alterada. Entre novamente.")
        return {"access_token": access.token(account), "token_type": "bearer", "user": await access.public(account)}

    @api.post("/auth/logout")
    async def logout(account=Depends(access.identity)):
        await access.db.revoked_sessions.update_one({"jti": account["_jti"]}, {"$set": {"jti": account["_jti"], "expires_at": datetime.fromtimestamp(account["_exp"], timezone.utc)}}, upsert=True)
        await access.db.support_sessions.delete_many({"actor_id": account["id"]})
        return {"ok": True}
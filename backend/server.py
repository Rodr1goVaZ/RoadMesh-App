"""RoadMesh backend API - multi-tenant workshop SaaS."""

from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Annotated, List, Optional, Literal

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from pymongo import ReturnDocument
from database_integrity import initialize_integrity, transact, revenue_pipeline
from starlette.concurrency import run_in_threadpool
from media_storage import init_storage, register_media_routes
from pdf_documents import build_invoice_pdf
from access_control import Access, register_auth_routes
from admin_routes import register_admin_routes
from portal_routes import register_portal_routes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

if os.environ.get("DATABASE_URL", "").strip():
    from postgres_database import PostgresDatabase
    db = PostgresDatabase(os.environ["DATABASE_URL"].strip())
    client = None
else:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
access = Access(db)

app = FastAPI(title="RoadMesh API")
api = APIRouter(prefix="/api")


# ----------------------------- helpers -----------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


CurrentUser = Annotated[dict, Depends(access.workshop)]


def tenant_filter(user: dict, extra: dict | None = None) -> dict:
    f = {"workshop_id": user["workshop_id"]}
    if extra:
        f.update(extra)
    return f


# ----------------------------- models -----------------------------
class RegisterIn(BaseModel):
    workshop_name: str = Field(min_length=2, max_length=100)
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ClientIn(BaseModel):
    name: str
    nif: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class VehicleIn(BaseModel):
    client_id: str
    license_plate: str
    make: str
    model: str
    year: Optional[int] = None
    vin: Optional[str] = None
    fuel: Optional[str] = None
    mileage: Optional[int] = None


class WorkOrderItemIn(BaseModel):
    item_type: Literal["peca", "mao_de_obra"]
    description: str = Field(min_length=1, max_length=1000)
    quantity: float = Field(default=1, gt=0, allow_inf_nan=False)
    unit_price: float = Field(default=0, ge=0, allow_inf_nan=False)
    vat_rate: float = Field(default=23, ge=0, le=100, allow_inf_nan=False)
    product_id: Optional[str] = None


class WorkOrderIn(BaseModel):
    client_id: str
    vehicle_id: str
    mechanic: Optional[str] = None
    complaint: Optional[str] = None
    notes: Optional[str] = None
    mileage_in: Optional[int] = None
    status: Literal["entrada", "diagnostico", "aguardando_pecas", "concluido"] = "entrada"
    items: List[WorkOrderItemIn] = []


class ProductIn(BaseModel):
    reference: str
    name: str
    supplier: Optional[str] = None
    category: Optional[str] = None
    stock: float = Field(default=0, ge=0, allow_inf_nan=False)
    min_stock: float = Field(default=0, ge=0, allow_inf_nan=False)
    purchase_price: float = Field(default=0, ge=0, allow_inf_nan=False)
    sale_price: float = Field(default=0, ge=0, allow_inf_nan=False)
    vat_rate: float = Field(default=23, ge=0, le=100, allow_inf_nan=False)


class ProductUpdateIn(ProductIn):
    stock: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)


class OrderItemIn(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0, allow_inf_nan=False)


class PurchaseOrderIn(BaseModel):
    supplier: str
    items: List[OrderItemIn] = Field(min_length=1)
    notes: Optional[str] = None


class QuoteIn(BaseModel):
    client_id: str
    vehicle_id: str
    items: List[WorkOrderItemIn]
    notes: Optional[str] = None


class InvoiceIn(BaseModel):
    work_order_id: str
    document_type: Literal["orcamento", "fatura", "fatura_recibo"]


class PhotoIn(BaseModel):
    vehicle_id: str
    work_order_id: Optional[str] = None
    zone: str  # exterior_360 | interior | pneus_rodas | pintura | chassis_inferior
    media_id: str
    caption: Optional[str] = None


class DamageIn(BaseModel):
    vehicle_id: str
    photo_id: Optional[str] = None
    category: Literal["ferrugem", "dano_estrutural", "fuga", "desgaste_pneu", "risco", "amolgadela", "outro"]
    severity: Literal["baixo", "medio", "critico"]
    description: str = Field(default="", max_length=1000)
    location: str = Field(default="", max_length=150)
    media_id: str


# ----------------------------- auth -----------------------------
register_auth_routes(api, access)


# ----------------------------- clients -----------------------------
@api.get("/clients")
async def list_clients(user: CurrentUser, search: str = ""):
    q = tenant_filter(user)
    if search:
        rx = {"$regex": re.escape(search), "$options": "i"}
        q["$or"] = [{"name": rx}, {"nif": rx}, {"phone": rx}, {"email": rx}]
    docs = await db.clients.find(q, {"_id": 0}).sort("name", 1).to_list(1000)
    counts = await db.vehicles.aggregate(
        [
            {"$match": tenant_filter(user, {"client_id": {"$in": [d["id"] for d in docs]}})},
            {"$group": {"_id": "$client_id", "count": {"$sum": 1}}},
        ]
    ).to_list(len(docs) or 1)
    by_client = {row["_id"]: row["count"] for row in counts}
    for doc in docs:
        doc["vehicles_count"] = by_client.get(doc["id"], 0)
    return docs


@api.post("/clients", status_code=201)
async def create_client(data: ClientIn, user: CurrentUser):
    doc = {"id": new_id(), "workshop_id": user["workshop_id"], **data.model_dump(),
           "created_at": now_iso(), "updated_at": now_iso()}
    await db.clients.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/clients/{client_id}")
async def get_client(client_id: str, user: CurrentUser):
    doc = await db.clients.find_one(tenant_filter(user, {"id": client_id}), {"_id": 0})
    if not doc:
        raise HTTPException(404, "Cliente não encontrado")
    doc["vehicles"] = await db.vehicles.find(tenant_filter(user, {"client_id": client_id}), {"_id": 0}).to_list(500)
    doc["work_orders"] = await db.work_orders.find(
        tenant_filter(user, {"client_id": client_id}), {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return doc


@api.put("/clients/{client_id}")
async def update_client(client_id: str, data: ClientIn, user: CurrentUser):
    upd = {**data.model_dump(), "updated_at": now_iso()}
    r = await db.clients.update_one(tenant_filter(user, {"id": client_id}), {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Cliente não encontrado")
    return {"ok": True}


@api.delete("/clients/{client_id}")
async def delete_client(client_id: str, user: CurrentUser):
    async def operation(session):
        client = await db.clients.find_one(tenant_filter(user, {"id": client_id}), {"_id": 0, "id": 1}, session=session)
        if not client:
            raise HTTPException(404, "Cliente não encontrado")
        if await db.vehicles.find_one(
            tenant_filter(user, {"client_id": client_id}), {"_id": 0, "id": 1}, session=session
        ) or await db.work_orders.find_one(
            tenant_filter(user, {"client_id": client_id}), {"_id": 0, "id": 1}, session=session
        ):
            raise HTTPException(
                409, "Não é possível apagar um cliente com viaturas ou histórico. Arquive-o em vez disso."
            )
        for collection in ("quotes", "appointments", "users"):
            if await db[collection].find_one(
                tenant_filter(user, {"client_id": client_id}), {"_id": 0, "id": 1}, session=session
            ):
                raise HTTPException(409, "Não é possível apagar um cliente com histórico ou acesso ao portal.")
        await db.clients.delete_one(tenant_filter(user, {"id": client_id}), session=session)
        return {"ok": True}

    return await transact(db, operation)


# ----------------------------- vehicles -----------------------------
@api.get("/vehicles")
async def list_vehicles(user: CurrentUser, client_id: Optional[str] = None, search: str = ""):
    q = tenant_filter(user)
    if client_id:
        q["client_id"] = client_id
    if search.strip():
        normalized = re.sub(r"[^A-Z0-9]", "", search.upper())
        if not normalized:
            return []
        q["license_plate"] = {"$regex": r"[\s-]*".join(re.escape(char) for char in normalized), "$options": "i"}
    docs = await db.vehicles.find(q, {"_id": 0}).sort("license_plate", 1).to_list(1000)
    clients = await db.clients.find(tenant_filter(user, {"id": {"$in": [d["client_id"] for d in docs]}}), {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    names = {c["id"]: c["name"] for c in clients}
    for vehicle in docs:
        vehicle["client_name"] = names.get(vehicle["client_id"], "")
    return docs


@api.post("/vehicles", status_code=201)
async def create_vehicle(data: VehicleIn, user: CurrentUser):
    async def operation(session):
        if not await db.clients.find_one_and_update(
            tenant_filter(user, {"id": data.client_id}),
            {"$inc": {"reference_revision": 1}},
            projection={"_id": 0, "id": 1},
            session=session,
        ):
            raise HTTPException(404, "Cliente não encontrado")
        doc = {
            "id": new_id(),
            "workshop_id": user["workshop_id"],
            **data.model_dump(),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.vehicles.insert_one(doc, session=session)
        doc.pop("_id", None)
        return doc

    return await transact(db, operation)


@api.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: str, user: CurrentUser):
    doc = await db.vehicles.find_one(tenant_filter(user, {"id": vehicle_id}), {"_id": 0})
    if not doc:
        raise HTTPException(404, "Viatura não encontrada")
    doc["photos"] = await db.photos.find(tenant_filter(user, {"vehicle_id": vehicle_id}), {"_id": 0}).sort("created_at", -1).to_list(500)
    doc["damages"] = await db.damages.find(tenant_filter(user, {"vehicle_id": vehicle_id}), {"_id": 0}).sort("created_at", -1).to_list(500)
    doc["client"] = await db.clients.find_one(tenant_filter(user, {"id": doc["client_id"]}), {"_id": 0})
    doc["work_orders"] = await db.work_orders.find(tenant_filter(user, {"vehicle_id": vehicle_id}), {"_id": 0}).sort("created_at", -1).to_list(500)
    return doc


@api.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: VehicleIn, user: CurrentUser):
    async def operation(session):
        existing = await db.vehicles.find_one(tenant_filter(user, {"id": vehicle_id}), {"_id": 0}, session=session)
        if not existing:
            raise HTTPException(404, "Viatura não encontrada")
        if existing["client_id"] != data.client_id:
            for collection in ("work_orders", "quotes", "appointments"):
                if await db[collection].find_one(
                    tenant_filter(user, {"vehicle_id": vehicle_id}), {"_id": 0, "id": 1}, session=session
                ):
                    raise HTTPException(409, "Não é possível mudar o cliente de uma viatura com histórico.")
        if not await db.clients.find_one_and_update(
            tenant_filter(user, {"id": data.client_id}),
            {"$inc": {"reference_revision": 1}},
            projection={"_id": 0, "id": 1},
            session=session,
        ):
            raise HTTPException(404, "Cliente não encontrado")
        r = await db.vehicles.update_one(
            tenant_filter(user, {"id": vehicle_id}),
            {"$set": {**data.model_dump(), "updated_at": now_iso()}},
            session=session,
        )
        if r.matched_count == 0:
            raise HTTPException(404, "Viatura não encontrada")
        return {"ok": True}

    return await transact(db, operation)


@api.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: CurrentUser):
    async def operation(session):
        scope = tenant_filter(user, {"id": vehicle_id})
        if not await db.vehicles.find_one(scope, {"_id": 0, "id": 1}, session=session):
            raise HTTPException(404, "Viatura não encontrada")
        for collection in ("work_orders", "quotes", "photos", "damages", "appointments"):
            if await db[collection].find_one(
                tenant_filter(user, {"vehicle_id": vehicle_id}), {"_id": 0, "id": 1}, session=session
            ):
                raise HTTPException(409, "Não é possível apagar uma viatura com histórico, fotografias ou marcações.")
        await db.vehicles.delete_one(scope, session=session)
        return {"ok": True}

    return await transact(db, operation)


# ----------------------------- work orders -----------------------------
async def validate_order_relations(data, user, session=None):
    if not await db.clients.find_one_and_update(
        tenant_filter(user, {"id": data.client_id}),
        {"$inc": {"reference_revision": 1}},
        projection={"_id": 0, "id": 1},
        session=session,
    ):
        raise HTTPException(404, "Cliente não encontrado nesta oficina")
    if not await db.vehicles.find_one_and_update(
        tenant_filter(user, {"id": data.vehicle_id, "client_id": data.client_id}),
        {"$inc": {"reference_revision": 1}},
        projection={"_id": 0, "id": 1},
        session=session,
    ):
        raise HTTPException(404, "Viatura não encontrada para este cliente")
    for item in data.items:
        if item.product_id and not await db.products.find_one_and_update(
            tenant_filter(user, {"id": item.product_id}),
            {"$inc": {"reference_revision": 1}},
            projection={"_id": 0, "id": 1},
            session=session,
        ):
            raise HTTPException(404, "Produto não encontrado nesta oficina")


def compute_totals(items: list) -> dict:
    cent = Decimal("0.01")
    subtotal, vat_total = Decimal(0), Decimal(0)
    for item in items:
        line = (Decimal(str(item.get("quantity", 0))) * Decimal(str(item.get("unit_price", 0)))).quantize(cent, rounding=ROUND_HALF_UP)
        subtotal += line
        vat_total += (line * Decimal(str(item.get("vat_rate", 23))) / 100).quantize(cent, rounding=ROUND_HALF_UP)
    return {"subtotal": float(subtotal), "vat": float(vat_total), "total": float(subtotal + vat_total)}


async def next_sequence(
    counter_id: str, collection: str, scope: dict, field: str, pattern: str, minimum: int = 0, session=None
) -> int:
    """Return a workshop-local, monotonically increasing document sequence.

    Legacy records did not have counters. On the first use we derive a safe
    starting point from their numbers, then MongoDB's $inc makes all later
    allocations atomic (including requests arriving at the same time).
    """
    counter = await db.counters.find_one({"id": counter_id}, {"_id": 0, "sequence": 1}, session=session)
    if not counter:
        highest = minimum
        regex = re.compile(pattern)
        docs = await db[collection].find(scope, {"_id": 0, field: 1}, session=session).to_list(None)
        for doc in docs:
            match = regex.search(str(doc.get(field, "")))
            if match:
                highest = max(highest, int(match.group(1)))
        await db.counters.update_one(
            {"id": counter_id},
            {"$setOnInsert": {"id": counter_id, "sequence": highest, "created_at": now_iso()}},
            upsert=True,
            session=session,
        )
    counter = await db.counters.find_one_and_update(
        {"id": counter_id},
        {"$inc": {"sequence": 1}, "$set": {"updated_at": now_iso()}},
        return_document=ReturnDocument.AFTER,
        projection={"_id": 0, "sequence": 1},
        session=session,
    )
    return int(counter["sequence"])


async def next_work_order_number(user: dict, session=None) -> str:
    sequence = await next_sequence(
        f"work-order:{user['workshop_id']}",
        "work_orders",
        tenant_filter(user),
        "number",
        r"#(\d+)$",
        minimum=1023,
        session=session,
    )
    return f"#{sequence}"


async def next_yearly_number(user: dict, collection: str, field: str, prefix: str, session=None) -> str:
    year = datetime.now().year
    sequence = await next_sequence(
        f"{collection}:{prefix}:{year}:{user['workshop_id']}",
        collection,
        tenant_filter(user),
        field,
        rf"{re.escape(prefix)}{year}/(\d+)$",
        session=session,
    )
    return f"{prefix}{year}/{sequence:03d}"


def stock_deltas(items: list) -> dict[str, float]:
    """Summarise the inventory impact of a work order's parts."""
    deltas: dict[str, float] = {}
    for item in items:
        if item.get("item_type") == "peca" and item.get("product_id"):
            product_id = item["product_id"]
            deltas[product_id] = deltas.get(product_id, 0.0) + float(item.get("quantity", 0))
    return deltas


async def apply_stock_delta(user: dict, product_id: str, delta: float, reason: str, session=None, **references) -> None:
    """Apply one auditable movement. Positive delta adds stock; negative removes it."""
    if not delta:
        return
    scope = tenant_filter(user, {"id": product_id})
    if delta < 0:
        scope["stock"] = {"$gte": -delta}
    result = await db.products.update_one(
        scope, {"$inc": {"stock": delta}, "$set": {"updated_at": now_iso()}}, session=session
    )
    if not result.matched_count:
        if await db.products.find_one(tenant_filter(user, {"id": product_id}), {"_id": 0, "id": 1}, session=session):
            raise HTTPException(409, "Stock insuficiente para esta operação.")
        raise HTTPException(404, "Produto não encontrado nesta oficina")
    await db.stock_movements.insert_one(
        {
            "id": new_id(),
            "workshop_id": user["workshop_id"],
            "product_id": product_id,
            "delta": delta,
            "reason": reason,
            **references,
            "created_at": now_iso(),
        },
        session=session,
    )


async def apply_work_order_stock(
    user: dict, items: list, multiplier: float, work_order_id: str, reason: str, session=None
) -> None:
    for product_id, quantity in stock_deltas(items).items():
        await apply_stock_delta(
            user, product_id, -quantity * multiplier, reason, work_order_id=work_order_id, session=session
        )


async def _enrich_wo(wo: dict, session=None) -> dict:
    client = await db.clients.find_one(
        {"id": wo["client_id"], "workshop_id": wo["workshop_id"]}, {"_id": 0, "name": 1}, session=session
    )
    vehicle = await db.vehicles.find_one(
        {"id": wo["vehicle_id"], "workshop_id": wo["workshop_id"], "client_id": wo["client_id"]},
        {"_id": 0, "license_plate": 1, "make": 1, "model": 1},
        session=session,
    )
    wo["client_name"] = client["name"] if client else ""
    wo["vehicle_label"] = f"{vehicle['make']} {vehicle['model']}" if vehicle else ""
    wo["license_plate"] = vehicle["license_plate"] if vehicle else ""
    return wo


async def enrich_work_orders(docs: list, user: dict) -> list:
    clients = await db.clients.find(
        tenant_filter(user, {"id": {"$in": list({d["client_id"] for d in docs})}}), {"_id": 0, "id": 1, "name": 1}
    ).to_list(None)
    vehicles = await db.vehicles.find(
        tenant_filter(user, {"id": {"$in": list({d["vehicle_id"] for d in docs})}}),
        {"_id": 0, "id": 1, "client_id": 1, "license_plate": 1, "make": 1, "model": 1},
    ).to_list(None)
    names = {c["id"]: c["name"] for c in clients}
    by_vehicle = {v["id"]: v for v in vehicles}
    for doc in docs:
        vehicle = by_vehicle.get(doc["vehicle_id"], {})
        if vehicle.get("client_id") != doc["client_id"]:
            vehicle = {}
        doc.update(
            client_name=names.get(doc["client_id"], ""),
            license_plate=vehicle.get("license_plate", ""),
            vehicle_label=f"{vehicle.get('make', '')} {vehicle.get('model', '')}".strip(),
        )
    return docs


@api.get("/work-orders")
async def list_wo(
    user: CurrentUser, search: str = "", status_filter: Optional[str] = None, skip: int = 0, limit: int = 2000
):
    q = tenant_filter(user)
    if status_filter and status_filter != "todos":
        q["status"] = status_filter
    if skip < 0 or not 1 <= limit <= 2000:
        raise HTTPException(422, "Paginação inválida: skip >= 0 e limit entre 1 e 2000.")
    if search.strip():
        rx = {"$regex": re.escape(search.strip()), "$options": "i"}
        clients = await db.clients.find(tenant_filter(user, {"name": rx}), {"_id": 0, "id": 1}).to_list(None)
        vehicles = await db.vehicles.find(tenant_filter(user, {"license_plate": rx}), {"_id": 0, "id": 1}).to_list(None)
        q["$or"] = [
            {"number": rx},
            {"client_id": {"$in": [c["id"] for c in clients]}},
            {"vehicle_id": {"$in": [v["id"] for v in vehicles]}},
        ]
    docs = (
        await db.work_orders.find(q, {"_id": 0})
        .sort([("created_at", -1), ("id", 1)])
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return await enrich_work_orders(docs, user)


@api.post("/work-orders", status_code=201)
async def create_wo(data: WorkOrderIn, user: CurrentUser):
    async def operation(session):
        await validate_order_relations(data, user, session=session)
        number = await next_work_order_number(user, session=session)
        items = [{"id": new_id(), **it.model_dump()} for it in data.items]
        totals = compute_totals(items)
        doc = {
            "id": new_id(),
            "workshop_id": user["workshop_id"],
            "number": number,
            "client_id": data.client_id,
            "vehicle_id": data.vehicle_id,
            "mechanic": data.mechanic,
            "complaint": data.complaint,
            "notes": data.notes,
            "mileage_in": data.mileage_in,
            "status": data.status,
            "items": items,
            **totals,
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "completed_at": now_iso() if data.status == "concluido" else None,
        }
        await db.work_orders.insert_one(doc, session=session)
        await apply_work_order_stock(user, items, 1, doc["id"], f"Utilizado OS {number}", session=session)
        doc.pop("_id", None)
        return await _enrich_wo(doc, session=session)

    return await transact(db, operation)


@api.get("/work-orders/{wo_id}")
async def get_wo(wo_id: str, user: CurrentUser):
    doc = await db.work_orders.find_one(tenant_filter(user, {"id": wo_id}), {"_id": 0})
    if not doc:
        raise HTTPException(404, "OS não encontrada")
    return await _enrich_wo(doc)


@api.put("/work-orders/{wo_id}")
async def update_wo(wo_id: str, data: WorkOrderIn, user: CurrentUser):
    async def operation(session):
        existing = await db.work_orders.find_one(tenant_filter(user, {"id": wo_id}), {"_id": 0}, session=session)
        if not existing:
            raise HTTPException(404, "OS não encontrada")
        if await db.invoices.find_one(
            tenant_filter(user, {"work_order_id": wo_id}), {"_id": 0, "id": 1}, session=session
        ):
            raise HTTPException(409, "Esta OS já tem documentos emitidos e não pode ser alterada")
        await validate_order_relations(data, user, session=session)
        items = [{"id": new_id(), **it.model_dump()} for it in data.items]
        totals = compute_totals(items)
        upd = {
            "client_id": data.client_id,
            "vehicle_id": data.vehicle_id,
            "mechanic": data.mechanic,
            "complaint": data.complaint,
            "notes": data.notes,
            "mileage_in": data.mileage_in,
            "status": data.status,
            "items": items,
            **totals,
            "updated_at": now_iso(),
        }
        upd["completed_at"] = (existing.get("completed_at") or now_iso()) if data.status == "concluido" else None
        await db.work_orders.update_one(tenant_filter(user, {"id": wo_id}), {"$set": upd}, session=session)
        old_deltas, new_deltas = stock_deltas(existing.get("items", [])), stock_deltas(items)
        for product_id in set(old_deltas) | set(new_deltas):
            # New quantity minus old quantity: a positive difference consumes stock.
            difference = new_deltas.get(product_id, 0) - old_deltas.get(product_id, 0)
            await apply_stock_delta(
                user, product_id, -difference, f"Ajuste OS {existing['number']}", work_order_id=wo_id, session=session
            )
        return {"ok": True}

    return await transact(db, operation)


@api.delete("/work-orders/{wo_id}")
async def delete_wo(wo_id: str, user: CurrentUser):
    async def operation(session):
        existing = await db.work_orders.find_one(tenant_filter(user, {"id": wo_id}), {"_id": 0}, session=session)
        if not existing:
            raise HTTPException(404, "OS não encontrada")
        if await db.invoices.find_one(
            tenant_filter(user, {"work_order_id": wo_id}), {"_id": 0, "id": 1}, session=session
        ):
            raise HTTPException(409, "Esta OS já tem documentos emitidos e não pode ser apagada")
        await db.work_orders.delete_one(tenant_filter(user, {"id": wo_id}), session=session)
        await apply_work_order_stock(
            user,
            existing.get("items", []),
            -1,
            wo_id,
            f"Reposição por eliminação OS {existing['number']}",
            session=session,
        )
        return {"ok": True}

    return await transact(db, operation)


# ----------------------------- products (stock) -----------------------------
@api.get("/products")
async def list_products(user: CurrentUser, search: str = "", category: Optional[str] = None):
    q = tenant_filter(user)
    if category and category != "todos":
        q["category"] = category
    if search:
        rx = {"$regex": re.escape(search), "$options": "i"}
        q["$or"] = [{"name": rx}, {"reference": rx}, {"supplier": rx}]
    return await db.products.find(q, {"_id": 0}).sort("name", 1).to_list(2000)


@api.post("/products", status_code=201)
async def create_product(data: ProductIn, user: CurrentUser):
    async def operation(session):
        doc = {
            "id": new_id(),
            "workshop_id": user["workshop_id"],
            **data.model_dump(),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        opening_stock = doc["stock"]
        doc["stock"] = 0
        await db.products.insert_one(doc, session=session)
        await apply_stock_delta(user, doc["id"], opening_stock, "Stock inicial", session=session)
        doc["stock"] = opening_stock
        doc.pop("_id", None)
        return doc

    return await transact(db, operation)


@api.get("/products/{pid}")
async def get_product(pid: str, user: CurrentUser):
    doc = await db.products.find_one(tenant_filter(user, {"id": pid}), {"_id": 0})
    if not doc:
        raise HTTPException(404, "Produto não encontrado")
    doc["movements"] = await db.stock_movements.find(
        tenant_filter(user, {"product_id": pid}), {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return doc


@api.put("/products/{pid}")
async def update_product(pid: str, data: ProductUpdateIn, user: CurrentUser):
    async def operation(session):
        scope = tenant_filter(user, {"id": pid})
        existing = await db.products.find_one(scope, {"_id": 0}, session=session)
        if not existing:
            raise HTTPException(404, "Produto não encontrado")
        update = data.model_dump(exclude={"stock"})
        await db.products.update_one(scope, {"$set": {**update, "updated_at": now_iso()}}, session=session)
        if data.stock is not None:
            await apply_stock_delta(user, pid, data.stock - existing["stock"], "Ajuste manual de stock", session=session)
        return {"ok": True}

    return await transact(db, operation)


@api.delete("/products/{pid}")
async def delete_product(pid: str, user: CurrentUser):
    async def operation(session):
        product = await db.products.find_one(tenant_filter(user, {"id": pid}), {"_id": 0, "id": 1}, session=session)
        if not product:
            raise HTTPException(404, "Produto não encontrado")
        used_in_wo = await db.work_orders.find_one(
            tenant_filter(user, {"items.product_id": pid}), {"_id": 0, "id": 1}, session=session
        )
        used_in_po = await db.purchase_orders.find_one(
            tenant_filter(user, {"items.product_id": pid}), {"_id": 0, "id": 1}, session=session
        )
        used_in_quote = await db.quotes.find_one(
            tenant_filter(user, {"items.product_id": pid}), {"_id": 0, "id": 1}, session=session
        )
        if used_in_wo or used_in_po or used_in_quote:
            raise HTTPException(
                409, "Não é possível apagar um produto usado em documentos. Mantenha-o para preservar o histórico."
            )
        await db.products.delete_one(tenant_filter(user, {"id": pid}), session=session)
        return {"ok": True}

    return await transact(db, operation)


# ----------------------------- purchase orders (encomendas) -----------------------------
@api.get("/purchase-orders")
async def list_po(user: CurrentUser):
    return await db.purchase_orders.find(tenant_filter(user), {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.post("/purchase-orders", status_code=201)
async def create_po(data: PurchaseOrderIn, user: CurrentUser):
    async def operation(session):
        items = []
        for it in data.items:
            line = compute_totals([it.model_dump()])["subtotal"]
            prod = await db.products.find_one_and_update(
                tenant_filter(user, {"id": it.product_id}),
                {"$inc": {"reference_revision": 1}},
                projection={"_id": 0, "name": 1, "reference": 1},
                session=session,
            )
            if not prod:
                raise HTTPException(404, "Produto não encontrado nesta oficina")
            items.append(
                {
                    "id": new_id(),
                    **it.model_dump(),
                    "product_name": prod["name"] if prod else "",
                    "line_total": round(line, 2),
                }
            )
        totals = compute_totals(items)
        doc = {
            "id": new_id(),
            "workshop_id": user["workshop_id"],
            "supplier": data.supplier,
            "items": items,
            "notes": data.notes,
            **totals,
            "status": "pendente",  # pendente | recebida
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.purchase_orders.insert_one(doc, session=session)
        doc.pop("_id", None)
        return doc

    return await transact(db, operation)


@api.post("/purchase-orders/{po_id}/receive")
async def receive_po(po_id: str, user: CurrentUser):
    async def operation(session):
        po = await db.purchase_orders.find_one_and_update(
            tenant_filter(user, {"id": po_id, "status": "pendente"}),
            {"$set": {"status": "recebida", "updated_at": now_iso()}},
            return_document=ReturnDocument.BEFORE,
            projection={"_id": 0},
            session=session,
        )
        if not po:
            existing = await db.purchase_orders.find_one(
                tenant_filter(user, {"id": po_id}), {"_id": 0, "status": 1}, session=session
            )
            if not existing:
                raise HTTPException(404, "Encomenda não encontrada")
            return {"ok": True, "already": True}
        for it in po["items"]:
            await apply_stock_delta(
                user, it["product_id"], it["quantity"], "Entrada encomenda", purchase_order_id=po_id, session=session
            )
        return {"ok": True}

    return await transact(db, operation)


# ----------------------------- photos -----------------------------
@api.get("/photos")
async def list_photos(user: CurrentUser, vehicle_id: Optional[str] = None):
    q: dict = tenant_filter(user)
    if vehicle_id:
        v = await db.vehicles.find_one(tenant_filter(user, {"id": vehicle_id}))
        if not v:
            return []
        q["vehicle_id"] = vehicle_id
    return await db.photos.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/photos", status_code=201)
async def create_photo(data: PhotoIn, user: CurrentUser):
    async def operation(session):
        v = await db.vehicles.find_one_and_update(
            tenant_filter(user, {"id": data.vehicle_id}), {"$inc": {"reference_revision": 1}}, session=session
        )
        if not v:
            raise HTTPException(404, "Viatura não encontrada")
        await require_media(data.media_id, user, session=session)
        doc = {"id": new_id(), "workshop_id": user["workshop_id"], **data.model_dump(), "created_at": now_iso()}
        await db.photos.insert_one(doc, session=session)
        doc.pop("_id", None)
        return doc

    return await transact(db, operation)


@api.delete("/photos/{pid}")
async def delete_photo(pid: str, user: CurrentUser):
    await db.photos.delete_one({"id": pid, "workshop_id": user["workshop_id"]})
    return {"ok": True}


# ----------------------------- damages -----------------------------
async def require_media(media_id: str, user: dict, session=None):
    if not await db.media.find_one(tenant_filter(user, {"id": media_id}), {"_id": 0, "id": 1}, session=session):
        raise HTTPException(404, "Fotografia não encontrada")


@api.get("/damages")
async def list_damages(user: CurrentUser, vehicle_id: Optional[str] = None):
    q: dict = tenant_filter(user)
    if vehicle_id:
        q["vehicle_id"] = vehicle_id
    return await db.damages.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/damages", status_code=201)
async def create_damage(data: DamageIn, user: CurrentUser):
    async def operation(session):
        v = await db.vehicles.find_one_and_update(
            tenant_filter(user, {"id": data.vehicle_id}), {"$inc": {"reference_revision": 1}}, session=session
        )
        if not v:
            raise HTTPException(404, "Viatura não encontrada")
        await require_media(data.media_id, user, session=session)
        if data.photo_id and not await db.photos.find_one(
            tenant_filter(user, {"id": data.photo_id, "vehicle_id": data.vehicle_id}),
            {"_id": 0, "id": 1},
            session=session,
        ):
            raise HTTPException(404, "Fotografia não encontrada nesta viatura")
        doc = {"id": new_id(), "workshop_id": user["workshop_id"], **data.model_dump(), "created_at": now_iso()}
        await db.damages.insert_one(doc, session=session)
        doc.pop("_id", None)
        return doc

    return await transact(db, operation)


@api.delete("/damages/{damage_id}")
async def delete_damage(damage_id: str, user: CurrentUser):
    result = await db.damages.delete_one(tenant_filter(user, {"id": damage_id}))
    if not result.deleted_count:
        raise HTTPException(404, "Dano não encontrado")
    return {"ok": True}


# ----------------------------- quotes (orçamentos) -----------------------------
@api.get("/quotes")
async def list_quotes(user: CurrentUser):
    docs = await db.quotes.find(tenant_filter(user), {"_id": 0}).sort("created_at", -1).to_list(1000)
    workshop = await db.workshops.find_one({"id": user["workshop_id"]}, {"_id": 0, "name": 1})
    clients = await db.clients.find(
        tenant_filter(user, {"id": {"$in": [d["client_id"] for d in docs]}}),
        {"_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1},
    ).to_list(None)
    vehicles = await db.vehicles.find(
        tenant_filter(user, {"id": {"$in": [d["vehicle_id"] for d in docs]}}),
        {"_id": 0, "id": 1, "license_plate": 1, "make": 1, "model": 1},
    ).to_list(None)
    by_client, by_vehicle = {c["id"]: c for c in clients}, {v["id"]: v for v in vehicles}
    for d in docs:
        client = by_client.get(d["client_id"], {})
        d.update(
            client_name=client.get("name", ""),
            client_email=client.get("email"),
            client_phone=client.get("phone"),
            workshop_name=workshop["name"] if workshop else "RoadMesh",
            vehicle=by_vehicle.get(d["vehicle_id"], {}),
        )
    return docs


@api.post("/quotes", status_code=201)
async def create_quote(data: QuoteIn, user: CurrentUser):
    async def operation(session):
        await validate_order_relations(data, user, session=session)
        if not await db.clients.find_one_and_update(
            tenant_filter(user, {"id": data.client_id}),
            {"$inc": {"reference_revision": 1}},
            projection={"_id": 0, "id": 1},
            session=session,
        ):
            raise HTTPException(404, "Cliente não encontrado")
        if not await db.vehicles.find_one_and_update(
            tenant_filter(user, {"id": data.vehicle_id, "client_id": data.client_id}),
            {"$inc": {"reference_revision": 1}},
            projection={"_id": 0, "id": 1},
            session=session,
        ):
            raise HTTPException(404, "Viatura não encontrada para este cliente")
        if not data.items:
            raise HTTPException(422, "Adicione pelo menos uma linha ao orçamento")
        items = [{"id": new_id(), **it.model_dump()} for it in data.items]
        totals = compute_totals(items)
        doc = {
            "id": new_id(),
            "workshop_id": user["workshop_id"],
            "number": await next_yearly_number(user, "quotes", "number", "ORC", session=session),
            "client_id": data.client_id,
            "vehicle_id": data.vehicle_id,
            "items": items,
            "notes": data.notes,
            **totals,
            "status": "rascunho",  # rascunho | enviado | aceite | recusado
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.quotes.insert_one(doc, session=session)
        doc.pop("_id", None)
        return doc

    return await transact(db, operation)


@api.post("/quotes/{qid}/status")
async def set_quote_status(qid: str, body: dict, user: CurrentUser):
    st = body.get("status")
    if st not in {"rascunho", "enviado", "aceite", "recusado"}:
        raise HTTPException(400, "Estado inválido")
    r = await db.quotes.update_one(tenant_filter(user, {"id": qid, "converted_work_order_id": None}),
                                    {"$set": {"status": st, "updated_at": now_iso()}})
    if r.matched_count == 0:
        if await db.quotes.find_one(tenant_filter(user, {"id": qid}), {"_id": 0, "id": 1}):
            raise HTTPException(409, "Um orçamento convertido não pode mudar de estado.")
        raise HTTPException(404, "Orçamento não encontrado")
    return {"ok": True}


@api.post("/quotes/{qid}/convert")
async def convert_quote_to_wo(qid: str, user: CurrentUser):
    async def operation(session):
        q = await db.quotes.find_one(tenant_filter(user, {"id": qid}), {"_id": 0}, session=session)
        if not q:
            raise HTTPException(404, "Orçamento não encontrado")
        if q.get("converted_work_order_id"):
            raise HTTPException(409, "Este orçamento já foi convertido numa OS")
        if q["status"] != "aceite":
            raise HTTPException(400, "Só é possível converter orçamentos aceites")
        if await db.work_orders.find_one(tenant_filter(user, {"quote_id": qid}), {"_id": 0, "id": 1}, session=session):
            raise HTTPException(409, "Este orçamento já foi convertido numa OS")
        wo = {
            "id": new_id(),
            "workshop_id": user["workshop_id"],
            "number": await next_work_order_number(user, session=session),
            "client_id": q["client_id"],
            "vehicle_id": q["vehicle_id"],
            "mechanic": None,
            "complaint": None,
            "notes": q.get("notes"),
            "mileage_in": None,
            "status": "entrada",
            "items": q["items"],
            "subtotal": q["subtotal"],
            "vat": q["vat"],
            "total": q["total"],
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "completed_at": None,
            "quote_id": qid,
        }
        await validate_order_relations(
            WorkOrderIn(client_id=q["client_id"], vehicle_id=q["vehicle_id"], items=q["items"]), user, session=session
        )
        await db.quotes.update_one(
            tenant_filter(user, {"id": qid}),
            {"$set": {"converted_work_order_id": wo["id"], "updated_at": now_iso()}},
            session=session,
        )
        await db.work_orders.insert_one(wo, session=session)
        await apply_work_order_stock(user, wo["items"], 1, wo["id"], f"Utilizado OS {wo['number']}", session=session)
        wo.pop("_id", None)
        return await _enrich_wo(wo, session=session)

    return await transact(db, operation)


# ----------------------------- invoices -----------------------------
async def invoice_snapshot(wo: dict, user: dict, session=None):
    client_doc = await db.clients.find_one(tenant_filter(user, {"id": wo["client_id"]}), {"_id": 0}, session=session)
    vehicle = await db.vehicles.find_one(tenant_filter(user, {"id": wo["vehicle_id"]}), {"_id": 0}, session=session)
    workshop = await db.workshops.find_one({"id": user["workshop_id"]}, {"_id": 0}, session=session)
    return {
        "client": client_doc or {},
        "vehicle": vehicle or {},
        "workshop": workshop or {},
        "items": wo.get("items", []),
        "wo_number": wo["number"],
        "notes": wo.get("notes"),
    }


@api.get("/invoices")
async def list_invoices(user: CurrentUser):
    docs = await db.invoices.find(tenant_filter(user), {"_id": 0}).sort("created_at", -1).to_list(1000)
    for d in docs:
        if d.get("snapshot"):
            d["client_name"] = d["snapshot"].get("client", {}).get("name", "")
            d["wo_number"] = d["snapshot"].get("wo_number", "")
            d.pop("snapshot", None)
            continue
        wo = await db.work_orders.find_one(tenant_filter(user, {"id": d["work_order_id"]}), {"_id": 0, "client_id": 1, "number": 1})
        if wo:
            c = await db.clients.find_one(tenant_filter(user, {"id": wo["client_id"]}), {"_id": 0, "name": 1})
            d["client_name"] = c["name"] if c else ""
            d["wo_number"] = wo["number"]
    return docs


@api.post("/invoices", status_code=201)
async def create_invoice(data: InvoiceIn, user: CurrentUser):
    async def operation(session):
        wo = await db.work_orders.find_one(tenant_filter(user, {"id": data.work_order_id}), {"_id": 0}, session=session)
        if not wo:
            raise HTTPException(404, "OS não encontrada")
        if wo["status"] != "concluido":
            raise HTTPException(409, "Só é possível emitir documentos para uma OS concluída")
        if await db.invoices.find_one(
            tenant_filter(user, {"work_order_id": data.work_order_id, "document_type": data.document_type}),
            {"_id": 0, "id": 1},
            session=session,
        ):
            raise HTTPException(409, "Já existe um documento deste tipo para esta OS")
        # Touch the OS so issuing a document conflicts with concurrent edits/deletion.
        await db.work_orders.update_one(
            tenant_filter(user, {"id": data.work_order_id}), {"$inc": {"document_revision": 1}}, session=session
        )
        total_labor = compute_totals([it for it in wo["items"] if it["item_type"] == "mao_de_obra"])["subtotal"]
        total_parts = compute_totals([it for it in wo["items"] if it["item_type"] == "peca"])["subtotal"]
        prefix = {"orcamento": "ORC", "fatura": "FT", "fatura_recibo": "FR"}[data.document_type]
        doc = {
            "id": new_id(),
            "workshop_id": user["workshop_id"],
            "work_order_id": data.work_order_id,
            "document_type": data.document_type,
            "document_number": await next_yearly_number(user, "invoices", "document_number", prefix, session=session),
            "total_labor": round(total_labor, 2),
            "total_parts": round(total_parts, 2),
            "subtotal": wo["subtotal"],
            "vat": wo["vat"],
            "grand_total": wo["total"],
            "external_invoice_id": None,
            "snapshot": await invoice_snapshot(wo, user, session=session),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.invoices.insert_one(doc, session=session)
        doc.pop("_id", None)
        return doc

    return await transact(db, operation)


@api.get("/invoices/{invoice_id}/pdf")
async def invoice_pdf(invoice_id: str, user: CurrentUser):
    invoice = await db.invoices.find_one(tenant_filter(user, {"id": invoice_id}), {"_id": 0})
    if not invoice:
        raise HTTPException(404, "Documento não encontrado")
    if not invoice.get("snapshot"):
        wo = await db.work_orders.find_one(tenant_filter(user, {"id": invoice["work_order_id"]}), {"_id": 0})
        if not wo:
            raise HTTPException(404, "Não existem detalhes da OS para exportar este documento antigo")
        invoice["snapshot"] = await invoice_snapshot(wo, user)
        await db.invoices.update_one(tenant_filter(user, {"id": invoice_id}), {"$set": {"snapshot": invoice["snapshot"]}})
    pdf = await run_in_threadpool(build_invoice_pdf, invoice)
    filename = re.sub(r"[^A-Za-z0-9_-]", "-", invoice["document_number"]) + ".pdf"
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="RoadMesh-{filename}"', "Cache-Control": "private, no-store"})


# ----------------------------- dashboard -----------------------------
@api.get("/dashboard")
async def dashboard(user: CurrentUser):
    f = tenant_filter(user)
    total = await db.work_orders.count_documents(f)
    em_rep = await db.work_orders.count_documents({**f, "status": {"$in": ["entrada", "diagnostico"]}})
    aguarda = await db.work_orders.count_documents({**f, "status": "aguardando_pecas"})
    # month invoicing
    start_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    revenue = await db.invoices.aggregate(revenue_pipeline(f, since=start_month)).to_list(1)
    faturacao = round(revenue[0]["total"], 2) if revenue else 0

    recent = await db.work_orders.find(f, {"_id": 0}).sort("created_at", -1).to_list(6)
    recent = await enrich_work_orders(recent, user)

    return {
        "kpis": {
            "ordens": total,
            "em_reparacao": em_rep,
            "aguarda_cliente": aguarda,
            "faturacao": faturacao,
        },
        "recent_work_orders": recent,
    }


# ----------------------------- seed demo -----------------------------
async def seed_demo_data(workshop_id: str, user_id: str):
    ts = now_iso()

    def wid(d): return {**d, "workshop_id": workshop_id, "created_at": ts, "updated_at": ts}

    clients = [
        wid({"id": new_id(), "name": "João Silva", "nif": "234567890", "phone": "912 345 678",
             "email": "joao@email.pt", "address": "Rua das Flores, 210, 1200-100 Lisboa"}),
        wid({"id": new_id(), "name": "Ana Costa", "nif": "212345678", "phone": "913 222 111",
             "email": "ana.costa@email.pt", "address": "Av. República, 45, Porto"}),
        wid({"id": new_id(), "name": "Pedro Alves", "nif": "220456789", "phone": "914 555 222",
             "email": "pedro@email.pt", "address": "Rua Nova, 12, Braga"}),
        wid({"id": new_id(), "name": "Marta Lopes", "nif": "224789123", "phone": "915 666 333",
             "email": "marta@email.pt", "address": "Rua do Sol, 88, Coimbra"}),
        wid({"id": new_id(), "name": "Carlos Ferreira", "nif": "228112233", "phone": "916 777 444",
             "email": "carlos@email.pt", "address": "Rua Central, 3, Setúbal"}),
    ]
    await db.clients.insert_many(clients)

    vehicles = [
        wid({"id": new_id(), "client_id": clients[0]["id"], "license_plate": "AA-12-BB",
             "make": "BMW", "model": "320d", "year": 2019, "fuel": "Diesel", "mileage": 84500, "vin": "WBA5A7C50FD001234"}),
        wid({"id": new_id(), "client_id": clients[1]["id"], "license_plate": "22-CD-44",
             "make": "VW", "model": "Golf", "year": 2017, "fuel": "Gasolina", "mileage": 105000, "vin": "WVWZZZ1KZ7W123456"}),
        wid({"id": new_id(), "client_id": clients[2]["id"], "license_plate": "55-CD-99",
             "make": "Audi", "model": "A4", "year": 2018, "fuel": "Diesel", "mileage": 92000, "vin": "WAUZZZ8K5JA111222"}),
        wid({"id": new_id(), "client_id": clients[3]["id"], "license_plate": "11-GG-22",
             "make": "Renault", "model": "Clio", "year": 2020, "fuel": "Gasolina", "mileage": 45000, "vin": "VF1CB0A0H12345678"}),
        wid({"id": new_id(), "client_id": clients[4]["id"], "license_plate": "77-JK-11",
             "make": "Peugeot", "model": "308", "year": 2016, "fuel": "Diesel", "mileage": 132000, "vin": "VF3LBHZTZFS123456"}),
    ]
    await db.vehicles.insert_many(vehicles)

    products = [
        wid({"id": new_id(), "reference": "OL-SW30", "name": "Óleo Motor SW30 5L",
             "supplier": "Fornecedor X", "category": "Óleos", "stock": 24, "min_stock": 10,
             "purchase_price": 32.00, "sale_price": 42.50, "vat_rate": 23}),
        wid({"id": new_id(), "reference": "PB-001", "name": "Pastilhas Travão BMW",
             "supplier": "Bosch", "category": "Travões", "stock": 3, "min_stock": 5,
             "purchase_price": 55.00, "sale_price": 85.00, "vat_rate": 23}),
        wid({"id": new_id(), "reference": "FL-001", "name": "Filtro de Óleo",
             "supplier": "Mann", "category": "Filtros", "stock": 42, "min_stock": 15,
             "purchase_price": 6.50, "sale_price": 12.50, "vat_rate": 23}),
        wid({"id": new_id(), "reference": "BAT-001", "name": "Bateria 12V 70Ah",
             "supplier": "Varta", "category": "Baterias", "stock": 8, "min_stock": 4,
             "purchase_price": 85.00, "sale_price": 130.00, "vat_rate": 23}),
        wid({"id": new_id(), "reference": "PN-205", "name": "Pneu 205/55 R16",
             "supplier": "Michelin", "category": "Pneus", "stock": 16, "min_stock": 8,
             "purchase_price": 62.00, "sale_price": 95.00, "vat_rate": 23}),
    ]
    await db.products.insert_many(products)

    # work orders
    def item(t, desc, qty, price, rate=23):
        return {"id": new_id(), "item_type": t, "description": desc, "quantity": qty,
                "unit_price": price, "vat_rate": rate, "product_id": None}

    wos = []
    wo1_items = [item("mao_de_obra", "Mudança de óleo", 1, 80),
                 item("peca", "Pastilhas de travão", 1, 120),
                 item("mao_de_obra", "Mão de obra", 2, 45)]
    totals1 = compute_totals(wo1_items)
    wos.append(wid({"id": new_id(), "number": "#1024", "client_id": clients[0]["id"],
                    "vehicle_id": vehicles[0]["id"], "mechanic": "Rodrigo Ricardo",
                    "complaint": "Ruído nos travões",
                    "notes": "Substituídas pastilhas dianteiras.", "mileage_in": 84500,
                    "status": "diagnostico", "items": wo1_items, **totals1, "completed_at": None}))

    wo2_items = [item("mao_de_obra", "Revisão geral", 3, 40),
                 item("peca", "Filtro de óleo", 1, 12.50)]
    totals2 = compute_totals(wo2_items)
    wos.append(wid({"id": new_id(), "number": "#1023", "client_id": clients[1]["id"],
                    "vehicle_id": vehicles[1]["id"], "mechanic": "Rodrigo Ricardo",
                    "complaint": "Revisão anual", "notes": "", "mileage_in": 105000,
                    "status": "entrada", "items": wo2_items, **totals2, "completed_at": None}))

    wo3_items = [item("mao_de_obra", "Substituição correia", 2, 60),
                 item("peca", "Correia distribuição", 1, 380)]
    totals3 = compute_totals(wo3_items)
    wos.append(wid({"id": new_id(), "number": "#1022", "client_id": clients[2]["id"],
                    "vehicle_id": vehicles[2]["id"], "mechanic": "Rodrigo Ricardo",
                    "complaint": "Barulho no motor", "notes": "Correia trocada, tudo ok.",
                    "mileage_in": 92000, "status": "concluido", "items": wo3_items, **totals3,
                    "completed_at": ts}))

    wo4_items = [item("mao_de_obra", "Diagnóstico", 1, 30),
                 item("peca", "Sensor", 1, 60)]
    totals4 = compute_totals(wo4_items)
    wos.append(wid({"id": new_id(), "number": "#1021", "client_id": clients[3]["id"],
                    "vehicle_id": vehicles[3]["id"], "mechanic": "Rodrigo Ricardo",
                    "complaint": "Luz avaria no painel", "notes": "", "mileage_in": 45000,
                    "status": "aguardando_pecas", "items": wo4_items, **totals4, "completed_at": None}))

    await db.work_orders.insert_many(wos)

    # one invoice
    concluded = [w for w in wos if w["status"] == "concluido"][0]
    inv = wid({
        "id": new_id(), "work_order_id": concluded["id"],
        "document_type": "fatura", "document_number": f"FT{datetime.now().year}/001",
        "total_labor": 120.0, "total_parts": 380.0,
        "subtotal": concluded["subtotal"], "vat": concluded["vat"], "grand_total": concluded["total"],
        "external_invoice_id": None,
    })
    inv.pop("workshop_id", None)  # re-add cleanly
    inv["workshop_id"] = workshop_id
    await db.invoices.insert_one(inv)


# ----------------------------- health -----------------------------
@api.get("/brand/logo.png")
async def brand_logo():
    # Public brand art only; user-submitted media always uses authenticated routes.
    # This is a local cache of the version stored in managed object storage.
    return FileResponse(ROOT_DIR / "assets" / "roadmesh-logo.png", media_type="image/png",
                        headers={"Cache-Control": "public, max-age=86400"})


@api.get("/")
async def root():
    return {"app": "RoadMesh", "status": "ok"}


# ----------------------------- register app -----------------------------
register_admin_routes(api, db, access)
register_portal_routes(api, db, access)
register_media_routes(api, db, access)
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=[
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", "http://localhost:8081,http://localhost:19006").split(",")
        if origin.strip()
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("roadmesh")


@app.on_event("startup")
async def _startup_storage():
    await initialize_integrity(db)
    await access.initialize()
    try:
        await run_in_threadpool(init_storage)
    except Exception as exc:
        logger.warning("Photo storage startup unavailable: %s", type(exc).__name__)


@app.on_event("shutdown")
async def _shutdown():
    if client is None:
        await db.close()
    else:
        client.close()

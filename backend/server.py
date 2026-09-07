"""RoadMesh backend API - multi-tenant workshop SaaS."""
from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, List, Optional, Literal

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.concurrency import run_in_threadpool
from media_storage import init_storage, register_media_routes
from pdf_documents import build_invoice_pdf
from access_control import Access, register_auth_routes
from admin_routes import register_admin_routes
from portal_routes import register_portal_routes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
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
    status: str = "entrada"  # entrada | diagnostico | aguardando_pecas | concluido
    items: List[WorkOrderItemIn] = []


class ProductIn(BaseModel):
    reference: str
    name: str
    supplier: Optional[str] = None
    category: Optional[str] = None
    stock: int = 0
    min_stock: int = 0
    purchase_price: float = 0
    sale_price: float = 0
    vat_rate: float = 23


class OrderItemIn(BaseModel):
    product_id: str
    quantity: int
    unit_price: float


class PurchaseOrderIn(BaseModel):
    supplier: str
    items: List[OrderItemIn]
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
    for d in docs:
        d["vehicles_count"] = await db.vehicles.count_documents(tenant_filter(user, {"client_id": d["id"]}))
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
    await db.clients.delete_one(tenant_filter(user, {"id": client_id}))
    return {"ok": True}


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
    if not await db.clients.find_one(tenant_filter(user, {"id": data.client_id}), {"_id": 0, "id": 1}):
        raise HTTPException(404, "Cliente não encontrado")
    doc = {"id": new_id(), "workshop_id": user["workshop_id"], **data.model_dump(),
           "created_at": now_iso(), "updated_at": now_iso()}
    await db.vehicles.insert_one(doc)
    doc.pop("_id", None)
    return doc


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
    if not await db.clients.find_one(tenant_filter(user, {"id": data.client_id}), {"_id": 0, "id": 1}):
        raise HTTPException(404, "Cliente não encontrado")
    r = await db.vehicles.update_one(tenant_filter(user, {"id": vehicle_id}),
                                      {"$set": {**data.model_dump(), "updated_at": now_iso()}})
    if r.matched_count == 0:
        raise HTTPException(404, "Viatura não encontrada")
    return {"ok": True}


@api.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: CurrentUser):
    await db.vehicles.delete_one(tenant_filter(user, {"id": vehicle_id}))
    return {"ok": True}


# ----------------------------- work orders -----------------------------
async def validate_order_relations(data, user):
    if not await db.clients.find_one(tenant_filter(user, {"id": data.client_id}), {"_id": 0, "id": 1}):
        raise HTTPException(404, "Cliente não encontrado nesta oficina")
    if not await db.vehicles.find_one(tenant_filter(user, {"id": data.vehicle_id, "client_id": data.client_id}), {"_id": 0, "id": 1}):
        raise HTTPException(404, "Viatura não encontrada para este cliente")
    for item in data.items:
        if item.product_id and not await db.products.find_one(tenant_filter(user, {"id": item.product_id}), {"_id": 0, "id": 1}):
            raise HTTPException(404, "Produto não encontrado nesta oficina")


def compute_totals(items: list) -> dict:
    subtotal = 0.0
    vat_total = 0.0
    for it in items:
        line = float(it.get("quantity", 0)) * float(it.get("unit_price", 0))
        subtotal += line
        vat_total += line * float(it.get("vat_rate", 23)) / 100.0
    return {"subtotal": round(subtotal, 2), "vat": round(vat_total, 2), "total": round(subtotal + vat_total, 2)}


async def _enrich_wo(wo: dict) -> dict:
    client = await db.clients.find_one({"id": wo["client_id"], "workshop_id": wo["workshop_id"]}, {"_id": 0, "name": 1})
    vehicle = await db.vehicles.find_one({"id": wo["vehicle_id"], "workshop_id": wo["workshop_id"], "client_id": wo["client_id"]}, {"_id": 0, "license_plate": 1, "make": 1, "model": 1})
    wo["client_name"] = client["name"] if client else ""
    wo["vehicle_label"] = f"{vehicle['make']} {vehicle['model']}" if vehicle else ""
    wo["license_plate"] = vehicle["license_plate"] if vehicle else ""
    return wo


@api.get("/work-orders")
async def list_wo(user: CurrentUser, search: str = "", status_filter: Optional[str] = None):
    q = tenant_filter(user)
    if status_filter and status_filter != "todos":
        q["status"] = status_filter
    docs = await db.work_orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    for d in docs:
        await _enrich_wo(d)
    if search:
        s = search.lower()
        docs = [d for d in docs if s in d.get("client_name", "").lower()
                or s in d.get("license_plate", "").lower()
                or s in d.get("number", "").lower()]
    return docs


@api.post("/work-orders", status_code=201)
async def create_wo(data: WorkOrderIn, user: CurrentUser):
    await validate_order_relations(data, user)
    count = await db.work_orders.count_documents(tenant_filter(user))
    number = f"#{1024 + count}"
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
        "completed_at": None,
    }
    await db.work_orders.insert_one(doc)
    # discount stock for parts with product_id
    for it in items:
        if it.get("item_type") == "peca" and it.get("product_id"):
            await db.products.update_one(
                tenant_filter(user, {"id": it["product_id"]}),
                {"$inc": {"stock": -int(it["quantity"])}}
            )
            await db.stock_movements.insert_one({
                "id": new_id(),
                "workshop_id": user["workshop_id"],
                "product_id": it["product_id"],
                "delta": -int(it["quantity"]),
                "reason": f"Utilizado OS {number}",
                "work_order_id": doc["id"],
                "created_at": now_iso(),
            })
    doc.pop("_id", None)
    return await _enrich_wo(doc)


@api.get("/work-orders/{wo_id}")
async def get_wo(wo_id: str, user: CurrentUser):
    doc = await db.work_orders.find_one(tenant_filter(user, {"id": wo_id}), {"_id": 0})
    if not doc:
        raise HTTPException(404, "OS não encontrada")
    return await _enrich_wo(doc)


@api.put("/work-orders/{wo_id}")
async def update_wo(wo_id: str, data: WorkOrderIn, user: CurrentUser):
    await validate_order_relations(data, user)
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
    if data.status == "concluido":
        upd["completed_at"] = now_iso()
    r = await db.work_orders.update_one(tenant_filter(user, {"id": wo_id}), {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "OS não encontrada")
    return {"ok": True}


@api.delete("/work-orders/{wo_id}")
async def delete_wo(wo_id: str, user: CurrentUser):
    await db.work_orders.delete_one(tenant_filter(user, {"id": wo_id}))
    return {"ok": True}


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
    doc = {"id": new_id(), "workshop_id": user["workshop_id"], **data.model_dump(),
           "created_at": now_iso(), "updated_at": now_iso()}
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


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
async def update_product(pid: str, data: ProductIn, user: CurrentUser):
    r = await db.products.update_one(tenant_filter(user, {"id": pid}),
                                      {"$set": {**data.model_dump(), "updated_at": now_iso()}})
    if r.matched_count == 0:
        raise HTTPException(404, "Produto não encontrado")
    return {"ok": True}


@api.delete("/products/{pid}")
async def delete_product(pid: str, user: CurrentUser):
    await db.products.delete_one(tenant_filter(user, {"id": pid}))
    return {"ok": True}


# ----------------------------- purchase orders (encomendas) -----------------------------
@api.get("/purchase-orders")
async def list_po(user: CurrentUser):
    return await db.purchase_orders.find(tenant_filter(user), {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.post("/purchase-orders", status_code=201)
async def create_po(data: PurchaseOrderIn, user: CurrentUser):
    items = []
    subtotal = 0.0
    for it in data.items:
        line = it.quantity * it.unit_price
        subtotal += line
        prod = await db.products.find_one(tenant_filter(user, {"id": it.product_id}), {"_id": 0, "name": 1, "reference": 1})
        if not prod:
            raise HTTPException(404, "Produto não encontrado nesta oficina")
        items.append({"id": new_id(), **it.model_dump(),
                      "product_name": prod["name"] if prod else "", "line_total": round(line, 2)})
    vat = subtotal * 0.23
    doc = {
        "id": new_id(),
        "workshop_id": user["workshop_id"],
        "supplier": data.supplier,
        "items": items,
        "notes": data.notes,
        "subtotal": round(subtotal, 2),
        "vat": round(vat, 2),
        "total": round(subtotal + vat, 2),
        "status": "pendente",  # pendente | recebida
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.purchase_orders.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/purchase-orders/{po_id}/receive")
async def receive_po(po_id: str, user: CurrentUser):
    po = await db.purchase_orders.find_one(tenant_filter(user, {"id": po_id}), {"_id": 0})
    if not po:
        raise HTTPException(404, "Encomenda não encontrada")
    if po["status"] == "recebida":
        return {"ok": True, "already": True}
    for it in po["items"]:
        await db.products.update_one(tenant_filter(user, {"id": it["product_id"]}),
                                      {"$inc": {"stock": int(it["quantity"])}})
        await db.stock_movements.insert_one({
            "id": new_id(), "workshop_id": user["workshop_id"],
            "product_id": it["product_id"], "delta": int(it["quantity"]),
            "reason": "Entrada encomenda", "purchase_order_id": po_id,
            "created_at": now_iso(),
        })
    await db.purchase_orders.update_one(tenant_filter(user, {"id": po_id}),
                                         {"$set": {"status": "recebida", "updated_at": now_iso()}})
    return {"ok": True}


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
    v = await db.vehicles.find_one(tenant_filter(user, {"id": data.vehicle_id}))
    if not v:
        raise HTTPException(404, "Viatura não encontrada")
    await require_media(data.media_id, user)
    doc = {"id": new_id(), "workshop_id": user["workshop_id"], **data.model_dump(),
           "created_at": now_iso()}
    await db.photos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/photos/{pid}")
async def delete_photo(pid: str, user: CurrentUser):
    await db.photos.delete_one({"id": pid, "workshop_id": user["workshop_id"]})
    return {"ok": True}


# ----------------------------- damages -----------------------------
async def require_media(media_id: str, user: dict):
    if not await db.media.find_one(tenant_filter(user, {"id": media_id}), {"_id": 0, "id": 1}):
        raise HTTPException(404, "Fotografia não encontrada")


@api.get("/damages")
async def list_damages(user: CurrentUser, vehicle_id: Optional[str] = None):
    q: dict = tenant_filter(user)
    if vehicle_id:
        q["vehicle_id"] = vehicle_id
    return await db.damages.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/damages", status_code=201)
async def create_damage(data: DamageIn, user: CurrentUser):
    v = await db.vehicles.find_one(tenant_filter(user, {"id": data.vehicle_id}))
    if not v:
        raise HTTPException(404, "Viatura não encontrada")
    await require_media(data.media_id, user)
    if data.photo_id and not await db.photos.find_one(tenant_filter(user, {"id": data.photo_id, "vehicle_id": data.vehicle_id}), {"_id": 0, "id": 1}):
        raise HTTPException(404, "Fotografia não encontrada nesta viatura")
    doc = {"id": new_id(), "workshop_id": user["workshop_id"], **data.model_dump(),
           "created_at": now_iso()}
    await db.damages.insert_one(doc)
    doc.pop("_id", None)
    return doc


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
    for d in docs:
        c = await db.clients.find_one(tenant_filter(user, {"id": d["client_id"]}), {"_id": 0, "name": 1, "email": 1, "phone": 1})
        v = await db.vehicles.find_one(tenant_filter(user, {"id": d["vehicle_id"]}), {"_id": 0, "license_plate": 1, "make": 1, "model": 1})
        d["client_name"] = c["name"] if c else ""
        d["client_email"] = c.get("email") if c else None
        d["client_phone"] = c.get("phone") if c else None
        d["workshop_name"] = workshop["name"] if workshop else "RoadMesh"
        d["vehicle"] = v or {}
    return docs


@api.post("/quotes", status_code=201)
async def create_quote(data: QuoteIn, user: CurrentUser):
    if not await db.clients.find_one(tenant_filter(user, {"id": data.client_id}), {"_id": 0, "id": 1}):
        raise HTTPException(404, "Cliente não encontrado")
    if not await db.vehicles.find_one(tenant_filter(user, {"id": data.vehicle_id, "client_id": data.client_id}), {"_id": 0, "id": 1}):
        raise HTTPException(404, "Viatura não encontrada para este cliente")
    if not data.items:
        raise HTTPException(422, "Adicione pelo menos uma linha ao orçamento")
    items = [{"id": new_id(), **it.model_dump()} for it in data.items]
    totals = compute_totals(items)
    count = await db.quotes.count_documents(tenant_filter(user))
    doc = {
        "id": new_id(), "workshop_id": user["workshop_id"],
        "number": f"ORC{datetime.now().year}/{count + 1:03d}",
        "client_id": data.client_id, "vehicle_id": data.vehicle_id,
        "items": items, "notes": data.notes, **totals,
        "status": "rascunho",  # rascunho | enviado | aceite | recusado
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.quotes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/quotes/{qid}/status")
async def set_quote_status(qid: str, body: dict, user: CurrentUser):
    st = body.get("status")
    if st not in {"rascunho", "enviado", "aceite", "recusado"}:
        raise HTTPException(400, "Estado inválido")
    r = await db.quotes.update_one(tenant_filter(user, {"id": qid}),
                                    {"$set": {"status": st, "updated_at": now_iso()}})
    if r.matched_count == 0:
        raise HTTPException(404, "Orçamento não encontrado")
    return {"ok": True}


@api.post("/quotes/{qid}/convert")
async def convert_quote_to_wo(qid: str, user: CurrentUser):
    q = await db.quotes.find_one(tenant_filter(user, {"id": qid}), {"_id": 0})
    if not q:
        raise HTTPException(404, "Orçamento não encontrado")
    if q["status"] != "aceite":
        raise HTTPException(400, "Só é possível converter orçamentos aceites")
    count = await db.work_orders.count_documents(tenant_filter(user))
    wo = {
        "id": new_id(), "workshop_id": user["workshop_id"],
        "number": f"#{1024 + count}",
        "client_id": q["client_id"], "vehicle_id": q["vehicle_id"],
        "mechanic": None, "complaint": None, "notes": q.get("notes"),
        "mileage_in": None, "status": "entrada",
        "items": q["items"],
        "subtotal": q["subtotal"], "vat": q["vat"], "total": q["total"],
        "created_at": now_iso(), "updated_at": now_iso(), "completed_at": None,
        "quote_id": qid,
    }
    await db.work_orders.insert_one(wo)
    wo.pop("_id", None)
    return await _enrich_wo(wo)


# ----------------------------- invoices -----------------------------
async def invoice_snapshot(wo: dict, user: dict):
    client_doc = await db.clients.find_one(tenant_filter(user, {"id": wo["client_id"]}), {"_id": 0})
    vehicle = await db.vehicles.find_one(tenant_filter(user, {"id": wo["vehicle_id"]}), {"_id": 0})
    workshop = await db.workshops.find_one({"id": user["workshop_id"]}, {"_id": 0})
    return {"client": client_doc or {}, "vehicle": vehicle or {}, "workshop": workshop or {},
            "items": wo.get("items", []), "wo_number": wo["number"], "notes": wo.get("notes")}


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
    wo = await db.work_orders.find_one(tenant_filter(user, {"id": data.work_order_id}), {"_id": 0})
    if not wo:
        raise HTTPException(404, "OS não encontrada")
    total_labor = sum(it["quantity"] * it["unit_price"] for it in wo["items"] if it["item_type"] == "mao_de_obra")
    total_parts = sum(it["quantity"] * it["unit_price"] for it in wo["items"] if it["item_type"] == "peca")
    prefix = {"orcamento": "ORC", "fatura": "FT", "fatura_recibo": "FR"}[data.document_type]
    count = await db.invoices.count_documents(tenant_filter(user, {"document_type": data.document_type}))
    doc = {
        "id": new_id(), "workshop_id": user["workshop_id"],
        "work_order_id": data.work_order_id,
        "document_type": data.document_type,
        "document_number": f"{prefix}{datetime.now().year}/{count + 1:03d}",
        "total_labor": round(total_labor, 2),
        "total_parts": round(total_parts, 2),
        "subtotal": wo["subtotal"], "vat": wo["vat"], "grand_total": wo["total"],
        "external_invoice_id": None,
        "snapshot": await invoice_snapshot(wo, user),
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.invoices.insert_one(doc)
    doc.pop("_id", None)
    return doc


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
    invs = await db.invoices.find(
        {**f, "created_at": {"$gte": start_month}, "document_type": {"$in": ["fatura", "fatura_recibo"]}},
        {"_id": 0, "grand_total": 1}
    ).to_list(2000)
    faturacao = round(sum(i.get("grand_total", 0) for i in invs), 2)

    recent = await db.work_orders.find(f, {"_id": 0}).sort("created_at", -1).to_list(6)
    for w in recent:
        await _enrich_wo(w)

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
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("roadmesh")


@app.on_event("startup")
async def _startup_storage():
    await access.initialize()
    try:
        await run_in_threadpool(init_storage)
    except Exception as exc:
        logger.warning("Photo storage startup unavailable: %s", type(exc).__name__)


@app.on_event("shutdown")
async def _shutdown():
    client.close()

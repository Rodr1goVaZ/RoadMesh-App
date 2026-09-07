"""Customer-owned vehicle history and workshop-confirmed appointments."""
from datetime import datetime, timezone
from typing import Literal, Optional
from zoneinfo import ZoneInfo

from fastapi import Depends, HTTPException
from pydantic import Field
from access_control import StrictModel, identifier, now, timestamp


class AppointmentBody(StrictModel):
    vehicle_id: str
    scheduled_local: str
    description: str = Field(min_length=3, max_length=1500)
    contact: str = Field(min_length=3, max_length=150)


class AppointmentAction(StrictModel):
    action: Literal["confirm", "complete", "cancel", "suggest", "accept_suggestion"]
    scheduled_local: Optional[str] = None
    note: str = Field(default="", max_length=1000)


def scheduled_time(value):
    try:
        naive = datetime.strptime(value, "%Y-%m-%dT%H:%M")
        local = naive.replace(tzinfo=ZoneInfo("Europe/Lisbon"))
        utc = local.astimezone(timezone.utc)
        if utc.astimezone(ZoneInfo("Europe/Lisbon")).replace(tzinfo=None) != naive:
            raise ValueError("Nonexistent time")
        if local.utcoffset() != local.replace(fold=1).utcoffset():
            raise ValueError("Ambiguous time")
    except (ValueError, TypeError) as exc:
        raise HTTPException(422, "Indique uma data e hora válidas de Portugal continental (AAAA-MM-DDTHH:MM).") from exc
    if utc <= now():
        raise HTTPException(422, "Escolha uma data e hora futuras.")
    return utc.isoformat()


def register_portal_routes(api, db, access):
    def own(account, extra=None):
        return {"workshop_id": account["workshop_id"], "client_id": account["client_id"], **(extra or {})}

    async def owned_vehicle(vid, account):
        vehicle = await db.vehicles.find_one(own(account, {"id": vid}), {"_id": 0})
        if not vehicle:
            raise HTTPException(404, "Viatura não encontrada")
        return vehicle

    async def cover(vehicle):
        vehicle["cover"] = await db.photos.find_one({"workshop_id": vehicle["workshop_id"], "vehicle_id": vehicle["id"]}, {"_id": 0, "id": 1, "media_id": 1, "image_b64": 1}, sort=[("created_at", -1)])
        return vehicle

    @api.get("/portal/profile")
    async def profile(account=Depends(access.client)):
        client = await db.clients.find_one({"id": account["client_id"], "workshop_id": account["workshop_id"]}, {"_id": 0})
        workshop = await db.workshops.find_one({"id": account["workshop_id"]}, {"_id": 0, "name": 1, "email": 1, "address": 1, "logo_media_id": 1})
        return {"user": await access.public(account), "client": client, "workshop": workshop}

    @api.get("/portal/vehicles")
    async def vehicles(account=Depends(access.client)):
        docs = await db.vehicles.find(own(account), {"_id": 0}).sort("license_plate", 1).to_list(1000)
        return [await cover(vehicle) for vehicle in docs]

    @api.get("/portal/vehicles/{vid}")
    async def vehicle_detail(vid: str, account=Depends(access.client)):
        vehicle = await cover(await owned_vehicle(vid, account))
        scope = own(account, {"vehicle_id": vid})
        # Only customer-facing fields: mechanic notes/internal complaints are not disclosed.
        fields = {"_id": 0, "id": 1, "number": 1, "status": 1, "items": 1, "total": 1, "created_at": 1, "completed_at": 1, "complaint": 1, "quote_id": 1}
        orders = await db.work_orders.find(scope, fields).sort("created_at", -1).to_list(2000)
        quotes = await db.quotes.find(scope, fields).sort("created_at", -1).to_list(2000)
        converted = {order.get("quote_id") for order in orders}
        history = [{**order, "type": "service", "display_status": "concluido" if order["status"] == "concluido" else "em_reparacao"} for order in orders]
        history += [{**quote, "type": "quote", "display_status": "orcamento"} for quote in quotes if quote["id"] not in converted]
        history.sort(key=lambda item: item.get("completed_at") or item["created_at"], reverse=True)
        photo_scope = {"workshop_id": account["workshop_id"], "vehicle_id": vid}
        photos = await db.photos.find(photo_scope, {"_id": 0}).sort("created_at", -1).to_list(500)
        damages = await db.damages.find(photo_scope, {"_id": 0}).sort("created_at", -1).to_list(500)
        # Strip internal stock/product IDs from client-facing line items.
        for entry in history:
            entry["items"] = [{key: item.get(key) for key in ["item_type", "description", "quantity", "unit_price", "vat_rate"]} for item in entry.get("items", [])]
        vehicle.update({"history": history, "photos": photos, "damages": damages,
                        "total_expenses": round(sum(float(order.get("total", 0)) for order in orders if order["status"] == "concluido"), 2)})
        return vehicle

    async def appointment_doc(aid, account, is_client):
        scope = {"id": aid, "workshop_id": account["workshop_id"]}
        if is_client:
            scope["client_id"] = account["client_id"]
        doc = await db.appointments.find_one(scope, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Marcação não encontrada")
        return doc

    async def enrich(doc):
        vehicle = await db.vehicles.find_one({"id": doc["vehicle_id"], "workshop_id": doc["workshop_id"], "client_id": doc["client_id"]}, {"_id": 0, "license_plate": 1, "make": 1, "model": 1})
        client = await db.clients.find_one({"id": doc["client_id"], "workshop_id": doc["workshop_id"]}, {"_id": 0, "name": 1})
        return {**doc, "vehicle": vehicle or {}, "client_name": client["name"] if client else ""}

    async def list_appointments(account, is_client):
        scope = own(account) if is_client else {"workshop_id": account["workshop_id"]}
        docs = await db.appointments.find(scope, {"_id": 0}).sort("scheduled_at", 1).to_list(2000)
        return [await enrich(doc) for doc in docs]

    @api.get("/portal/appointments")
    async def client_appointments(account=Depends(access.client)):
        return await list_appointments(account, True)

    @api.get("/appointments")
    async def staff_appointments(account=Depends(access.workshop)):
        return await list_appointments(account, False)

    @api.post("/portal/appointments", status_code=201)
    async def create_appointment(body: AppointmentBody, account=Depends(access.client)):
        await owned_vehicle(body.vehicle_id, account)
        date = scheduled_time(body.scheduled_local)
        doc = {"id": identifier(), **own(account), **body.model_dump(), "scheduled_at": date, "timezone": "Europe/Lisbon", "status": "agendada",
               "created_at": timestamp(), "updated_at": timestamp(), "events": [{"action": "created", "at": timestamp(), "actor_id": account["id"]}]}
        await db.appointments.insert_one(doc)
        doc.pop("_id", None)
        return await enrich(doc)

    @api.put("/portal/appointments/{aid}")
    async def reschedule(aid: str, body: AppointmentBody, account=Depends(access.client)):
        doc = await appointment_doc(aid, account, True)
        if doc["status"] not in {"agendada", "confirmada"} or datetime.fromisoformat(doc["scheduled_at"]) <= now():
            raise HTTPException(409, "Só pode reagendar marcações futuras e em aberto.")
        await owned_vehicle(body.vehicle_id, account)
        update = {**body.model_dump(), "scheduled_at": scheduled_time(body.scheduled_local), "status": "agendada", "suggested_local": None, "suggested_at": None, "suggestion_note": None, "updated_at": timestamp()}
        result = await db.appointments.update_one({"id": aid, **own(account), "updated_at": doc["updated_at"]}, {"$set": update, "$push": {"events": {"action": "rescheduled", "at": timestamp(), "actor_id": account["id"]}}})
        if not result.matched_count:
            raise HTTPException(409, "A marcação foi alterada. Atualize e tente novamente.")
        return {"ok": True}

    async def action(aid, body, account, is_client):
        doc = await appointment_doc(aid, account, is_client)
        if doc["status"] in {"cancelada", "concluida"}:
            raise HTTPException(409, "Esta marcação já foi encerrada.")
        if is_client and body.action not in {"cancel", "accept_suggestion"}:
            raise HTTPException(403, "Apenas a oficina pode confirmar ou concluir marcações.")
        if is_client and datetime.fromisoformat(doc["scheduled_at"]) <= now():
            raise HTTPException(409, "Só pode alterar marcações futuras.")
        update = {"updated_at": timestamp()}
        if body.action == "cancel":
            update["status"] = "cancelada"
        elif body.action == "confirm":
            if datetime.fromisoformat(doc["scheduled_at"]) <= now():
                raise HTTPException(409, "Sugira uma nova data futura antes de confirmar.")
            update.update({"status": "confirmada", "suggested_at": None, "suggested_local": None, "suggestion_note": None})
        elif body.action == "complete":
            update["status"] = "concluida"
        elif body.action == "suggest":
            date = scheduled_time(body.scheduled_local)
            update.update({"status": "agendada", "suggested_at": date, "suggested_local": body.scheduled_local, "suggestion_note": body.note})
        elif body.action == "accept_suggestion":
            if not is_client or not doc.get("suggested_local"):
                raise HTTPException(409, "Não existe uma nova data proposta para aceitar.")
            update.update({"scheduled_at": scheduled_time(doc["suggested_local"]), "scheduled_local": doc["suggested_local"], "status": "confirmada", "suggested_at": None, "suggested_local": None, "suggestion_note": None})
        result = await db.appointments.update_one({"id": aid, "workshop_id": account["workshop_id"], "client_id": doc["client_id"], "updated_at": doc["updated_at"]}, {"$set": update, "$push": {"events": {"action": body.action, "at": timestamp(), "actor_id": account["id"]}}})
        if not result.matched_count:
            raise HTTPException(409, "A marcação foi alterada. Atualize e tente novamente.")
        return {"ok": True}

    @api.post("/portal/appointments/{aid}/action")
    async def client_action(aid: str, body: AppointmentAction, account=Depends(access.client)):
        return await action(aid, body, account, True)

    @api.post("/appointments/{aid}/action")
    async def staff_action(aid: str, body: AppointmentAction, account=Depends(access.workshop)):
        return await action(aid, body, account, False)
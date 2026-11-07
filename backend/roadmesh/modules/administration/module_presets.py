"""Platform-wide editable selection presets, with optimistic concurrency."""
from typing import Literal

from fastapi import Depends, HTTPException
from pydantic import Field, field_validator
from pymongo import ReturnDocument

from roadmesh.core.access_control import StrictModel, identifier, timestamp
from roadmesh.core.module_catalog import FEATURE_IDS, FEATURES

FeatureId = Literal["customer_database", "inventory", "service_orders", "vehicle_reception", "customer_notifications"]


class PresetBody(StrictModel):
    name: str = Field(min_length=2, max_length=60)
    enabled_modules: list[FeatureId] = Field(max_length=5)
    revision: int = Field(ge=0)

    @field_validator("enabled_modules")
    @classmethod
    def unique_modules(cls, value):
        if len(value) != len(set(value)):
            raise ValueError("Escolha cada módulo apenas uma vez.")
        return [key for key in FEATURE_IDS if key in value]


async def initialize_presets(db):
    if getattr(db, "is_postgres", False) is not True:
        await db.module_presets.create_index("id", unique=True)
    defaults = [
        ("c7bca442-81db-44f5-9834-17820df5e101", "Oficina", list(FEATURE_IDS)),
        ("c7bca442-81db-44f5-9834-17820df5e102", "Stand", ["customer_database", "vehicle_reception", "customer_notifications"]),
        ("c7bca442-81db-44f5-9834-17820df5e103", "Detailer", ["customer_database", "service_orders", "vehicle_reception", "customer_notifications"]),
    ]
    for key, name, modules in defaults:
        await db.module_presets.update_one({"id": key}, {"$setOnInsert": {
            "id": key, "name": name, "enabled_modules": modules, "revision": 1, "updated_at": timestamp(),
        }}, upsert=True)
        # Upgrade only untouched defaults from the first local catalogue draft.
        await db.module_presets.update_one({"id": key, "revision": 1, "seed_version": {"$exists": False}}, {"$set": {"enabled_modules": modules, "seed_version": 1}})


def register_preset_routes(api, db, access):
    admin = Depends(access.admin)

    @api.get("/admin/module-catalog")
    async def catalog(account=admin):
        return {"modules": FEATURES, "presets": await db.module_presets.find({}, {"_id": 0}).sort("name", 1).to_list(100)}

    @api.post("/admin/module-presets", status_code=201)
    async def create_preset(body: PresetBody, account=admin):
        doc = {**body.model_dump(), "id": identifier(), "revision": 1, "updated_at": timestamp(), "updated_by": account["id"]}
        await db.module_presets.insert_one(doc)
        doc.pop("_id", None)
        await access.audit(account, "module_preset.created", resource=doc["id"], details={"after": doc})
        return doc

    @api.put("/admin/module-presets/{pid}")
    async def edit_preset(pid: str, body: PresetBody, account=admin):
        doc = await db.module_presets.find_one_and_update({"id": pid, "revision": body.revision},
            {"$set": {"name": body.name, "enabled_modules": body.enabled_modules, "updated_at": timestamp(), "updated_by": account["id"]}, "$inc": {"revision": 1}},
            projection={"_id": 0}, return_document=ReturnDocument.AFTER)
        if not doc:
            raise HTTPException(409, "Este preset foi alterado. Atualize a lista antes de guardar.")
        await access.audit(account, "module_preset.updated", resource=pid, details={"after": doc})
        return doc

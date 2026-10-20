"""Transaction boundaries, persistent uniqueness and service-level revenue."""

from fastapi import HTTPException
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError, OperationFailure
from pymongo.read_concern import ReadConcern
from pymongo.read_preferences import ReadPreference
from pymongo.write_concern import WriteConcern


async def transact(db, operation):
    """Retry the complete database-only callback on transient write conflicts.

    Callbacks must pass this session to every DB operation and must not perform
    external IO: Motor may run them again after a conflicting request commits.
    """
    try:
        async with await db.client.start_session() as session:
            return await session.with_transaction(
                operation,
                read_concern=ReadConcern("snapshot"),
                write_concern=WriteConcern("majority"),
                read_preference=ReadPreference.PRIMARY,
            )
    except DuplicateKeyError as exc:
        raise HTTPException(409, "Já existe um documento ou registo para esta operação. Atualize os dados.") from exc
    except OperationFailure as exc:
        if exc.code == 20:
            raise HTTPException(503, "Esta operação requer MongoDB com replica set ou Atlas.") from exc
        raise


async def initialize_integrity(db):
    hello = await db.client.admin.command("hello")
    if not hello.get("setName") and hello.get("msg") != "isdbgrid":
        raise RuntimeError(
            "RoadMesh requires MongoDB Atlas or a replica set for atomic stock/document operations. See README.md."
        )
    collections = (
        "clients",
        "vehicles",
        "products",
        "work_orders",
        "quotes",
        "invoices",
        "purchase_orders",
        "photos",
        "damages",
        "appointments",
        "media",
        "counters",
    )
    try:
        for name in collections:
            await db[name].create_index("id", unique=True)
        await db.counters.create_index("id", unique=True)
        await db.work_orders.create_index(
            [("workshop_id", ASCENDING), ("quote_id", ASCENDING)],
            unique=True,
            partialFilterExpression={"quote_id": {"$type": "string"}},
        )
        await db.invoices.create_index(
            [("workshop_id", ASCENDING), ("work_order_id", ASCENDING), ("document_type", ASCENDING)],
            unique=True,
        )
        for collection, field in (("work_orders", "number"), ("quotes", "number"), ("invoices", "document_number")):
            await db[collection].create_index([("workshop_id", ASCENDING), (field, ASCENDING)], unique=True)
        for collection, field in (("login_limits", "key"), ("revoked_sessions", "jti")):
            await db[collection].create_index(field, unique=True)
        for name in ("work_orders", "quotes", "invoices", "photos", "damages", "stock_movements", "purchase_orders"):
            await db[name].create_index([("workshop_id", ASCENDING), ("created_at", -1)])
        for name in ("work_orders", "quotes", "photos", "damages"):
            await db[name].create_index([("workshop_id", ASCENDING), ("vehicle_id", ASCENDING)])
    except OperationFailure as exc:
        raise RuntimeError(
            "Cannot create RoadMesh integrity indexes. Check existing duplicate records/index options before restarting; no records were deleted."
        ) from exc
    # Keep conversion history even when the resulting work order is later deleted.
    async for order in db.work_orders.find(
        {"quote_id": {"$type": "string"}}, {"_id": 0, "id": 1, "quote_id": 1, "workshop_id": 1}
    ):
        await db.quotes.update_one(
            {
                "id": order["quote_id"],
                "workshop_id": order["workshop_id"],
                "converted_work_order_id": {"$exists": False},
            },
            {"$set": {"converted_work_order_id": order["id"]}},
        )


def revenue_pipeline(scope, since=None):
    """Count a service once when FT and FR both exist; date = first issuance."""
    pipeline = [
        {"$match": {**scope, "document_type": {"$in": ["fatura", "fatura_recibo"]}}},
        {
            "$group": {
                "_id": {"workshop_id": "$workshop_id", "service": {"$ifNull": ["$work_order_id", "$id"]}},
                "amount": {"$max": "$grand_total"},
                "first_issued": {"$min": "$created_at"},
            }
        },
    ]
    if since:
        pipeline.append({"$match": {"first_issued": {"$gte": since}}})
    return [*pipeline, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}, {"$project": {"_id": 0, "total": 1}}]

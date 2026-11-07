"""Independent capabilities; presets never authorize access or change contracts."""
from decimal import Decimal

from fastapi import HTTPException

FEATURES = (
    {"id": "customer_database", "name": "Base de dados", "description": "Gestão das fichas de clientes e viaturas.", "default_price": "0.00"},
    {"id": "inventory", "name": "Gestão de stocks", "description": "Produtos, fornecedores, encomendas e movimentos de stock.", "default_price": "0.00"},
    {"id": "service_orders", "name": "Ordens de serviço", "description": "Serviços, orçamentos e documentos de trabalho.", "default_price": "0.00"},
    {"id": "vehicle_reception", "name": "Receção de veículos", "description": "Fotografias e registo de danos à entrada da viatura.", "default_price": "0.00"},
    {"id": "customer_notifications", "name": "Notificações aos clientes", "description": "Marcações, acompanhamento e comunicações com os clientes.", "default_price": "0.00"},
)
FEATURE_IDS = tuple(item["id"] for item in FEATURES)


def is_modular(company):
    return bool(company and company.get("subscription_version") == 1)


def enabled_features(company):
    if not company:
        return []
    if not is_modular(company):
        return list(FEATURE_IDS) if "workshop" in company.get("modules", ["workshop"]) else []
    value = company.get("enabled_modules", [])
    return [key for key in FEATURE_IDS if key in value] if isinstance(value, list) else []


def public_configuration(company):
    return {"subscription_version": company.get("subscription_version") if company else None,
            "enabled_modules": enabled_features(company)}


def subscription_total(base, modules, prices):
    total = Decimal(str(base)) + sum((Decimal(str(prices[key])) for key in modules), Decimal(0))
    if not total.is_finite() or total > Decimal("999999999.99"):
        raise ValueError("O total mensal excede o valor permitido.")
    return total.quantize(Decimal("0.01"))


def feature_for_path(path):
    parts = path.removeprefix("/api/").strip("/").split("/")
    resource = parts[0]
    if resource == "portal":
        resource = parts[1] if len(parts) > 1 else ""
    if resource == "staff" and len(parts) > 1:
        resource = parts[1]
    if resource == "history" and len(parts) > 1:
        return "inventory" if parts[1] in {"stock", "receipts", "orders"} else "vehicle_reception" if parts[1] in {"photos", "damages"} else "service_orders"
    if resource in {"products", "purchase-orders", "suppliers", "reorder-needs"}:
        return "inventory"
    if resource in {"appointments", "notifications"}:
        return "customer_notifications"
    if resource in {"photos", "damages"}:
        return "vehicle_reception"
    if resource in {"work-orders", "quotes", "invoices", "finance", "history", "history-years"}:
        return "service_orders"
    if resource in {"clients", "vehicles"}:
        return "customer_database"
    return None


def guard_feature(company, path, method="GET"):
    required = feature_for_path(path)
    # Other independent workflows can read reference clients/vehicles, without
    # granting the database module's creation, editing or deletion operations.
    if required == "customer_database" and method == "GET" and any(key in enabled_features(company) for key in ("service_orders", "vehicle_reception", "customer_notifications")):
        return
    if is_modular(company) and required and required not in enabled_features(company):
        raise HTTPException(403, "Este módulo não está ativo para a empresa.")

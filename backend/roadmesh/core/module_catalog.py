"""Independent capabilities; presets never authorize access or change contracts."""
from decimal import Decimal

from fastapi import HTTPException

FEATURES = (
    {'id': 'customer_database', 'name': 'Base de dados', 'description': 'Fichas de clientes e viaturas.', 'default_price': '0.00'},
    {'id': 'vehicle_reception', 'name': 'Receção de veículos', 'description': 'Entradas, fotografias, danos e relatórios.', 'default_price': '0.00'},
    {'id': 'quotes', 'name': 'Orçamentos', 'description': 'Propostas, estados de aprovação e conversão em serviço.', 'default_price': '0.00'},
    {'id': 'service_orders', 'name': 'Ordens de serviço', 'description': 'Trabalhos, materiais e quadro de execução.', 'default_price': '0.00'},
    {'id': 'inventory', 'name': 'Stocks e encomendas', 'description': 'Produtos, fornecedores e movimentos.', 'default_price': '0.00'},
    {'id': 'appointments', 'name': 'Agenda e capacidade', 'description': 'Pedidos de marcação e acompanhamento.', 'default_price': '0.00'},
    {'id': 'digital_inspections', 'name': 'Inspeção e diagnóstico', 'description': 'Registos de inspeção e recomendações.', 'default_price': '0.00'},
    {'id': 'technician_time', 'name': 'Equipa técnica e tempos', 'description': 'Trabalhos e registo de tempos.', 'default_price': '0.00'},
    {'id': 'customer_notifications', 'name': 'Comunicações', 'description': 'Modelos, mensagens e acompanhamento de envios.', 'default_price': '0.00'},
    {'id': 'online_bookings', 'name': 'Reservas online', 'description': 'Registo e confirmação de pedidos de reserva.', 'default_price': '0.00'},
    {'id': 'payments', 'name': 'Pagamentos e conta corrente', 'description': 'Cobranças, movimentos e saldos.', 'default_price': '0.00'},
    {'id': 'invoicing', 'name': 'Integração com faturação', 'description': 'Configuração e acompanhamento de faturação externa.', 'default_price': '0.00'},
    {'id': 'reports', 'name': 'Relatórios', 'description': 'Contagens dos módulos ativos.', 'default_price': '0.00'},
    {'id': 'technical_data', 'name': 'Dados técnicos', 'description': 'Referências técnicas e configuração de fornecedores.', 'default_price': '0.00'},
    {'id': 'marketing', 'name': 'Marketing e satisfação', 'description': 'Preparação de campanhas e segmentos.', 'default_price': '0.00'},
    {'id': 'multi_location', 'name': 'Multi-localização', 'description': 'Registo de unidades e responsáveis.', 'default_price': '0.00'},
)
FEATURE_IDS = tuple(item["id"] for item in FEATURES)


def is_modular(company):
    return bool(company and company.get("subscription_version") == 1)


def enabled_features(company):
    if not company:
        return []
    if not is_modular(company):
        return ["customer_database", "inventory", "service_orders", "vehicle_reception", "customer_notifications", "quotes", "appointments", "payments", "reports", "invoicing"] if "workshop" in company.get("modules", ["workshop"]) else []
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
    if resource == "workspace" and len(parts) > 1:
        return parts[1] if parts[1] in FEATURE_IDS else None
    if resource == "portal":
        resource = parts[1] if len(parts) > 1 else ""
    if resource == "staff" and len(parts) > 1:
        resource = parts[1]
    if resource == "history" and len(parts) > 1:
        return "inventory" if parts[1] in {"stock", "receipts", "orders"} else "vehicle_reception" if parts[1] in {"photos", "damages"} else "quotes" if parts[1] == "quotes" else "invoicing" if parts[1] == "invoices" else "payments" if parts[1] == "payments" else "service_orders"
    if resource in {"products", "purchase-orders", "suppliers", "reorder-needs"}:
        return "inventory"
    if resource == "appointments":
        return "appointments"
    if resource == "notifications":
        return "customer_notifications"
    if resource == "quotes":
        return "quotes"
    if resource == "invoices":
        if len(parts) > 2 and parts[2] in {"balance", "movements", "reconcile"}:
            return "payments"
        return "invoicing"
    if resource == "finance":
        return "payments"
    if resource in {"photos", "damages"}:
        return "vehicle_reception"
    if resource in {"work-orders", "quotes", "invoices", "finance", "history", "history-years"}:
        return "service_orders"
    if resource in {"clients", "vehicles"}:
        return "customer_database"
    return None


def guard_feature(company, path, method="GET"):
    required = feature_for_path(path)
    if required == "invoicing" and method == "GET" and path.rstrip("/") in {"/api/invoices", "/invoices"} and "payments" in enabled_features(company):
        return  # Payment entry needs document references, not permission to issue.
    # Other independent workflows can read reference clients/vehicles, without
    # granting the database module's creation, editing or deletion operations.
    if required == "customer_database" and method == "GET" and any(key in enabled_features(company) for key in ("service_orders", "vehicle_reception", "quotes", "appointments", "digital_inspections", "online_bookings", "customer_notifications")):
        return
    if (is_modular(company) or path.startswith("/api/workspace/")) and required and required not in enabled_features(company):
        raise HTTPException(403, "Este módulo não está ativo para a empresa.")

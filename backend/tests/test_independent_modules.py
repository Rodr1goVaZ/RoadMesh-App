"""Independent capabilities, persistent presets and prospective negotiated prices."""
from itertools import combinations
from decimal import Decimal
from uuid import uuid4

import pytest
import requests

from conftest import API, checked

MODULES = ("customer_database", "inventory", "service_orders", "vehicle_reception", "customer_notifications")
PRICES = dict(zip(MODULES, ("10.10", "20.20", "30.30", "40.40", "50.50")))
CONFIGURATIONS = [list(combo) for count in range(6) for combo in combinations(MODULES, count)]


@pytest.fixture(scope="module")
def company(workshop_factory):
    return workshop_factory("TEST_Independent_Modules")


def configure(admin, company, modules, **extra):
    body = {"name": "TEST_Independent_Modules", "manager_name": "Test Manager", "manager_email": company["email"],
            "subscription_version": 1, "enabled_modules": modules, "base_monthly_fee": "100.00", "module_prices": PRICES,
            **extra}
    return admin.put(API + f"/admin/workshops/{company['user']['workshop_id']}", json=body)


@pytest.mark.parametrize("modules", CONFIGURATIONS, ids=lambda value: "+".join(value) or "none")
def test_every_combination_authorizes_only_its_independent_capabilities(platform_session, company, modules):
    checked(configure(platform_session, company, modules))
    staff = company["session"]
    me = checked(staff.get(API + "/auth/me"))
    assert set(me["enabled_modules"]) == set(modules)
    dashboard = checked(staff.get(API + "/dashboard"))
    assert set(dashboard["module_summary"]) == set(modules)
    for key, path in (("inventory", "/products"), ("service_orders", "/work-orders"), ("vehicle_reception", "/photos"), ("customer_notifications", "/appointments")):
        assert staff.get(API + path).status_code == (200 if key in modules else 403)
    references = any(key in modules for key in ("customer_database", "service_orders", "vehicle_reception", "customer_notifications"))
    assert staff.get(API + "/vehicles").status_code == (200 if references else 403)
    assert staff.post(API + "/clients", json={"name": "New client " + uuid4().hex}).status_code == (201 if "customer_database" in modules else 403)
    detail = checked(platform_session.get(API + f"/admin/workshops/{me['workshop_id']}"))
    expected = Decimal("100.00") + sum((Decimal(PRICES[key]) for key in modules), Decimal(0))
    assert Decimal(detail["monthly_fee"]) == expected


def test_disabled_features_do_not_leak_through_reference_details(platform_session, company):
    checked(configure(platform_session, company, ["customer_database"]))
    staff = company["session"]
    vehicle = checked(staff.get(API + "/vehicles"))[0]
    data = checked(staff.get(API + f"/vehicles/{vehicle['id']}"))
    assert data["photos"] == data["damages"] == data["work_orders"] == []
    client = checked(staff.get(API + f"/clients/{vehicle['client_id']}"))
    assert client["work_orders"] == []
    # Turning a module off preserves the existing records for later reactivation.
    checked(configure(platform_session, company, ["service_orders"]))
    assert len(checked(staff.get(API + "/work-orders"))) == 4


def test_modular_creation_uses_the_same_price_calculation(platform_session):
    created = checked(platform_session.post(API + "/admin/workshops", json={
        "name": "TEST_Modular_Create", "manager_name": "Manager", "manager_email": f"{uuid4().hex}@test.pt",
        "subscription_version": 1, "enabled_modules": ["inventory"], "module_prices": PRICES,
        "base_monthly_fee": "100.00", "monthly_fee": "0.00",
    }), 201)["workshop"]
    assert Decimal(created["monthly_fee"]) == Decimal("120.20")


def test_portal_permissions_refresh_without_a_new_login(platform_session, company):
    checked(configure(platform_session, company, list(MODULES)))
    staff = company["session"]
    order = checked(staff.get(API + "/work-orders"))[0]
    credentials = checked(staff.post(API + f"/clients/{order['client_id']}/account", json={"name": "Module Client", "email": f"{uuid4().hex}@test.pt"}), 201)["credentials"]
    client = requests.Session()
    auth = checked(client.post(API + "/auth/login", json={"email": credentials["email"], "password": credentials["temporary_password"]}))
    client.headers["Authorization"] = "Bearer " + auth["access_token"]
    auth = checked(client.post(API + "/auth/change-password", json={"current_password": credentials["temporary_password"], "new_password": "Module-client-test-2026!"}))
    client.headers["Authorization"] = "Bearer " + auth["access_token"]
    assert checked(client.get(API + f"/portal/vehicles/{order['vehicle_id']}"))["history"]
    checked(configure(platform_session, company, ["customer_database"]))
    detail = checked(client.get(API + f"/portal/vehicles/{order['vehicle_id']}"))
    assert detail["history"] == detail["photos"] == detail["damages"] == []
    assert detail["cover"] is None
    assert client.get(API + "/portal/appointments").status_code == 403
    checked(configure(platform_session, company, ["customer_notifications"]))
    assert client.get(API + "/portal/appointments").status_code == 200
    assert checked(client.get(API + "/auth/me"))["enabled_modules"] == ["customer_notifications"]
    assert client.get(API + "/portal/profile").status_code == 200


def test_service_orders_do_not_enable_stock_product_use(platform_session, company):
    checked(configure(platform_session, company, list(MODULES)))
    staff = company["session"]
    vehicle = checked(staff.get(API + "/vehicles"))[0]
    product = checked(staff.get(API + "/products"))[0]
    checked(configure(platform_session, company, ["service_orders"]))
    body = {"client_id": vehicle["client_id"], "vehicle_id": vehicle["id"], "items": [{"item_type": "peca", "description": "Stock product", "product_id": product["id"], "quantity": 1, "unit_price": 10}]}
    assert staff.post(API + "/work-orders", json=body).status_code == 403


def test_presets_are_editable_admin_only_and_never_rewrite_contracts(platform_session, company):
    checked(configure(platform_session, company, ["inventory"]))
    wid = company["user"]["workshop_id"]
    before = checked(platform_session.get(API + f"/admin/workshops/{wid}"))
    catalog = checked(platform_session.get(API + "/admin/module-catalog"))
    assert {item["id"] for item in catalog["modules"]} == set(MODULES)
    assert company["session"].get(API + "/admin/module-catalog").status_code == 403
    preset = checked(platform_session.post(API + "/admin/module-presets", json={"name": "Preset de teste", "enabled_modules": ["inventory"], "revision": 0}), 201)
    body = {"name": "Nome novo", "enabled_modules": ["service_orders", "vehicle_reception"], "revision": preset["revision"]}
    edited = checked(platform_session.put(API + f"/admin/module-presets/{preset['id']}", json=body))
    assert edited["name"] == "Nome novo"
    assert set(edited["enabled_modules"]) == {"service_orders", "vehicle_reception"}
    assert platform_session.put(API + f"/admin/module-presets/{preset['id']}", json=body).status_code == 409
    after = checked(platform_session.get(API + f"/admin/workshops/{wid}"))
    assert after == before
    assert company["session"].put(API + f"/admin/module-presets/{preset['id']}", json=body).status_code == 403


@pytest.mark.parametrize("extra", [
    {"enabled_modules": ["inventory", "inventory"]}, {"enabled_modules": ["stand"]},
    {"module_prices": {"inventory": "-0.01"}}, {"module_prices": {"inventory": "NaN"}},
    {"module_prices": {"inventory": "1.001"}}, {"base_monthly_fee": "-10"},
    {"base_monthly_fee": "999999999.99"}, {"module_prices": {}},
])
def test_invalid_prices_and_unknown_modules_are_rejected(platform_session, company, extra):
    assert configure(platform_session, company, ["inventory"], **extra).status_code == 422


def test_total_is_computed_server_side_and_past_periods_never_change(platform_session, company):
    wid = company["user"]["workshop_id"]
    month = {"billed": "75.00", "received": "0", "hours_included": "2", "hours_used": "0", "due_date": None, "note": "Registo histórico de teste"}
    checked(platform_session.put(API + f"/admin/workshops/{wid}/service-months/2025/1", json=month))
    previous = checked(platform_session.get(API + f"/admin/workshops/{wid}"))["platform_service_months"]
    checked(configure(platform_session, company, ["inventory", "vehicle_reception"], monthly_fee="0.00", base_monthly_fee="0.10"))
    updated = checked(platform_session.get(API + f"/admin/workshops/{wid}"))
    assert Decimal(updated["monthly_fee"]) == Decimal("60.70")
    assert updated["platform_service_months"] == previous
    # Old clients cannot accidentally replace a modular contract with a legacy plan.
    invalid = platform_session.put(API + f"/admin/workshops/{wid}", json={"name": updated["name"], "manager_name": "Unexpected manager change", "manager_email": company["email"], "modules": ["stand"]})
    assert invalid.status_code == 422
    downgraded = platform_session.put(API + f"/admin/workshops/{wid}", json={"name": updated["name"], "manager_name": "Unexpected manager change", "manager_email": company["email"], "subscription_version": None})
    assert downgraded.status_code == 422
    after = checked(platform_session.get(API + f"/admin/workshops/{wid}"))
    assert after["manager_name"] == updated["manager_name"]

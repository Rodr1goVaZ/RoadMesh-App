"""Regression coverage for transaction rollback, concurrency, roles and sessions."""

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import jwt
import pytest
import requests
from pymongo import MongoClient

from conftest import API, PASSWORD, checked


@pytest.fixture(scope="module")
def workshop(workshop_factory):
    return workshop_factory("TEST_Integrity")


def product(session, stock=10):
    return checked(
        session.post(f"{API}/products", json={"reference": "INTEGRITY", "name": "Integrity part", "stock": stock}), 201
    )


def order_payload(session, items=None, status="entrada"):
    vehicle = session.get(f"{API}/vehicles").json()[0]
    return {
        "client_id": vehicle["client_id"],
        "vehicle_id": vehicle["id"],
        "status": status,
        "items": items or [{"item_type": "mao_de_obra", "description": "Service", "quantity": 1, "unit_price": 10}],
    }


def part(pid, quantity):
    return {"item_type": "peca", "description": "Part", "quantity": quantity, "unit_price": 10, "product_id": pid}


def parallel(session, method, path, payload=None, count=2):
    headers = dict(session.headers)

    def send(_):
        return requests.request(method, f"{API}{path}", headers=headers, json=payload, timeout=45)

    with ThreadPoolExecutor(max_workers=count) as pool:
        return list(pool.map(send, range(count)))


def test_failed_creation_rolls_back_order_stock_and_movements(workshop):
    s = workshop["session"]
    first, empty = product(s, 10), product(s, 0)
    payload = order_payload(s, [part(first["id"], 2), part(empty["id"], 1)])
    before = s.get(f"{API}/work-orders").json()
    rejected = s.post(f"{API}/work-orders", json=payload)
    assert rejected.status_code == 409, rejected.text
    current = s.get(f"{API}/products/{first['id']}").json()
    assert current["stock"] == 10
    assert not any(m.get("work_order_id") for m in current["movements"])
    assert len(s.get(f"{API}/work-orders").json()) == len(before)


def test_concurrent_edits_apply_only_actual_stock_difference(workshop):
    s = workshop["session"]
    p = product(s, 10)
    payload = order_payload(s, [part(p["id"], 2)])
    wo = checked(s.post(f"{API}/work-orders", json=payload), 201)
    payload["items"] = [part(p["id"], 3)]
    results = parallel(s, "PUT", f"/work-orders/{wo['id']}", payload)
    assert [r.status_code for r in results] == [200, 200], [r.text for r in results]
    assert s.get(f"{API}/products/{p['id']}").json()["stock"] == 7


def test_failed_edit_keeps_original_order_and_stock(workshop):
    s = workshop["session"]
    p = product(s, 5)
    payload = order_payload(s, [part(p["id"], 2)])
    wo = checked(s.post(f"{API}/work-orders", json=payload), 201)
    payload["items"] = [part(p["id"], 10)]
    response = s.put(f"{API}/work-orders/{wo['id']}", json=payload)
    assert response.status_code == 409
    assert s.get(f"{API}/work-orders/{wo['id']}").json()["items"][0]["quantity"] == 2
    assert s.get(f"{API}/products/{p['id']}").json()["stock"] == 3


def test_concurrent_deletion_restores_stock_once(workshop):
    s = workshop["session"]
    p = product(s)
    wo = checked(s.post(f"{API}/work-orders", json=order_payload(s, [part(p["id"], 2)])), 201)
    results = parallel(s, "DELETE", f"/work-orders/{wo['id']}")
    assert sorted(r.status_code for r in results) == [200, 404]
    assert s.get(f"{API}/products/{p['id']}").json()["stock"] == 10


def test_concurrent_purchase_receipt_adds_stock_once(workshop):
    s = workshop["session"]
    p = product(s)
    po = checked(
        s.post(
            f"{API}/purchase-orders",
            json={"supplier": "Test", "items": [{"product_id": p["id"], "quantity": 3, "unit_price": 10}]},
        ),
        201,
    )
    results = parallel(s, "POST", f"/purchase-orders/{po['id']}/receive")
    assert all(r.status_code == 200 for r in results), [r.text for r in results]
    current = s.get(f"{API}/products/{p['id']}").json()
    assert current["stock"] == 13
    assert len([m for m in current["movements"] if m.get("purchase_order_id") == po["id"]]) == 1


def test_concurrent_quote_conversion_and_deleted_order_cannot_reconvert(workshop):
    s = workshop["session"]
    p = product(s)
    payload = order_payload(s, [part(p["id"], 2)])
    payload.pop("status")
    quote = checked(s.post(f"{API}/quotes", json=payload), 201)
    checked(s.post(f"{API}/quotes/{quote['id']}/status", json={"status": "aceite"}))
    results = parallel(s, "POST", f"/quotes/{quote['id']}/convert")
    assert sorted(r.status_code for r in results) == [200, 409], [r.text for r in results]
    wo = next(r.json() for r in results if r.status_code == 200)
    assert s.get(f"{API}/products/{p['id']}").json()["stock"] == 8
    checked(s.delete(f"{API}/work-orders/{wo['id']}"))
    assert s.post(f"{API}/quotes/{quote['id']}/convert").status_code == 409
    assert s.get(f"{API}/products/{p['id']}").json()["stock"] == 10


def test_concurrent_invoice_creation_and_revenue_not_doubled(workshop):
    s = workshop["session"]
    wo = checked(s.post(f"{API}/work-orders", json=order_payload(s, status="concluido")), 201)
    before = s.get(f"{API}/dashboard").json()["kpis"]["faturacao"]
    results = parallel(s, "POST", "/invoices", {"work_order_id": wo["id"], "document_type": "fatura"})
    assert sorted(r.status_code for r in results) == [201, 409], [r.text for r in results]
    checked(s.post(f"{API}/invoices", json={"work_order_id": wo["id"], "document_type": "fatura_recibo"}), 201)
    assert s.get(f"{API}/dashboard").json()["kpis"]["faturacao"] == round(before + wo["total"], 2)
    assert s.delete(f"{API}/work-orders/{wo['id']}").status_code == 409


def test_numbering_is_unique_under_parallel_requests(workshop):
    s = workshop["session"]
    results = parallel(s, "POST", "/work-orders", order_payload(s), count=8)
    assert all(r.status_code == 201 for r in results), [r.text for r in results]
    assert len({r.json()["number"] for r in results}) == 8


def test_manual_and_opening_stock_have_audit_movements(workshop):
    s = workshop["session"]
    p = product(s, 2.5)
    checked(s.put(f"{API}/products/{p['id']}", json={"reference": p["reference"], "name": p["name"], "stock": 4.5}))
    current = s.get(f"{API}/products/{p['id']}").json()
    assert current["stock"] == 4.5
    assert sum(m["delta"] for m in current["movements"]) == 4.5


def test_invalid_product_and_empty_purchase_order_rejected(workshop):
    s = workshop["session"]
    for field in ["stock", "min_stock", "purchase_price", "sale_price", "vat_rate"]:
        assert s.post(f"{API}/products", json={"reference": "bad", "name": "bad", field: -1}).status_code == 422
    assert s.post(f"{API}/purchase-orders", json={"supplier": "Test", "items": []}).status_code == 422


def test_vehicle_with_history_cannot_be_deleted_or_transferred(workshop):
    s = workshop["session"]
    payload = order_payload(s)
    checked(s.post(f"{API}/work-orders", json=payload), 201)
    assert s.delete(f"{API}/vehicles/{payload['vehicle_id']}").status_code == 409
    client = checked(s.post(f"{API}/clients", json={"name": "Another owner"}), 201)
    assert (
        s.put(
            f"{API}/vehicles/{payload['vehicle_id']}",
            json={"client_id": client["id"], "license_plate": "AA-12-BB", "make": "Test", "model": "Car"},
        ).status_code
        == 409
    )


def test_completed_date_cleared_when_reopened(workshop):
    s = workshop["session"]
    payload = order_payload(s, status="concluido")
    wo = checked(s.post(f"{API}/work-orders", json=payload), 201)
    assert wo["completed_at"]
    payload["status"] = "entrada"
    checked(s.put(f"{API}/work-orders/{wo['id']}", json=payload))
    assert s.get(f"{API}/work-orders/{wo['id']}").json()["completed_at"] is None


def test_search_and_pagination_are_applied_before_enrichment(workshop):
    s = workshop["session"]
    orders = checked(s.get(f"{API}/work-orders", params={"limit": 2}))
    assert len(orders) == 2
    assert all(o["client_name"] and o["license_plate"] for o in orders)
    assert s.get(f"{API}/work-orders", params={"skip": -1}).status_code == 422
    assert s.get(f"{API}/work-orders", params={"limit": 0}).status_code == 422
    found = checked(s.get(f"{API}/work-orders", params={"search": orders[0]["number"]}))
    assert orders[0]["id"] in {o["id"] for o in found}


def test_refresh_preserves_session_limit_and_logout_revokes_all_rotations(workshop_factory):
    w = workshop_factory("TEST_Sessions")
    s = w["session"]
    old = w["token"]
    new = checked(s.post(f"{API}/auth/refresh"))["access_token"]
    a, b = [jwt.decode(t, options={"verify_signature": False}) for t in [old, new]]
    assert a["sid"] == b["sid"] and a["session_exp"] == b["session_exp"]
    assert a["jti"] != b["jti"]
    assert b["exp"] <= b["session_exp"]
    checked(s.post(f"{API}/auth/logout"))
    for token in [old, new]:
        assert requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_client_portal_excludes_internal_fields_and_enforces_roles(workshop):
    s = workshop["session"]
    payload = order_payload(s)
    payload.update(complaint="PRIVATE COMPLAINT", notes="PRIVATE NOTES", mechanic="PRIVATE MECHANIC")
    checked(s.post(f"{API}/work-orders", json=payload), 201)
    creds = checked(
        s.post(
            f"{API}/clients/{payload['client_id']}/account",
            json={"name": "Portal Client", "email": f"portal-{payload['client_id']}@test.pt"},
        ),
        201,
    )["credentials"]
    client = requests.Session()
    auth = checked(
        client.post(f"{API}/auth/client/login", json={"email": creds["email"], "password": creds["temporary_password"]})
    )
    client.headers["Authorization"] = f"Bearer {auth['access_token']}"
    assert client.get(f"{API}/portal/vehicles").status_code == 428
    changed = checked(
        client.post(
            f"{API}/auth/change-password",
            json={"current_password": creds["temporary_password"], "new_password": PASSWORD},
        )
    )
    client.headers["Authorization"] = f"Bearer {changed['access_token']}"
    detail = checked(client.get(f"{API}/portal/vehicles/{payload['vehicle_id']}"))
    assert "PRIVATE" not in str(detail)
    assert client.get(f"{API}/work-orders").status_code == 403
    assert client.get(f"{API}/admin/dashboard").status_code == 403
    assert s.get(f"{API}/admin/dashboard").status_code == 403


@pytest.fixture
def isolated_database():
    url, name = os.environ.get("ROADMESH_TEST_MONGO_URL"), os.environ.get("ROADMESH_TEST_DB_NAME", "")
    if not url or not name.startswith("roadmesh_test_"):
        pytest.skip("Fault injection requires explicit ROADMESH_TEST_MONGO_URL and a roadmesh_test_ database")
    client = MongoClient(url)
    yield client[name]
    client.close()


def test_failed_receipt_rolls_back_status_and_all_products(workshop, isolated_database):
    s = workshop["session"]
    first, missing = product(s), product(s)
    po = checked(
        s.post(
            f"{API}/purchase-orders",
            json={
                "supplier": "Test",
                "items": [{"product_id": p["id"], "quantity": 3, "unit_price": 10} for p in [first, missing]],
            },
        ),
        201,
    )
    saved = isolated_database.products.find_one({"id": missing["id"]})
    isolated_database.products.delete_one({"_id": saved["_id"]})
    try:
        response = s.post(f"{API}/purchase-orders/{po['id']}/receive")
        assert response.status_code == 404, response.text
        assert s.get(f"{API}/products/{first['id']}").json()["stock"] == 10
        assert isolated_database.purchase_orders.find_one({"id": po["id"]})["status"] == "pendente"
        assert isolated_database.stock_movements.count_documents({"purchase_order_id": po["id"]}) == 0
    finally:
        isolated_database.products.insert_one(saved)
    checked(s.post(f"{API}/purchase-orders/{po['id']}/receive"))
    assert s.get(f"{API}/products/{first['id']}").json()["stock"] == 13


def test_later_receipt_document_does_not_repeat_previous_month_revenue(workshop, isolated_database):
    s = workshop["session"]
    wo = checked(s.post(f"{API}/work-orders", json=order_payload(s, status="concluido")), 201)
    before = s.get(f"{API}/dashboard").json()["kpis"]["faturacao"]
    invoice = checked(s.post(f"{API}/invoices", json={"work_order_id": wo["id"], "document_type": "fatura"}), 201)
    previous = (datetime.now(timezone.utc).replace(day=1) - timedelta(days=1)).isoformat()
    isolated_database.invoices.update_one({"id": invoice["id"]}, {"$set": {"created_at": previous}})
    checked(s.post(f"{API}/invoices", json={"work_order_id": wo["id"], "document_type": "fatura_recibo"}), 201)
    assert s.get(f"{API}/dashboard").json()["kpis"]["faturacao"] == before


def test_concurrent_consumption_cannot_make_stock_negative(workshop):
    s = workshop['session']; p = product(s, 1)
    results = parallel(s, 'POST', '/work-orders', order_payload(s, [part(p['id'], 1)]))
    assert sorted(r.status_code for r in results) == [201, 409], [r.text for r in results]
    assert s.get(f"{API}/products/{p['id']}").json()['stock'] == 0


def test_invoice_issuance_racing_deletion_cannot_leave_orphan(workshop):
    s = workshop['session']; wo = checked(s.post(f"{API}/work-orders", json=order_payload(s, status='concluido')), 201)
    with ThreadPoolExecutor(max_workers=2) as pool:
        issue = pool.submit(requests.post, f"{API}/invoices", headers=dict(s.headers), json={"work_order_id": wo['id'], "document_type": "fatura"}, timeout=45)
        delete = pool.submit(requests.delete, f"{API}/work-orders/{wo['id']}", headers=dict(s.headers), timeout=45)
        issued, deleted = issue.result(), delete.result()
    assert (issued.status_code, deleted.status_code) in {(201, 409), (404, 200)}, (issued.text, deleted.text)


def test_metadata_edit_does_not_reset_stock(workshop):
    s = workshop['session']; p = product(s, 5)
    checked(s.put(f"{API}/products/{p['id']}", json={"reference": p['reference'], "name": "Renamed"}))
    assert s.get(f"{API}/products/{p['id']}").json()['stock'] == 5


@pytest.fixture(scope="module")
def portal_account(workshop):
    import uuid
    s = workshop['session']
    owner = checked(s.post(f"{API}/clients", json={"name": "Appointment owner"}), 201)
    vehicle = checked(s.post(f"{API}/vehicles", json={"client_id": owner['id'], "license_plate": "AP-00-PT", "make": "Test", "model": "Car"}), 201)
    creds = checked(s.post(f"{API}/clients/{owner['id']}/account", json={"name": "Portal", "email": f"appointments-{uuid.uuid4().hex}@test.pt"}), 201)['credentials']
    client = requests.Session()
    auth = checked(client.post(f"{API}/auth/client/login", json={"email": creds['email'], "password": creds['temporary_password']}))
    client.headers['Authorization'] = f"Bearer {auth['access_token']}"
    auth = checked(client.post(f"{API}/auth/change-password", json={"current_password": creds['temporary_password'], "new_password": PASSWORD}))
    client.headers['Authorization'] = f"Bearer {auth['access_token']}"
    return client, vehicle


def test_appointment_suggestion_acceptance_rescheduling_and_cancellation(workshop, portal_account):
    from zoneinfo import ZoneInfo
    staff = workshop['session']; client, vehicle = portal_account
    future = datetime.now(ZoneInfo('Europe/Lisbon')) + timedelta(days=3)
    payload = {"vehicle_id": vehicle['id'], "scheduled_local": future.strftime('%Y-%m-%dT%H:%M'), "description": "Revisão anual", "contact": "912345678"}
    appointment = checked(client.post(f"{API}/portal/appointments", json=payload), 201)
    aid = appointment['id']
    suggested = (future + timedelta(days=1)).strftime('%Y-%m-%dT%H:%M')
    checked(staff.post(f"{API}/appointments/{aid}/action", json={"action": "suggest", "scheduled_local": suggested}))
    checked(client.post(f"{API}/portal/appointments/{aid}/action", json={"action": "accept_suggestion"}))
    checked(client.put(f"{API}/portal/appointments/{aid}", json=payload))
    checked(staff.post(f"{API}/appointments/{aid}/action", json={"action": "confirm"}))
    checked(client.post(f"{API}/portal/appointments/{aid}/action", json={"action": "cancel"}))
    assert staff.post(f"{API}/appointments/{aid}/action", json={"action": "confirm"}).status_code == 409
    row = next(a for a in checked(client.get(f"{API}/portal/appointments")) if a['id'] == aid)
    assert row['status'] == 'cancelada'
    assert [e['action'] for e in row['events']] == ['created', 'suggest', 'accept_suggestion', 'rescheduled', 'confirm', 'cancel']


def test_appointment_rejects_foreign_vehicle_and_invalid_times(workshop, portal_account):
    staff = workshop['session']; client, vehicle = portal_account
    other = next(v for v in staff.get(f"{API}/vehicles").json() if v['client_id'] != vehicle['client_id'])
    payload = {"vehicle_id": other['id'], "scheduled_local": "2030-01-15T10:00", "description": "Revisão", "contact": "912345678"}
    assert client.post(f"{API}/portal/appointments", json=payload).status_code == 404
    payload['vehicle_id'] = vehicle['id']
    for local in ['2000-01-01T10:00', 'invalid', '2027-03-28T01:30', '2027-10-31T01:30']:
        payload['scheduled_local'] = local
        assert client.post(f"{API}/portal/appointments", json=payload).status_code == 422


def test_half_cent_rounding_is_consistent_in_orders_invoices_and_purchases(workshop):
    s = workshop['session']
    items = [
        {"item_type": "mao_de_obra", "description": "Mão de obra", "quantity": 2, "unit_price": 45},
        {"item_type": "peca", "description": "Óleo", "quantity": 1, "unit_price": 42.5},
    ]
    wo = checked(s.post(f"{API}/work-orders", json=order_payload(s, items, status='concluido')), 201)
    assert (wo['subtotal'], wo['vat'], wo['total']) == (132.5, 30.48, 162.98)
    invoice = checked(s.post(f"{API}/invoices", json={"work_order_id": wo['id'], "document_type": "fatura"}), 201)
    assert invoice['grand_total'] == 162.98
    assert invoice['total_labor'] + invoice['total_parts'] == invoice['subtotal']
    p = product(s)
    po = checked(s.post(f"{API}/purchase-orders", json={"supplier": "Rounding", "items": [{"product_id": p['id'], "quantity": 5, "unit_price": 25.5}]}), 201)
    assert (po['subtotal'], po['vat'], po['total']) == (127.5, 29.33, 156.83)

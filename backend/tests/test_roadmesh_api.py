"""RoadMesh backend API tests - multi-tenant workshop SaaS."""
import os
import uuid
import pytest
import requests


def _base_url() -> str:
    env_url = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "").strip()
    if env_url:
        return env_url.rstrip("/")
    env_file = "/app/frontend/.env"
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as fh:
            for line in fh:
                if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    return ""


BASE_URL = _base_url()
API = f"{BASE_URL}/api"


def _rand_email():
    return f"TEST_{uuid.uuid4().hex[:10]}@oficina.pt"


@pytest.fixture(scope="session")
def session_a():
    """Register a fresh workshop A and return (session, user, token)."""
    s = requests.Session()
    email = _rand_email()
    r = s.post(f"{API}/auth/register", json={
        "workshop_name": "TEST_Oficina_A",
        "name": "Admin A",
        "email": email,
        "password": "teste123",
    })
    assert r.status_code == 201, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    return {"session": s, "user": data["user"], "token": data["access_token"], "email": email}


@pytest.fixture(scope="session")
def session_b():
    s = requests.Session()
    email = _rand_email()
    r = s.post(f"{API}/auth/register", json={
        "workshop_name": "TEST_Oficina_B",
        "name": "Admin B",
        "email": email,
        "password": "teste123",
    })
    assert r.status_code == 201, r.text
    data = r.json()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}"})
    return {"session": s, "user": data["user"], "token": data["access_token"], "email": email}


# --- Health ---
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# --- Auth ---
class TestAuth:
    def test_register_and_seed(self, session_a):
        s = session_a["session"]
        user = session_a["user"]
        assert user["role"] == "admin"
        assert user["workshop_name"] == "TEST_Oficina_A"
        assert "id" in user and "workshop_id" in user

        # seeded data expectations
        clients = s.get(f"{API}/clients").json()
        assert len(clients) == 5, f"expected 5 seed clients, got {len(clients)}"
        vehicles = s.get(f"{API}/vehicles").json()
        assert len(vehicles) == 5
        products = s.get(f"{API}/products").json()
        assert len(products) == 5
        wos = s.get(f"{API}/work-orders").json()
        assert len(wos) == 4
        invs = s.get(f"{API}/invoices").json()
        assert len(invs) == 1

    def test_register_duplicate(self, session_a):
        r = requests.post(f"{API}/auth/register", json={
            "workshop_name": "Dup",
            "name": "Dup",
            "email": session_a["email"],
            "password": "teste123",
        })
        assert r.status_code == 409

    def test_login_success(self, session_a):
        r = requests.post(f"{API}/auth/login", json={
            "email": session_a["email"], "password": "teste123"
        })
        assert r.status_code == 200
        j = r.json()
        assert "access_token" in j and j["token_type"] == "bearer"
        assert j["user"]["email"] == session_a["email"].lower()

    def test_login_invalid(self, session_a):
        r = requests.post(f"{API}/auth/login", json={
            "email": session_a["email"], "password": "wrong"
        })
        assert r.status_code == 401

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, session_a):
        r = session_a["session"].get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == session_a["email"].lower()


# --- Multi-tenant isolation ---
class TestTenantIsolation:
    def test_a_cannot_see_b_data(self, session_a, session_b):
        a_clients = session_a["session"].get(f"{API}/clients").json()
        b_clients = session_b["session"].get(f"{API}/clients").json()
        a_ids = {c["id"] for c in a_clients}
        b_ids = {c["id"] for c in b_clients}
        assert a_ids.isdisjoint(b_ids), "tenant leak in clients"

        # try to access B's client via A
        b_first = b_clients[0]["id"]
        r = session_a["session"].get(f"{API}/clients/{b_first}")
        assert r.status_code == 404

    def test_a_cannot_update_b_vehicle(self, session_a, session_b):
        b_v = session_b["session"].get(f"{API}/vehicles").json()[0]
        r = session_a["session"].put(f"{API}/vehicles/{b_v['id']}", json={
            "client_id": b_v["client_id"], "license_plate": "HACK-01",
            "make": b_v["make"], "model": b_v["model"],
        })
        assert r.status_code == 404


# --- Dashboard ---
class TestDashboard:
    def test_dashboard(self, session_a):
        r = session_a["session"].get(f"{API}/dashboard")
        assert r.status_code == 200
        j = r.json()
        assert "kpis" in j and "recent_work_orders" in j
        kpis = j["kpis"]
        for k in ["ordens", "em_reparacao", "aguarda_cliente", "faturacao"]:
            assert k in kpis
        assert kpis["ordens"] >= 4
        # enrichment check
        rec = j["recent_work_orders"]
        assert len(rec) > 0
        assert "client_name" in rec[0]
        assert "vehicle_label" in rec[0]
        assert "license_plate" in rec[0]


# --- Clients CRUD ---
class TestClientsCRUD:
    def test_create_get_update_delete(self, session_a):
        s = session_a["session"]
        r = s.post(f"{API}/clients", json={
            "name": "TEST_Cliente CRUD", "nif": "111222333",
            "phone": "999888777", "email": "crud@test.pt"
        })
        assert r.status_code == 201, r.text
        cid = r.json()["id"]
        assert r.json()["name"] == "TEST_Cliente CRUD"

        # GET
        g = s.get(f"{API}/clients/{cid}")
        assert g.status_code == 200
        assert "vehicles" in g.json() and "work_orders" in g.json()

        # search
        srch = s.get(f"{API}/clients", params={"search": "TEST_Cliente"}).json()
        assert any(c["id"] == cid for c in srch)

        # PUT
        u = s.put(f"{API}/clients/{cid}", json={
            "name": "TEST_Cliente Atualizado", "nif": "111222333",
            "phone": "999888777", "email": "crud@test.pt"
        })
        assert u.status_code == 200
        g2 = s.get(f"{API}/clients/{cid}").json()
        assert g2["name"] == "TEST_Cliente Atualizado"

        # DELETE
        d = s.delete(f"{API}/clients/{cid}")
        assert d.status_code == 200
        g3 = s.get(f"{API}/clients/{cid}")
        assert g3.status_code == 404


# --- Vehicles CRUD ---
class TestVehiclesCRUD:
    def test_full_flow(self, session_a):
        s = session_a["session"]
        clients = s.get(f"{API}/clients").json()
        cid = clients[0]["id"]
        r = s.post(f"{API}/vehicles", json={
            "client_id": cid, "license_plate": "TEST-01",
            "make": "Toyota", "model": "Corolla", "year": 2020
        })
        assert r.status_code == 201, r.text
        vid = r.json()["id"]

        lst = s.get(f"{API}/vehicles", params={"client_id": cid}).json()
        assert any(v["id"] == vid for v in lst)

        g = s.get(f"{API}/vehicles/{vid}").json()
        assert "photos" in g and "damages" in g

        u = s.put(f"{API}/vehicles/{vid}", json={
            "client_id": cid, "license_plate": "TEST-01",
            "make": "Toyota", "model": "Yaris", "year": 2021
        })
        assert u.status_code == 200

        d = s.delete(f"{API}/vehicles/{vid}")
        assert d.status_code == 200


# --- Products CRUD ---
class TestProductsCRUD:
    def test_full_flow(self, session_a):
        s = session_a["session"]
        r = s.post(f"{API}/products", json={
            "reference": "TEST-REF", "name": "TEST_Prod",
            "category": "Óleos", "stock": 10, "min_stock": 2,
            "purchase_price": 5.0, "sale_price": 10.0
        })
        assert r.status_code == 201
        pid = r.json()["id"]

        srch = s.get(f"{API}/products", params={"search": "TEST_Prod"}).json()
        assert any(p["id"] == pid for p in srch)

        cat = s.get(f"{API}/products", params={"category": "Óleos"}).json()
        assert any(p["id"] == pid for p in cat)

        g = s.get(f"{API}/products/{pid}").json()
        assert "movements" in g

        u = s.put(f"{API}/products/{pid}", json={
            "reference": "TEST-REF", "name": "TEST_Prod2",
            "category": "Óleos", "stock": 20, "min_stock": 2,
            "purchase_price": 5.0, "sale_price": 12.0
        })
        assert u.status_code == 200
        assert s.get(f"{API}/products/{pid}").json()["name"] == "TEST_Prod2"

        assert s.delete(f"{API}/products/{pid}").status_code == 200


# --- Work Orders ---
class TestWorkOrders:
    def test_create_with_stock_discount(self, session_a):
        s = session_a["session"]
        clients = s.get(f"{API}/clients").json()
        vehicles = s.get(f"{API}/vehicles").json()
        products = s.get(f"{API}/products").json()
        prod = products[0]
        initial_stock = prod["stock"]

        r = s.post(f"{API}/work-orders", json={
            "client_id": clients[0]["id"],
            "vehicle_id": vehicles[0]["id"],
            "mechanic": "TEST Mec",
            "complaint": "TEST",
            "status": "entrada",
            "items": [
                {"item_type": "mao_de_obra", "description": "MO", "quantity": 2, "unit_price": 30, "vat_rate": 23},
                {"item_type": "peca", "description": "Peça", "quantity": 2, "unit_price": 10,
                 "vat_rate": 23, "product_id": prod["id"]},
            ],
        })
        assert r.status_code == 201, r.text
        wo = r.json()
        # totals: subtotal = 60 + 20 = 80, vat = 18.40, total = 98.40
        assert wo["subtotal"] == 80.0
        assert round(wo["vat"], 2) == 18.4
        assert round(wo["total"], 2) == 98.4
        assert wo.get("client_name") and wo.get("license_plate")

        # stock reduced
        prod_after = s.get(f"{API}/products/{prod['id']}").json()
        assert prod_after["stock"] == initial_stock - 2
        # stock movement logged
        assert any(m.get("work_order_id") == wo["id"] for m in prod_after["movements"])

        # complete via PUT sets completed_at
        u = s.put(f"{API}/work-orders/{wo['id']}", json={
            "client_id": clients[0]["id"], "vehicle_id": vehicles[0]["id"],
            "mechanic": "TEST Mec", "status": "concluido",
            "items": wo["items"],
        })
        assert u.status_code == 200
        wo_after = s.get(f"{API}/work-orders/{wo['id']}").json()
        assert wo_after["completed_at"] is not None

        # search + status_filter
        lst = s.get(f"{API}/work-orders", params={"status_filter": "concluido"}).json()
        assert any(w["id"] == wo["id"] for w in lst)

        # cleanup
        s.delete(f"{API}/work-orders/{wo['id']}")


# --- Purchase Orders ---
class TestPurchaseOrders:
    def test_create_and_receive(self, session_a):
        s = session_a["session"]
        products = s.get(f"{API}/products").json()
        prod = products[1]
        initial = prod["stock"]

        r = s.post(f"{API}/purchase-orders", json={
            "supplier": "TEST Sup",
            "items": [{"product_id": prod["id"], "quantity": 5, "unit_price": 10.0}],
            "notes": "test"
        })
        assert r.status_code == 201, r.text
        po = r.json()
        assert po["status"] == "pendente"
        assert po["subtotal"] == 50.0

        rec = s.post(f"{API}/purchase-orders/{po['id']}/receive")
        assert rec.status_code == 200

        prod_after = s.get(f"{API}/products/{prod['id']}").json()
        assert prod_after["stock"] == initial + 5


# --- Quotes ---
class TestQuotes:
    def test_quote_lifecycle(self, session_a):
        s = session_a["session"]
        clients = s.get(f"{API}/clients").json()
        vehicles = s.get(f"{API}/vehicles").json()
        client = clients[0]
        vehicle = next(v for v in vehicles if v["client_id"] == client["id"])

        r = s.post(f"{API}/quotes", json={
            "client_id": client["id"], "vehicle_id": vehicle["id"],
            "items": [{"item_type": "mao_de_obra", "description": "Orç", "quantity": 1, "unit_price": 100, "vat_rate": 23}],
            "notes": "T"
        })
        assert r.status_code == 201, r.text
        q = r.json()
        assert q["status"] == "rascunho"
        assert q["number"].startswith("ORC")

        # cannot convert before accepted
        c1 = s.post(f"{API}/quotes/{q['id']}/convert")
        assert c1.status_code == 400

        # invalid status
        bad = s.post(f"{API}/quotes/{q['id']}/status", json={"status": "invalido"})
        assert bad.status_code == 400

        st = s.post(f"{API}/quotes/{q['id']}/status", json={"status": "aceite"})
        assert st.status_code == 200

        conv = s.post(f"{API}/quotes/{q['id']}/convert")
        assert conv.status_code == 200
        wo = conv.json()
        assert wo["status"] == "entrada"
        assert wo.get("client_name")

        s.delete(f"{API}/work-orders/{wo['id']}")


# --- Photos ---
class TestPhotos:
    def test_photo_flow(self, session_a, session_b):
        s = session_a["session"]
        vehicles = s.get(f"{API}/vehicles").json()
        vid = vehicles[0]["id"]

        img = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\x18\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        upload = s.post(f"{API}/media", files={"file": ("tiny.png", img, "image/png")})
        assert upload.status_code == 201, upload.text
        media_id = upload.json()["id"]

        r = s.post(f"{API}/photos", json={
            "vehicle_id": vid, "zone": "exterior_360",
            "media_id": media_id, "caption": "T"
        })
        assert r.status_code == 201, r.text
        pid = r.json()["id"]

        lst = s.get(f"{API}/photos", params={"vehicle_id": vid}).json()
        assert any(p["id"] == pid for p in lst)

        # cross-tenant: workshop B cannot post photo on A's vehicle
        cross = session_b["session"].post(f"{API}/photos", json={
            "vehicle_id": vid, "zone": "interior", "media_id": media_id
        })
        assert cross.status_code == 404
        # and cross list returns empty
        cross_lst = session_b["session"].get(f"{API}/photos", params={"vehicle_id": vid}).json()
        assert cross_lst == []

        d = s.delete(f"{API}/photos/{pid}")
        assert d.status_code == 200


# --- Invoices ---
class TestInvoices:
    def test_invoice_from_wo(self, session_a):
        s = session_a["session"]
        wos = s.get(f"{API}/work-orders").json()
        wo = wos[0]

        r = s.post(f"{API}/invoices", json={
            "work_order_id": wo["id"], "document_type": "fatura"
        })
        assert r.status_code == 201, r.text
        inv = r.json()
        assert inv["document_number"].startswith("FT")
        assert inv["grand_total"] == wo["total"]
        assert "total_labor" in inv and "total_parts" in inv

        r2 = s.post(f"{API}/invoices", json={
            "work_order_id": wo["id"], "document_type": "fatura_recibo"
        })
        assert r2.status_code == 201
        assert r2.json()["document_number"].startswith("FR")

        r3 = s.post(f"{API}/invoices", json={
            "work_order_id": wo["id"], "document_type": "orcamento"
        })
        assert r3.json()["document_number"].startswith("ORC")

    def test_invoice_bad_wo(self, session_a):
        r = session_a["session"].post(f"{API}/invoices", json={
            "work_order_id": "nonexistent", "document_type": "fatura"
        })
        assert r.status_code == 404

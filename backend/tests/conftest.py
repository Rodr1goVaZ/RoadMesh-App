"""Explicitly opted-in API tests: accounts are provisioned through platform admin."""

import os
import uuid

import pytest
import requests

API = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") + "/api"
PASSWORD = "RoadMesh-test-password-2026"


def checked(response, status=200):
    assert response.status_code == status, response.text
    return response.json()


@pytest.fixture(scope="session")
def platform_session():
    if os.environ.get("ROADMESH_TEST_ALLOW_WRITE") != "1":
        pytest.skip("Set ROADMESH_TEST_ALLOW_WRITE=1 for an isolated test API; these tests create data.")
    email, password = os.environ.get("TEST_ADMIN_EMAIL"), os.environ.get("TEST_ADMIN_PASSWORD")
    if not email or not password or not os.environ.get("EXPO_PUBLIC_BACKEND_URL"):
        pytest.fail("EXPO_PUBLIC_BACKEND_URL, TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required")
    session = requests.Session()
    data = checked(session.post(f"{API}/auth/admin/login", json={"email": email, "password": password}, timeout=30))
    assert not data["user"]["password_change_required"], (
        "Change the test administrator password before running the suite"
    )
    session.headers["Authorization"] = f"Bearer {data['access_token']}"
    return session


@pytest.fixture(scope="session")
def workshop_factory(platform_session):
    def create(name="TEST_Oficina"):
        email = f"test_{uuid.uuid4().hex}@oficina.pt"
        provision = checked(
            platform_session.post(
                f"{API}/admin/workshops",
                json={"name": name, "manager_name": "Test Manager", "manager_email": email},
                timeout=30,
            ),
            201,
        )
        session = requests.Session()
        data = checked(
            session.post(
                f"{API}/auth/staff/login",
                json={"email": email, "password": provision["credentials"]["temporary_password"]},
                timeout=30,
            )
        )
        session.headers["Authorization"] = f"Bearer {data['access_token']}"
        data = checked(
            session.post(
                f"{API}/auth/change-password",
                json={"current_password": provision["credentials"]["temporary_password"], "new_password": PASSWORD},
                timeout=30,
            )
        )
        session.headers["Authorization"] = f"Bearer {data['access_token']}"
        clients, vehicles = [], []
        for i, plate in enumerate(("AA-12-BB", "22-CD-44", "55-CD-99", "11-GG-22", "77-JK-11")):
            client = checked(
                session.post(
                    f"{API}/clients",
                    json={"name": f"Test Client {i}", "phone": "912345678", "email": f"client{i}@test.pt"},
                    timeout=30,
                ),
                201,
            )
            vehicle = checked(
                session.post(
                    f"{API}/vehicles",
                    json={"client_id": client["id"], "license_plate": plate, "make": "Test", "model": "Car"},
                    timeout=30,
                ),
                201,
            )
            clients.append(client)
            vehicles.append(vehicle)
            checked(
                session.post(
                    f"{API}/products",
                    json={
                        "reference": f"TEST-{i}",
                        "name": f"Test Product {i}",
                        "stock": 100,
                        "sale_price": 10,
                        "category": "Filtros",
                    },
                    timeout=30,
                ),
                201,
            )
        for i, status in enumerate(("entrada", "diagnostico", "concluido", "aguardando_pecas")):
            order = checked(
                session.post(
                    f"{API}/work-orders",
                    json={
                        "client_id": clients[i]["id"],
                        "vehicle_id": vehicles[i]["id"],
                        "status": status,
                        "items": [
                            {"item_type": "mao_de_obra", "description": "Test service", "quantity": 1, "unit_price": 10}
                        ],
                    },
                    timeout=30,
                ),
                201,
            )
            if status == "concluido":
                checked(
                    session.post(
                        f"{API}/invoices", json={"work_order_id": order["id"], "document_type": "fatura"}, timeout=30
                    ),
                    201,
                )
        return {
            "session": session,
            "user": data["user"],
            "token": data["access_token"],
            "email": email,
            "password": PASSWORD,
        }

    return create


@pytest.fixture(scope="module")
def session_a(workshop_factory):
    return workshop_factory("TEST_Oficina_A")


@pytest.fixture(scope="module")
def session_b(workshop_factory):
    return workshop_factory("TEST_Oficina_B")


@pytest.fixture(scope="module")
def admin_session(session_a):
    # Historical name: these feature tests exercise workshop staff, not platform admin.
    return session_a["session"]


@pytest.fixture(scope="module")
def tenant_b_session(session_b):
    return session_b["session"]

"""Regression tests for search normalization, managed media, damages, quotes, and invoice PDFs."""

import io
import os
import uuid
import re

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


def _email() -> str:
    return f"TEST_{uuid.uuid4().hex[:10]}@oficina.pt"


def _tiny_png() -> bytes:
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\x18\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def _pdf_text_and_pages(content: bytes):
    try:
        from pypdf import PdfReader
    except Exception:
        pytest.skip("pypdf not installed in environment")
    reader = PdfReader(io.BytesIO(content))
    text = "\n".join((page.extract_text() or "") for page in reader.pages)
    return text, len(reader.pages)


@pytest.fixture(scope="session")
def admin_session():
    assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL is required"
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": "rodrigo@oficina.pt", "password": "teste123"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="session")
def tenant_b_session():
    s = requests.Session()
    r = s.post(
        f"{API}/auth/register",
        json={
            "workshop_name": "TEST_Isolation_B",
            "name": "Isolation B",
            "email": _email(),
            "password": "teste123",
        },
    )
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# Search normalization
def test_vehicle_search_normalization(admin_session):
    r1 = admin_session.get(f"{API}/vehicles", params={"search": "aa12bb"})
    r2 = admin_session.get(f"{API}/vehicles", params={"search": "AA-12-BB"})
    r3 = admin_session.get(f"{API}/vehicles", params={"search": "AA 12 BB"})
    assert r1.status_code == r2.status_code == r3.status_code == 200
    ids_1 = {v["id"] for v in r1.json()}
    ids_2 = {v["id"] for v in r2.json()}
    ids_3 = {v["id"] for v in r3.json()}
    assert ids_1 == ids_2 == ids_3
    assert any(v["license_plate"] == "AA-12-BB" for v in r1.json())


def test_vehicle_search_partial_and_punctuation_only(admin_session):
    partial = admin_session.get(f"{API}/vehicles", params={"search": "AA12"})
    punct = admin_session.get(f"{API}/vehicles", params={"search": "---"})
    assert partial.status_code == 200
    assert punct.status_code == 200
    assert any(v["license_plate"] == "AA-12-BB" for v in partial.json())
    assert punct.json() == []


# Managed media storage
def test_media_upload_and_binary_download(admin_session):
    upload = admin_session.post(f"{API}/media", files={"file": ("tiny.png", _tiny_png(), "image/png")})
    assert upload.status_code == 201, upload.text
    media_id = upload.json()["id"]
    assert upload.json()["size"] > 0

    download = admin_session.get(f"{API}/media/{media_id}")
    assert download.status_code == 200
    assert download.headers["content-type"].startswith("image/jpeg")
    assert download.content.startswith(b"\xff\xd8\xff")


def test_media_tenant_isolation_and_invalid_file(admin_session, tenant_b_session):
    upload = admin_session.post(f"{API}/media", files={"file": ("tiny.png", _tiny_png(), "image/png")})
    assert upload.status_code == 201
    media_id = upload.json()["id"]

    cross = tenant_b_session.get(f"{API}/media/{media_id}")
    assert cross.status_code == 404

    invalid = admin_session.post(f"{API}/media", files={"file": ("not-image.txt", b"hello-world", "text/plain")})
    assert invalid.status_code == 422


def test_media_oversize_rejected(admin_session):
    payload = io.BytesIO(b"0" * (10 * 1024 * 1024 + 2))
    oversize = admin_session.post(f"{API}/media", files={"file": ("big.jpg", payload, "image/jpeg")})
    assert oversize.status_code == 413


# Damages
def test_damage_create_persists_and_rejects_invalid(admin_session, tenant_b_session):
    vehicles = admin_session.get(f"{API}/vehicles").json()
    vehicle = vehicles[0]

    media = admin_session.post(f"{API}/media", files={"file": ("tiny.png", _tiny_png(), "image/png")})
    assert media.status_code == 201
    media_id = media.json()["id"]

    create = admin_session.post(
        f"{API}/damages",
        json={
            "vehicle_id": vehicle["id"],
            "category": "risco",
            "severity": "medio",
            "description": "TEST_dano",
            "location": "porta",
            "media_id": media_id,
        },
    )
    assert create.status_code == 201, create.text
    data = create.json()
    assert data["media_id"] == media_id
    assert "image_b64" not in data

    listing = admin_session.get(f"{API}/damages", params={"vehicle_id": vehicle["id"]})
    assert listing.status_code == 200
    assert any(d["id"] == data["id"] for d in listing.json())

    bad_cat = admin_session.post(
        f"{API}/damages",
        json={
            "vehicle_id": vehicle["id"],
            "category": "nao_existe",
            "severity": "medio",
            "media_id": media_id,
        },
    )
    assert bad_cat.status_code == 422

    bad_sev = admin_session.post(
        f"{API}/damages",
        json={
            "vehicle_id": vehicle["id"],
            "category": "risco",
            "severity": "alta",
            "media_id": media_id,
        },
    )
    assert bad_sev.status_code == 422

    foreign_media = tenant_b_session.post(f"{API}/media", files={"file": ("tiny.png", _tiny_png(), "image/png")})
    assert foreign_media.status_code == 201
    foreign_media_id = foreign_media.json()["id"]

    cross_media = admin_session.post(
        f"{API}/damages",
        json={
            "vehicle_id": vehicle["id"],
            "category": "risco",
            "severity": "baixo",
            "media_id": foreign_media_id,
        },
    )
    assert cross_media.status_code == 404

    foreign_vehicle = tenant_b_session.get(f"{API}/vehicles").json()[0]
    own_media = admin_session.post(f"{API}/media", files={"file": ("tiny.png", _tiny_png(), "image/png")}).json()["id"]
    cross_vehicle = admin_session.post(
        f"{API}/damages",
        json={
            "vehicle_id": foreign_vehicle["id"],
            "category": "risco",
            "severity": "baixo",
            "media_id": own_media,
        },
    )
    assert cross_vehicle.status_code == 404


# Quotes
def test_quote_create_starts_draft_and_requires_explicit_send(admin_session):
    clients = admin_session.get(f"{API}/clients").json()
    vehicles = admin_session.get(f"{API}/vehicles").json()
    client = clients[0]
    vehicle = next(v for v in vehicles if v["client_id"] == client["id"])

    create = admin_session.post(
        f"{API}/quotes",
        json={
            "client_id": client["id"],
            "vehicle_id": vehicle["id"],
            "items": [
                {"item_type": "peca", "description": "TEST_item", "quantity": 1, "unit_price": 10, "vat_rate": 23}
            ],
        },
    )
    assert create.status_code == 201, create.text
    quote = create.json()
    assert quote["status"] == "rascunho"

    list_quotes = admin_session.get(f"{API}/quotes")
    assert list_quotes.status_code == 200
    listed = next(q for q in list_quotes.json() if q["id"] == quote["id"])
    assert listed["status"] == "rascunho"

    sent = admin_session.post(f"{API}/quotes/{quote['id']}/status", json={"status": "enviado"})
    assert sent.status_code == 200
    after = admin_session.get(f"{API}/quotes").json()
    assert next(q for q in after if q["id"] == quote["id"])["status"] == "enviado"


# PDF export
def test_invoice_pdf_binary_headers_auth_and_tenant(admin_session, tenant_b_session):
    wo = admin_session.get(f"{API}/work-orders").json()[0]
    create = admin_session.post(f"{API}/invoices", json={"work_order_id": wo["id"], "document_type": "fatura"})
    assert create.status_code == 201, create.text
    invoice = create.json()

    pdf = admin_session.get(f"{API}/invoices/{invoice['id']}/pdf")
    assert pdf.status_code == 200
    assert pdf.content.startswith(b"%PDF")
    assert pdf.headers["content-type"].startswith("application/pdf")
    assert "attachment;" in pdf.headers.get("content-disposition", "").lower()

    unauth = requests.get(f"{API}/invoices/{invoice['id']}/pdf")
    assert unauth.status_code == 401

    cross = tenant_b_session.get(f"{API}/invoices/{invoice['id']}/pdf")
    assert cross.status_code == 404


def test_invoice_pdf_snapshot_stability_after_source_changes(admin_session):
    client = admin_session.post(
        f"{API}/clients",
        json={"name": "TEST_Snapshot Client", "nif": "111111111", "email": "snapshot@test.pt", "phone": "912000000", "address": "Rua Snapshot"},
    ).json()
    vehicle = admin_session.post(
        f"{API}/vehicles",
        json={"client_id": client["id"], "license_plate": "TS-99-TS", "make": "Seat", "model": "Ibiza", "year": 2021},
    ).json()
    wo = admin_session.post(
        f"{API}/work-orders",
        json={
            "client_id": client["id"],
            "vehicle_id": vehicle["id"],
            "status": "entrada",
            "items": [{"item_type": "mao_de_obra", "description": "TEST mão de obra", "quantity": 1, "unit_price": 75, "vat_rate": 23}],
        },
    ).json()
    inv = admin_session.post(f"{API}/invoices", json={"work_order_id": wo["id"], "document_type": "fatura"}).json()

    # change source client after invoice creation
    upd = admin_session.put(
        f"{API}/clients/{client['id']}",
        json={"name": "TEST_Changed Client", "nif": "111111111", "email": "snapshot@test.pt", "phone": "912000000", "address": "Rua Snapshot"},
    )
    assert upd.status_code == 200

    pdf = admin_session.get(f"{API}/invoices/{inv['id']}/pdf")
    assert pdf.status_code == 200
    assert b"%PDF" in pdf.content[:8]

    text, _ = _pdf_text_and_pages(pdf.content)
    assert "DOCUMENTO INTERNO" in text.upper()
    assert "TEST_SNAPSHOT CLIENT" in text.upper()
    assert "TS-99-TS" in text
    assert re.search(r"\b\d{2}/\d{2}/\d{4}\b", text)


def test_invoice_pdf_multi_page_long_items(admin_session):
    client = admin_session.post(
        f"{API}/clients",
        json={"name": "TEST_PDF_LONG", "nif": "222222222", "email": "pdf@test.pt", "phone": "913000000", "address": "Rua PDF"},
    ).json()
    vehicle = admin_session.post(
        f"{API}/vehicles",
        json={"client_id": client["id"], "license_plate": "PD-44-DF", "make": "Skoda", "model": "Octavia", "year": 2022},
    ).json()
    items = [
        {"item_type": "peca" if i % 2 == 0 else "mao_de_obra", "description": f"TEST linha muito longa {i} abcdefghijklmnopqrstuvwxyz", "quantity": 1, "unit_price": 5 + i, "vat_rate": 23}
        for i in range(70)
    ]
    wo = admin_session.post(
        f"{API}/work-orders",
        json={"client_id": client["id"], "vehicle_id": vehicle["id"], "status": "entrada", "items": items},
    ).json()
    inv = admin_session.post(f"{API}/invoices", json={"work_order_id": wo["id"], "document_type": "fatura"}).json()
    pdf = admin_session.get(f"{API}/invoices/{inv['id']}/pdf")
    assert pdf.status_code == 200
    text, pages = _pdf_text_and_pages(pdf.content)
    assert pages >= 2
    assert "PD-44-DF" in text
    assert "IVA" in text.upper()

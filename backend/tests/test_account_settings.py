"""Self-service account changes and logout stay private across all roles."""
import base64
import os
from io import BytesIO
from uuid import uuid4

import pytest
import requests
from PIL import Image

from conftest import API, PASSWORD, checked


@pytest.fixture(scope="module")
def accounts(workshop_factory):
    workshop = workshop_factory("TEST_Account_Settings")
    staff = workshop["session"]
    client = checked(staff.get(API + "/clients"))[0]
    credentials = checked(staff.post(API + f"/clients/{client['id']}/account", json={
        "name": "Personal profile", "email": f"profile-{uuid4().hex}@test.pt",
    }), 201)["credentials"]
    customer = requests.Session()
    first = checked(customer.post(API + "/auth/login", json={"email": credentials["email"], "password": credentials["temporary_password"]}))
    customer.headers["Authorization"] = "Bearer " + first["access_token"]
    # A temporary account cannot skip its password change through the settings endpoints.
    assert customer.put(API + "/auth/me", json={"name": "Bypass"}).status_code == 428
    changed = checked(customer.post(API + "/auth/change-password", json={"current_password": credentials["temporary_password"], "new_password": PASSWORD}))
    customer.headers["Authorization"] = "Bearer " + changed["access_token"]
    admin = requests.Session()
    auth = checked(admin.post(API + "/auth/login", json={"email": os.environ["TEST_ADMIN_EMAIL"], "password": os.environ["TEST_ADMIN_PASSWORD"]}))
    admin.headers["Authorization"] = "Bearer " + auth["access_token"]
    return {"staff": staff, "client": customer, "admin": admin}


@pytest.mark.parametrize("role", ["staff", "client", "admin"])
def test_profile_and_portrait_persist_for_each_role(accounts, role):
    session = accounts[role]
    previous = checked(session.get(API + "/auth/me"))
    other_role = "client" if role == "staff" else "staff"
    other = checked(accounts[other_role].get(API + "/auth/me"))
    try:
        updated = checked(session.put(API + "/auth/me", json={"name": "  Nome pessoal  "}))
        assert updated["name"] == "Nome pessoal"
        assert updated["role"] == previous["role"]
        portrait = BytesIO()
        Image.new("RGBA", (400, 300), (200, 50, 80, 128)).save(portrait, format="PNG")
        saved = checked(session.post(API + "/auth/me/avatar", files={"file": ("portrait.png", portrait.getvalue(), "image/png")}))
        assert saved["avatar_url"].startswith("data:image/jpeg;base64,")
        with Image.open(BytesIO(base64.b64decode(saved["avatar_url"].split(",", 1)[1]))) as image:
            assert image.size == (256, 256)
            assert not image.getexif()
        me = session.get(API + "/auth/me")
        assert "no-store" in me.headers["Cache-Control"]
        assert checked(me)["avatar_url"] == saved["avatar_url"]
        assert checked(accounts[other_role].get(API + "/auth/me")) == other
        assert checked(session.delete(API + "/auth/me/avatar"))["avatar_url"] is None
    finally:
        checked(session.put(API + "/auth/me", json={"name": previous["name"]}))


def test_profile_rejects_impersonation_and_invalid_images(accounts):
    session = accounts["staff"]
    original = checked(session.get(API + "/auth/me"))
    for body in ({"name": "   "}, {"name": "x" * 121}, {"name": "Other", "role": "admin"}, {"name": "Other", "id": "another-user"}, {"name": "Other", "avatar_url": "https://untrusted.invalid/image"}):
        assert session.put(API + "/auth/me", json=body).status_code == 422
    assert session.post(API + "/auth/me/avatar", files={"file": ("fake.png", b"<svg>not a photo</svg>", "image/png")}).status_code == 422
    assert session.post(API + "/auth/me/avatar", files={"file": ("huge.jpg", b"x" * (5 * 1024 * 1024 + 1), "image/jpeg")}).status_code == 413
    assert checked(session.get(API + "/auth/me")) == original
    assert requests.put(API + "/auth/me", json={"name": "Anonymous"}).status_code == 401


@pytest.mark.parametrize("role", ["staff", "client", "admin"])
def test_logout_revokes_both_original_and_refreshed_access(accounts, role):
    session = accounts[role]
    original = session.headers["Authorization"]
    renewed = "Bearer " + checked(session.post(API + "/auth/refresh"))["access_token"]
    checked(session.post(API + "/auth/logout"))
    for token in (original, renewed):
        headers = {"Authorization": token}
        response = requests.get(API + "/auth/me", headers=headers)
        assert response.status_code == 401
        assert "no-store" in response.headers["Cache-Control"]
        assert requests.post(API + "/auth/refresh", headers=headers).status_code == 401
        assert requests.put(API + "/auth/me", headers=headers, json={"name": "Still logged in"}).status_code == 401
